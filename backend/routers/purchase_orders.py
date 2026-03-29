from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from db.database import get_db
from models.models import PurchaseOrder, PurchaseOrderItem, POStatus
from schemas.schemas import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderOut
from core.security import get_current_user, require_manager_or_above
from core.business_logic import (
    generate_reference_no,
    validate_and_build_items,
    calculate_po_totals,
    deduct_stock,
    restore_stock,
)

router = APIRouter()


@router.get("/", response_model=List[PurchaseOrderOut])
def list_purchase_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    status: Optional[POStatus] = None,
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List all purchase orders with optional filters."""
    query = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
    )
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if vendor_id:
        query = query.filter(PurchaseOrder.vendor_id == vendor_id)

    return query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/stats")
def get_po_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get aggregate stats for the dashboard."""
    from sqlalchemy import func
    from decimal import Decimal

    total_pos = db.query(PurchaseOrder).count()
    draft = db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.DRAFT).count()
    pending = db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.PENDING).count()
    approved = db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.APPROVED).count()
    rejected = db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.REJECTED).count()

    total_value = db.query(func.sum(PurchaseOrder.total_amount)).scalar() or Decimal("0")

    return {
        "total_pos": total_pos,
        "by_status": {
            "draft": draft,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
        },
        "total_value": float(total_value),
    }


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    po = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.vendor),
            joinedload(PurchaseOrder.items).joinedload(PurchaseOrderItem.product),
        )
        .filter(PurchaseOrder.id == po_id)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po


@router.post("/", response_model=PurchaseOrderOut, status_code=201)
def create_purchase_order(
    po_in: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new Purchase Order.
    Business logic:
    1. Validate vendor exists
    2. Validate each product exists + has stock
    3. Snapshot unit prices at time of PO
    4. Calculate subtotal, 5% tax, total
    5. Generate unique reference number
    """
    from models.models import Vendor

    vendor = db.query(Vendor).filter(
        Vendor.id == po_in.vendor_id, Vendor.is_active == True
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found or inactive")

    # Step 1: Validate items and build enriched list
    try:
        enriched_items = validate_and_build_items(db, po_in.items)
    except HTTPException:
        raise

    # Step 2: Calculate totals with 5% tax
    totals = calculate_po_totals(enriched_items)

    # Step 3: Generate reference
    ref_no = generate_reference_no(db)

    # Step 4: Create PO record
    po = PurchaseOrder(
        reference_no=ref_no,
        vendor_id=po_in.vendor_id,
        status=POStatus.DRAFT,
        notes=po_in.notes,
        expected_delivery=po_in.expected_delivery,
        created_by=po_in.created_by or current_user["full_name"],
        **totals,
    )

    try:
        db.add(po)
        db.flush()  # get po.id without full commit

        # Step 5: Create line items
        for item_data in enriched_items:
            po_item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                line_total=item_data["line_total"],
            )
            db.add(po_item)

        db.commit()
        db.refresh(po)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create PO: {str(e)}")

    return get_purchase_order(po.id, db, current_user)


@router.put("/{po_id}/status")
def update_po_status(
    po_id: int,
    status_update: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    """
    Update PO status with business rules:
    - DRAFT -> PENDING (submit for approval)
    - PENDING -> APPROVED (approve; deducts stock)
    - PENDING -> REJECTED
    - APPROVED -> RECEIVED
    - Any -> CANCELLED (restores stock if was APPROVED)
    """
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id).first()

    if not po:
        raise HTTPException(status_code=404, detail="PO not found")

    new_status = status_update.status

    # Validate transitions
    valid_transitions = {
        POStatus.DRAFT: [POStatus.PENDING, POStatus.CANCELLED],
        POStatus.PENDING: [POStatus.APPROVED, POStatus.REJECTED, POStatus.CANCELLED],
        POStatus.APPROVED: [POStatus.RECEIVED, POStatus.CANCELLED],
        POStatus.REJECTED: [POStatus.DRAFT],
        POStatus.RECEIVED: [],
        POStatus.CANCELLED: [],
    }

    if new_status not in valid_transitions.get(po.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {po.status} to {new_status}"
        )

    old_status = po.status
    po.status = new_status

    if status_update.notes:
        po.notes = status_update.notes

    try:
        # Handle stock changes on approval/cancellation
        if new_status == POStatus.APPROVED:
            deduct_stock(db, po.items)
        elif new_status == POStatus.CANCELLED and old_status == POStatus.APPROVED:
            restore_stock(db, po.items)

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": f"PO {po.reference_no} status updated to {new_status}", "status": new_status}


@router.delete("/{po_id}")
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_manager_or_above),
):
    """Delete a PO (only allowed if DRAFT status)."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    if po.status != POStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only DRAFT POs can be deleted")
    db.delete(po)
    db.commit()
    return {"message": f"PO {po.reference_no} deleted"}
