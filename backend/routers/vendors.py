from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from db.database import get_db
from models.models import Vendor
from schemas.schemas import VendorCreate, VendorUpdate, VendorOut
from core.security import get_current_user, require_manager_or_above

router = APIRouter()


@router.get("/", response_model=List[VendorOut])
def list_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    search: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List all vendors with optional search and pagination."""
    query = db.query(Vendor)
    if active_only:
        query = query.filter(Vendor.is_active == True)
    if search:
        query = query.filter(Vendor.name.ilike(f"%{search}%"))
    return query.order_by(Vendor.name).offset(skip).limit(limit).all()


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/", response_model=VendorOut, status_code=201)
def create_vendor(
    vendor_in: VendorCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_manager_or_above),
):
    """Create a new vendor. Requires manager or admin role."""
    existing = db.query(Vendor).filter(Vendor.email == vendor_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor with this email already exists")

    vendor = Vendor(**vendor_in.dict())
    try:
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: int,
    vendor_in: VendorUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_manager_or_above),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    update_data = vendor_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)

    try:
        db.commit()
        db.refresh(vendor)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    return vendor


@router.delete("/{vendor_id}")
def deactivate_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(require_manager_or_above),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.is_active = False
    db.commit()
    return {"message": f"Vendor '{vendor.name}' deactivated successfully"}
