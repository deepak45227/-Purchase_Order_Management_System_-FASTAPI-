from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from sqlalchemy.orm import Session
from models.models import Product, PurchaseOrder, PurchaseOrderItem
from fastapi import HTTPException


TAX_RATE = Decimal("5.00")   # 5% tax


def generate_reference_no(db: Session) -> str:
    """Generate a unique PO reference number: PO-YYYYMMDD-XXXX"""
    today = datetime.now().strftime("%Y%m%d")
    count = db.query(PurchaseOrder).count() + 1
    return f"PO-{today}-{count:04d}"


def calculate_line_total(unit_price: Decimal, quantity: int) -> Decimal:
    """Calculate line total for a single PO item."""
    return (unit_price * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_po_totals(items_data: list) -> dict:
    """
    Core business logic: Calculate PO subtotal, 5% tax, and total.

    Args:
        items_data: list of dicts with keys: unit_price, quantity, line_total

    Returns:
        dict with subtotal, tax_rate, tax_amount, total_amount
    """
    subtotal = sum(item["line_total"] for item in items_data)
    subtotal = Decimal(str(subtotal)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    tax_amount = (subtotal * TAX_RATE / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    total_amount = (subtotal + tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "subtotal": subtotal,
        "tax_rate": TAX_RATE,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
    }


def validate_and_build_items(db: Session, items_in: list) -> list:
    """
    Validate each item in the PO:
    - Product must exist and be active
    - Sufficient stock must be available
    Returns enriched items list with unit_price and line_total.
    """
    enriched = []
    for item in items_in:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.is_active == True
        ).first()

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product ID {item.product_id} not found or inactive"
            )

        if product.stock_level < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. "
                       f"Available: {product.stock_level}, Requested: {item.quantity}"
            )

        line_total = calculate_line_total(Decimal(str(product.unit_price)), item.quantity)
        enriched.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": Decimal(str(product.unit_price)),
            "line_total": line_total,
            "product": product,
        })
    return enriched


def deduct_stock(db: Session, items: list) -> None:
    """Deduct stock levels when a PO is approved."""
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock_level -= item.quantity
    db.flush()


def restore_stock(db: Session, items) -> None:
    """Restore stock levels when a PO is cancelled."""
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock_level += item.quantity
    db.flush()
