# DATABASE_DESIGN.md

# Phase 3: Database Design - SHRI SIDDHIVINAYAK TRADING

## 1. Table Specifications

### 1.1 `users`
Represents customer and admin profiles. All users log in via mobile number.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `phone`: `VARCHAR(15)` (Unique, Not Null) - E.164 phone format.
  - `name`: `VARCHAR(100)` (Nullable) - Supplied during profile creation/update.
  - `avatar_url`: `VARCHAR(255)` (Nullable) - Profile image path.
  - `is_admin`: `BOOLEAN` (Default: `false`, Not Null) - Grants administrative rights.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `phone` format check: must consist of numerical digits (length between 10 and 15 digits).

### 1.2 `addresses`
Shipping addresses saved by customers.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `user_id`: `UUID` (Foreign Key -> `users.id`, Cascade Delete, Not Null)
  - `recipient_name`: `VARCHAR(100)` (Not Null)
  - `recipient_phone`: `VARCHAR(15)` (Not Null)
  - `address_line1`: `TEXT` (Not Null)
  - `address_line2`: `TEXT` (Nullable)
  - `landmark`: `VARCHAR(100)` (Nullable)
  - `city`: `VARCHAR(50)` (Default: 'Panvel', Not Null)
  - `state`: `VARCHAR(50)` (Default: 'Maharashtra', Not Null)
  - `postal_code`: `VARCHAR(10)` (Not Null)
  - `is_default`: `BOOLEAN` (Default: `false`, Not Null)
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)

### 1.3 `categories`
Top-level catalogs grouping products (e.g. Groceries, Dairy, Beverages).
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `name`: `VARCHAR(100)` (Unique, Not Null)
  - `slug`: `VARCHAR(100)` (Unique, Not Null) - URL-friendly name.
  - `status`: `VARCHAR(20)` (Default: 'ACTIVE', Not Null) - `ACTIVE` or `INACTIVE`.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `status` check: `status IN ('ACTIVE', 'INACTIVE')`

### 1.4 `subcategories`
Second-level catalogs under a parent category (e.g. Rice under Groceries).
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `category_id`: `UUID` (Foreign Key -> `categories.id`, Cascade Delete, Not Null)
  - `name`: `VARCHAR(100)` (Not Null)
  - `slug`: `VARCHAR(100)` (Not Null)
  - `status`: `VARCHAR(20)` (Default: 'ACTIVE', Not Null) - `ACTIVE` or `INACTIVE`.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `status` check: `status IN ('ACTIVE', 'INACTIVE')`
  - Unique combination: `category_id` and `name` must be unique.

### 1.5 `brands`
Product manufacturing brands (e.g. Amul, Tata).
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `name`: `VARCHAR(100)` (Unique, Not Null)
  - `slug`: `VARCHAR(100)` (Unique, Not Null)
  - `logo_url`: `VARCHAR(255)` (Nullable)
  - `status`: `VARCHAR(20)` (Default: 'ACTIVE', Not Null) - `ACTIVE` or `INACTIVE`.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `status` check: `status IN ('ACTIVE', 'INACTIVE')`

### 1.6 `products`
The base catalog item definition.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `category_id`: `UUID` (Foreign Key -> `categories.id`, Set Null, Nullable)
  - `subcategory_id`: `UUID` (Foreign Key -> `subcategories.id`, Set Null, Nullable)
  - `brand_id`: `UUID` (Foreign Key -> `brands.id`, Set Null, Nullable)
  - `name`: `VARCHAR(150)` (Not Null)
  - `slug`: `VARCHAR(150)` (Unique, Not Null)
  - `description`: `TEXT` (Nullable)
  - `sku`: `VARCHAR(100)` (Unique, Nullable)
  - `barcode`: `VARCHAR(100)` (Unique, Nullable)
  - `image_url`: `VARCHAR(255)` (Nullable) - Path to single image.
  - `status`: `VARCHAR(20)` (Default: 'ACTIVE', Not Null) - `ACTIVE` or `INACTIVE`.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `status` check: `status IN ('ACTIVE', 'INACTIVE')`

### 1.7 `variants`
The purchase unit representing product options (e.g. Fortune Rice - 5 Kg, Fortune Rice - 10 Kg). Stock is tracked here.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `product_id`: `UUID` (Foreign Key -> `products.id`, Cascade Delete, Not Null)
  - `attribute_name`: `VARCHAR(50)` (Not Null) - e.g., 'Weight', 'Volume'.
  - `attribute_value`: `VARCHAR(50)` (Not Null) - e.g., '5 Kg', '1 L'.
  - `price`: `DECIMAL(10,2)` (Not Null) - Selling price.
  - `stock`: `INTEGER` (Default: 0, Not Null) - Current quantity.
  - `status`: `VARCHAR(20)` (Default: 'ACTIVE', Not Null) - `ACTIVE` or `INACTIVE`.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - Price check: `price >= 0.00`
  - Stock check: `stock >= 0` (Prevents negative inventory in DB)
  - `status` check: `status IN ('ACTIVE', 'INACTIVE')`

### 1.8 `inventory_transactions`
Logs all stock adjustments chronologically.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `variant_id`: `UUID` (Foreign Key -> `variants.id`, Cascade Delete, Not Null)
  - `quantity`: `INTEGER` (Not Null) - Positive for additions, negative for reductions.
  - `transaction_type`: `VARCHAR(50)` (Not Null) - `STOCK_ADDITION`, `STOCK_REDUCTION`, `MANUAL_ADJUSTMENT`, `ORDER_DEDUCTION`, `ORDER_RESTORE`.
  - `reason`: `TEXT` (Nullable)
  - `admin_user_id`: `UUID` (Foreign Key -> `users.id`, Nullable) - Admin executing manual adjustment.
  - `reference_order_id`: `UUID` (Nullable) - Associated order if deduction/restore.
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)

### 1.9 `orders`
Holds customer and manually-entered orders.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `order_number`: `VARCHAR(50)` (Unique, Not Null) - e.g., `SST-20260701-0001`
  - `user_id`: `UUID` (Foreign Key -> `users.id`, Set Null, Nullable) - Null for manual walk-in orders.
  - `status`: `VARCHAR(30)` (Default: 'PENDING', Not Null)
  - `payment_method`: `VARCHAR(30)` (Default: 'COD', Not Null) - `COD` or `QR_PAYMENT`.
  - `total_amount`: `DECIMAL(10,2)` (Not Null)
  - `delivery_charge`: `DECIMAL(10,2)` (Default: 0.00, Not Null) - MVP is free delivery.
  - `recipient_name`: `VARCHAR(100)` (Not Null)
  - `recipient_phone`: `VARCHAR(15)` (Not Null)
  - `delivery_address`: `TEXT` (Not Null)
  - `delivery_rider_name`: `VARCHAR(100)` (Nullable)
  - `delivery_rider_phone`: `VARCHAR(15)` (Nullable)
  - `delivery_token`: `TEXT` (Nullable) - Signed JWT token payload.
  - `delivery_token_expires_at`: `TIMESTAMP WITH TIME ZONE` (Nullable)
  - `delivered_at`: `TIMESTAMP WITH TIME ZONE` (Nullable)
  - `cancelled_at`: `TIMESTAMP WITH TIME ZONE` (Nullable)
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `status` check: `status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED')`
  - `payment_method` check: `payment_method IN ('COD', 'QR_PAYMENT')`
  - `total_amount` check: `total_amount >= 0.00`

### 1.10 `order_items`
Details of specific items bought per order.
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `order_id`: `UUID` (Foreign Key -> `orders.id`, Cascade Delete, Not Null)
  - `product_id`: `UUID` (Foreign Key -> `products.id`, Set Null, Nullable)
  - `variant_id`: `UUID` (Foreign Key -> `variants.id`, Set Null, Nullable)
  - `product_name`: `VARCHAR(150)` (Not Null) - Snapshotted name at purchase.
  - `variant_name`: `VARCHAR(100)` (Not Null) - Snapshotted variant name (e.g. "Weight: 5 Kg") at purchase.
  - `price`: `DECIMAL(10,2)` (Not Null) - Snapshotted unit price.
  - `quantity`: `INTEGER` (Not Null)
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)
- **Constraints:**
  - `price` check: `price >= 0.00`
  - `quantity` check: `quantity > 0`

### 1.11 `store_settings`
System variables and operational parameters stored as key-value pairs.
- **Columns:**
  - `key`: `VARCHAR(100)` (Primary Key)
  - `value`: `TEXT` (Not Null)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)

---

## 2. Relationships & Referential Integrity
- **One-to-Many (`users` -> `addresses`):** A customer can manage multiple shipping addresses.
- **One-to-Many (`categories` -> `subcategories`):** A category contains multiple subcategories.
- **One-to-Many (`categories`/`subcategories` -> `products`):** Products belong to a specific category and subcategory structure.
- **One-to-Many (`products` -> `variants`):** A product details list contains multiple attributes and weights.
- **One-to-Many (`variants` -> `inventory_transactions`):** Audit path for each stock modification.
- **One-to-Many (`users` -> `orders`):** Customers have an ordering history.
- **One-to-Many (`orders` -> `order_items`):** Detailed breakdown of ordered items.

---

## 3. Indexing Strategy
To guarantee fast query execution times under production loads, B-Tree indexes will be applied on search fields, statuses, foreign keys, and chronological bounds.

```sql
-- Indexes for Users and Addresses
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- Indexes for Catalogs
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_variants_product_id ON variants(product_id);

-- Search Optimization
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops); -- Fuzzy search capability
CREATE INDEX idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Order Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Inventory Audit Indexes
CREATE INDEX idx_inv_tx_variant_id ON inventory_transactions(variant_id);
CREATE INDEX idx_inv_tx_created_at ON inventory_transactions(created_at DESC);
```

---

## 4. Audit Logging Design
To meet the requirement of auditing all structural modifications (products, variants, inventory, orders, brands, categories, store settings), we design a unified `audit_logs` schema driven by database triggers.

### 4.1 Audit Logs Schema (`audit_logs`)
- **Columns:**
  - `id`: `UUID` (Primary Key, Default: `uuid_generate_v4()`)
  - `table_name`: `VARCHAR(100)` (Not Null) - Target table name.
  - `record_id`: `UUID` (Not Null) - Primary key of modified row.
  - `action`: `VARCHAR(20)` (Not Null) - `INSERT`, `UPDATE`, or `DELETE`.
  - `old_values`: `JSONB` (Nullable) - Snapshot of columns before update.
  - `new_values`: `JSONB` (Nullable) - Snapshot of columns after update.
  - `user_id`: `UUID` (Nullable) - JWT user ID who triggered action (passed via DB session variable if available).
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `NOW()`)

### 4.2 Database Trigger Implementation
Using PostgreSQL trigger functions to automatically log modifications to audit tables:

```sql
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL, current_setting('app.current_user_id', true)::UUID);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user_id', true)::UUID);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW), current_setting('app.current_user_id', true)::UUID);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

For each audited table (e.g., `products`, `variants`, `orders`, `store_settings`), we bind this trigger:
```sql
CREATE TRIGGER audit_products_trigger
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION process_audit_log();
```
*(Similarly bound to `variants`, `orders`, `brands`, `categories`, `store_settings`)*.
