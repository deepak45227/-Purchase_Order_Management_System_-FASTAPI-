from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from models.models import POStatus


# ─── VENDOR SCHEMAS ───────────────────────────────────────────────────────────

class VendorBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    contact_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = Field(default=0.0, ge=0.0, le=5.0)


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    rating: Optional[float] = Field(default=None, ge=0.0, le=5.0)
    is_active: Optional[bool] = None


class VendorOut(VendorBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── PRODUCT SCHEMAS ──────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    sku: str = Field(..., min_length=2, max_length=100)
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Decimal = Field(..., gt=0)
    stock_level: Optional[int] = Field(default=0, ge=0)
    unit: Optional[str] = "pcs"


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[Decimal] = Field(default=None, gt=0)
    stock_level: Optional[int] = Field(default=None, ge=0)
    unit: Optional[str] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── PO ITEM SCHEMAS ──────────────────────────────────────────────────────────

class POItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

    @validator("quantity")
    def quantity_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be > 0")
        return v


class POItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


# ─── PURCHASE ORDER SCHEMAS ───────────────────────────────────────────────────

class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    items: List[POItemCreate] = Field(..., min_items=1)
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None
    created_by: Optional[str] = None


class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None


class PurchaseOrderOut(BaseModel):
    id: int
    reference_no: str
    vendor_id: int
    status: POStatus
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    notes: Optional[str]
    expected_delivery: Optional[datetime]
    created_by: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    vendor: Optional[VendorOut] = None
    items: List[POItemOut] = []

    class Config:
        from_attributes = True


# ─── AUTH SCHEMAS ─────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── GENERIC RESPONSE ─────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    data: Optional[dict] = None
