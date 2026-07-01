# API_SPECIFICATION.md

# Phase 4: API Specification - SHRI SIDDHIVINAYAK TRADING

## 1. Error Handling Strategy
The application returns standard JSON payloads for all API responses.

### 1.1 Standard Error Format
All errors (400, 401, 403, 404, 422, 500) will follow this exact response structure:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "User friendly message explaining what went wrong.",
    "details": []
  }
}
```
If the error is due to input validation failures (status `422 Unprocessable Entity`), the `details` array will contain specific error contexts:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation errors occurred.",
    "details": [
      {
        "field": "phone",
        "message": "Phone number is required and must start with +91 or be a valid 10-digit number."
      }
    ]
  }
}
```

### 1.2 Rate Limiting
- **Public endpoints (OTP Request):** Max 5 requests per IP address / mobile number per 15 minutes. Returns `429 Too Many Requests` if exceeded.
- **General APIs:** Max 100 requests per 1 minute.

---

## 2. API Endpoint Definitions

### 2.1 Authentication & Profile APIs

#### `POST /api/auth/otp/request`
Initiates passwordless login by sending/mocking an OTP.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210"
  }
  ```
- **Validation Rules:**
  - `phone`: Required, must be a string matching pattern `/^\+91[0-9]{10}$/` or `/^[0-9]{10}$/`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully (mocked)."
  }
  ```

#### `POST /api/auth/otp/verify`
Validates the OTP and returns the user payload alongside a signed JWT.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "code": "123456"
  }
  ```
- **Validation Rules:**
  - `phone`: Required, valid format.
  - `code`: Required, string/number, exactly 6 characters.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
      "phone": "+919876543210",
      "name": "Sunita Wani",
      "avatar_url": null,
      "is_admin": false
    }
  }
  ```

#### `PUT /api/auth/profile` *(Authentication Required)*
Updates user profile settings.
- **Request Body:**
  ```json
  {
    "name": "Sunita Yogesh Wani"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
      "phone": "+919876543210",
      "name": "Sunita Yogesh Wani",
      "avatar_url": null,
      "is_admin": false
    }
  }
  ```

---

### 2.2 Customer Address Management APIs *(Authentication Required)*

#### `GET /api/addresses`
Retrieves all shipping addresses saved by the logged-in customer.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "addresses": [
      {
        "id": "da14c449-d3e9-4e09-959c-7034177d6124",
        "recipient_name": "Sunita Wani",
        "recipient_phone": "+919876543210",
        "address_line1": "Shop No. 4, Uran Naka",
        "address_line2": "Opp. Krishna Tower",
        "landmark": "Uran Naka Corner",
        "city": "Panvel",
        "state": "Maharashtra",
        "postal_code": "410206",
        "is_default": true
      }
    ]
  }
  ```

#### `POST /api/addresses`
Creates a new shipping address.
- **Request Body:**
  ```json
  {
    "recipient_name": "Sunita Wani",
    "recipient_phone": "+919876543210",
    "address_line1": "Shop No. 4, Uran Naka",
    "address_line2": "Opp. Krishna Tower",
    "landmark": "Uran Naka Corner",
    "city": "Panvel",
    "state": "Maharashtra",
    "postal_code": "410206",
    "is_default": true
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "address": {
      "id": "da14c449-d3e9-4e09-959c-7034177d6124",
      "recipient_name": "Sunita Wani",
      "recipient_phone": "+919876543210",
      "address_line1": "Shop No. 4, Uran Naka",
      "address_line2": "Opp. Krishna Tower",
      "landmark": "Uran Naka Corner",
      "city": "Panvel",
      "state": "Maharashtra",
      "postal_code": "410206",
      "is_default": true
    }
  }
  ```

---

### 2.3 Product Catalog APIs *(Public)*

#### `GET /api/products`
Retrieves products list with support for search, category filtering, brand filtering, pagination, and stock checks.
- **Query Parameters:**
  - `search`: Search text matches product names, SKUs, categories, subcategories, or brands.
  - `category`: Filter by category slug.
  - `subcategory`: Filter by subcategory slug.
  - `brand`: Filter by brand slug.
  - `limit`: Default: 20.
  - `offset`: Default: 0.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "products": [
      {
        "id": "673f4ee8-f6ee-4eb3-81b4-106ea9304910",
        "name": "Tata Sampann Premium Toor Dal",
        "slug": "tata-sampann-premium-toor-dal",
        "image_url": "/images/toor_dal.jpg",
        "category": { "name": "Groceries", "slug": "groceries" },
        "subcategory": { "name": "Pulses", "slug": "pulses" },
        "brand": { "name": "Tata", "slug": "tata" },
        "variants": [
          {
            "id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
            "attribute_name": "Weight",
            "attribute_value": "1 Kg",
            "price": 175.00,
            "stock": 25,
            "status": "ACTIVE"
          }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0
    }
  }
  ```

#### `GET /api/products/:slug`
Fetches detail specs of a single product including all its active variants.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "product": {
      "id": "673f4ee8-f6ee-4eb3-81b4-106ea9304910",
      "name": "Tata Sampann Premium Toor Dal",
      "slug": "tata-sampann-premium-toor-dal",
      "description": "Unpolished and rich in protein premium toor dal.",
      "image_url": "/images/toor_dal.jpg",
      "category": { "name": "Groceries", "slug": "groceries" },
      "subcategory": { "name": "Pulses", "slug": "pulses" },
      "brand": { "name": "Tata", "slug": "tata" },
      "variants": [
        {
          "id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
          "attribute_name": "Weight",
          "attribute_value": "1 Kg",
          "price": 175.00,
          "stock": 25,
          "status": "ACTIVE"
        }
      ]
    }
  }
  ```

---

### 2.4 Customer Order Placement & Tracking *(Authentication Required)*

#### `POST /api/orders`
Places a new order based on cart selections. Requires checking stock availability in database transaction.
- **Request Body:**
  ```json
  {
    "address_id": "da14c449-d3e9-4e09-959c-7034177d6124",
    "payment_method": "COD",
    "items": [
      {
        "variant_id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
        "quantity": 2
      }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "order": {
      "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
      "order_number": "SST-20260701-0001",
      "status": "PENDING",
      "total_amount": 350.00,
      "delivery_charge": 0.00,
      "payment_method": "COD",
      "recipient_name": "Sunita Wani",
      "recipient_phone": "+919876543210",
      "delivery_address": "Shop No. 4, Uran Naka, Panvel, Maharashtra - 410206"
    }
  }
  ```

#### `GET /api/orders`
Retrieves order history list of customer.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "orders": [
      {
        "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
        "order_number": "SST-20260701-0001",
        "status": "PENDING",
        "total_amount": 350.00,
        "created_at": "2026-07-01T08:20:00Z"
      }
    ]
  }
  ```

#### `GET /api/orders/:id`
Fetches a single order detailed with QR delivery token (only if order status is `OUT_FOR_DELIVERY`).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "order": {
      "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
      "order_number": "SST-20260701-0001",
      "status": "OUT_FOR_DELIVERY",
      "total_amount": 350.00,
      "delivery_rider_name": "Suresh Kumar",
      "delivery_rider_phone": "+919876540000",
      "delivery_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "delivery_token_expires_at": "2026-07-02T08:20:00Z",
      "items": [
        {
          "product_name": "Tata Sampann Premium Toor Dal",
          "variant_name": "Weight: 1 Kg",
          "price": 175.00,
          "quantity": 2
        }
      ]
    }
  }
  ```

#### `POST /api/orders/:id/cancel`
Cancels the order. Only permitted in `PENDING` or `CONFIRMED` states.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Order cancelled successfully.",
    "order_status": "CANCELLED"
  }
  ```

---

### 2.5 QR Verification API *(Public)*

#### `POST /api/delivery/verify`
Scans the encrypted token string, checks signatures and timelines, updates the order to `DELIVERED`.
- **Request Body:**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Delivery verified successfully. Order updated to DELIVERED.",
    "order_number": "SST-20260701-0001",
    "recipient_name": "Sunita Wani",
    "delivered_at": "2026-07-01T08:35:00Z"
  }
  ```

---

### 2.6 Admin Configuration & Operations APIs *(Admin Only)*

#### `POST /api/admin/orders/manual`
Creates walk-in or telephone orders. Stock is immediately deducted.
- **Request Body:**
  ```json
  {
    "recipient_name": "Walk-in Customer",
    "recipient_phone": "9999999999",
    "delivery_address": "Counter Sale / Store Pickup",
    "payment_method": "COD",
    "items": [
      {
        "variant_id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
        "quantity": 1
      }
    ]
  }
  ```

#### `PATCH /api/admin/orders/:id/status`
Updates order status state machine.
- **Request Body:**
  ```json
  {
    "status": "PROCESSING"
  }
  ```

#### `PATCH /api/admin/orders/:id/assign-delivery`
Assigns delivery runner name/phone, sets status to `OUT_FOR_DELIVERY`, and generates the verification token.
- **Request Body:**
  ```json
  {
    "delivery_rider_name": "Suresh Kumar",
    "delivery_rider_phone": "9876540000"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Delivery assigned. Status updated to OUT_FOR_DELIVERY.",
    "delivery_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### `POST /api/admin/inventory/adjust`
Executes manual stock addition or reduction.
- **Request Body:**
  ```json
  {
    "variant_id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
    "quantity": 50,
    "transaction_type": "STOCK_ADDITION",
    "reason": "Restocked from primary distributor"
  }
  ```

#### `GET /api/admin/dashboard/metrics`
Aggregates sales performance and inventory status.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "metrics": {
      "total_orders": 1280,
      "total_revenue": 452900.00,
      "total_customers": 420,
      "total_products": 250,
      "orders_today": 12,
      "revenue_today": 4820.00
    }
  }
  ```

#### `GET /api/admin/audit-logs`
Fetches chronological audit trials.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "logs": [
      {
        "id": "f5127814-c36b-4ca9-bc6f-e304b4070a31",
        "table_name": "variants",
        "record_id": "a9a3b98c-bc5d-45df-bbbf-f6118b62828b",
        "action": "UPDATE",
        "old_values": { "stock": 25 },
        "new_values": { "stock": 75 },
        "user_id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
        "created_at": "2026-07-01T08:25:00Z"
      }
    ]
  }
  ```
