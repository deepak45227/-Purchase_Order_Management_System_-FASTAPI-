-- ============================================================
-- PO Management System - PostgreSQL Schema & Seed Data
-- ============================================================


-- ─── ENUMS ───────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'postatus') THEN
        CREATE TYPE postatus AS ENUM (
            'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'CANCELLED'
        );
    END IF;
END
$$;

-- ─── VENDORS TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    contact_name VARCHAR(200),
    email       VARCHAR(200) UNIQUE NOT NULL,
    phone       VARCHAR(50),
    address     TEXT,
    rating      FLOAT DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

-- ─── PRODUCTS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    sku         VARCHAR(100) UNIQUE NOT NULL,
    category    VARCHAR(100),
    description TEXT,
    unit_price  NUMERIC(12, 2) NOT NULL CHECK (unit_price > 0),
    stock_level INTEGER DEFAULT 0 CHECK (stock_level >= 0),
    unit        VARCHAR(50) DEFAULT 'pcs',
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

-- ─── PURCHASE ORDERS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
    id               SERIAL PRIMARY KEY,
    reference_no     VARCHAR(50) UNIQUE NOT NULL,
    vendor_id        INTEGER NOT NULL REFERENCES vendors(id),
    status           postatus DEFAULT 'DRAFT' NOT NULL,
    subtotal         NUMERIC(14, 2) DEFAULT 0.00,
    tax_rate         NUMERIC(5, 2) DEFAULT 5.00,
    tax_amount       NUMERIC(14, 2) DEFAULT 0.00,
    total_amount     NUMERIC(14, 2) DEFAULT 0.00,
    notes            TEXT,
    expected_delivery TIMESTAMPTZ,
    created_by       VARCHAR(200),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);

-- ─── PURCHASE ORDER ITEMS TABLE ──────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id                  SERIAL PRIMARY KEY,
    purchase_order_id   INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          INTEGER NOT NULL REFERENCES products(id),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC(12, 2) NOT NULL,
    line_total          NUMERIC(14, 2) NOT NULL
);

-- Ensure old existing tables also behave like the latest schema
ALTER TABLE vendors ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE products ALTER COLUMN is_active SET DEFAULT TRUE;
UPDATE vendors SET is_active = TRUE WHERE is_active IS NULL;
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE vendors ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE products ALTER COLUMN is_active SET NOT NULL;

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_ref ON purchase_orders(reference_no);
CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);

-- ─── SEED DATA ───────────────────────────────────────────────

INSERT INTO vendors (name, contact_name, email, phone, address, rating, is_active) VALUES
    ('TechSupply Co.',     'Rahul Sharma',   'rahul@techsupply.in',   '+91-9810001001', '14, Industrial Area, Gurgaon, Haryana', 4.5, TRUE),
    ('GlobalParts Ltd.',   'Priya Mehta',    'priya@globalparts.in',  '+91-9810002002', '22, Phase II, Noida, UP',               4.2, TRUE),
    ('FastTrack Vendors',  'Amit Verma',     'amit@fasttrack.in',     '+91-9810003003', '5, Sector 18, Chandigarh',              3.8, TRUE),
    ('Prime Materials',    'Sunita Rao',     'sunita@primemats.in',   '+91-9810004004', '88, Andheri East, Mumbai',              4.7, TRUE),
    ('EcoGoods India',     'Vikram Singh',   'vikram@ecogoods.in',    '+91-9810005005', '33, Jayanagar, Bengaluru',             3.5, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO products (name, sku, category, description, unit_price, stock_level, unit, is_active) VALUES
    ('Laptop Dell Inspiron 15',  'SKU-LAP-001', 'Electronics',  'High-performance laptop for business',         65000.00, 50,  'pcs', TRUE),
    ('Mechanical Keyboard',      'SKU-KEY-002', 'Peripherals',  'Tactile mechanical keyboard with RGB',          3500.00, 120, 'pcs', TRUE),
    ('4K Monitor 27"',           'SKU-MON-003', 'Electronics',  '4K IPS display with 144Hz refresh rate',       28000.00, 35,  'pcs', TRUE),
    ('Office Chair Ergonomic',   'SKU-CHR-004', 'Furniture',    'Adjustable lumbar support ergonomic chair',    12000.00, 20,  'pcs', TRUE),
    ('Printer HP LaserJet',      'SKU-PRN-005', 'Electronics',  'Wireless monochrome laser printer',            18500.00, 15,  'pcs', TRUE),
    ('USB-C Hub 7-in-1',         'SKU-HUB-006', 'Peripherals',  'Multi-port USB-C hub with HDMI and ethernet',   1800.00, 200, 'pcs', TRUE),
    ('Standing Desk',            'SKU-DSK-007', 'Furniture',    'Height adjustable standing desk 160cm',        22000.00, 10,  'pcs', TRUE),
    ('Webcam Full HD',           'SKU-CAM-008', 'Peripherals',  '1080p webcam with built-in microphone',         2800.00, 80,  'pcs', TRUE),
    ('Network Switch 24-port',   'SKU-NET-009', 'Networking',   'Managed 24-port gigabit switch',               15000.00, 25,  'pcs', TRUE),
    ('Server Rack 42U',          'SKU-SRV-010', 'Infrastructure','Standard 42U data center rack cabinet',        35000.00, 5,   'pcs', TRUE)
ON CONFLICT DO NOTHING;
