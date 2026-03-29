from sqlalchemy import (
    Column, Integer, String, Float, Enum, ForeignKey,
    DateTime, Text, Boolean, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from db.database import Base


class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    contact_name = Column(String(200))
    email = Column(String(200), unique=True, nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    rating = Column(Float, default=0.0)  # 0.0 to 5.0
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(100), unique=True, nullable=False)
    category = Column(String(100))
    description = Column(Text)
    unit_price = Column(Numeric(12, 2), nullable=False)
    stock_level = Column(Integer, default=0)
    unit = Column(String(50), default="pcs")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    po_items = relationship("PurchaseOrderItem", back_populates="product")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference_no = Column(String(50), unique=True, nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    status = Column(Enum(POStatus), default=POStatus.DRAFT, nullable=False)

    subtotal = Column(Numeric(14, 2), default=0.00)
    tax_rate = Column(Numeric(5, 2), default=5.00)   # 5% tax
    tax_amount = Column(Numeric(14, 2), default=0.00)
    total_amount = Column(Numeric(14, 2), default=0.00)

    notes = Column(Text)
    expected_delivery = Column(DateTime(timezone=True))
    created_by = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    vendor = relationship("Vendor", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)  # snapshot at time of PO
    line_total = Column(Numeric(14, 2), nullable=False)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="po_items")
