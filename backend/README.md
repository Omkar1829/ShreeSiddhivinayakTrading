# 🌾 Shree Siddhivinayak Trading - Backend API Documentation

Welcome to the backend REST API documentation for the **Shri Siddhivinayak Trading** platform. This server drives the hyper-local e-commerce catalog, customer cart checkout, administrative inventory console, real-time sync systems, and last-mile delivery tracking workflows.

---

## 1. Project Overview

The Shree Siddhivinayak Trading backend is a production-ready, security-hardened Express.js REST API designed to power grocery operations, catalog management, and delivery logistics in the Panvel region.

### Core Business Objectives
- **Hyper-Local Commerce**: Providing lightning-fast catalog search, dynamic filtering, and multi-variant pricing structures for retail grocery shopping.
- **Logistics Integration**: Empowering delivery personnel with frictionless QR code scanning and OTP completion workflows to verify doorstep deliveries without requiring rider accounts.
- **Real-Time Synchronicity**: Keeping administrative operations terminals and client frontends instantly synchronized regarding new orders and status updates.

### Technology Stack
| Layer | Technology | Purpose |
| --- | --- | --- |
| **Runtime Environment** | Node.js (v18+) | High-performance, asynchronous server runtime |
| **Backend Framework** | Express.js (v4.19+) | Robust and modular routing framework |
| **Database & Query Engine**| PostgreSQL & Prisma client | Relational storage and type-safe database queries |
| **Authentication** | JSON Web Tokens (JWT) | Stateless access and session lifecycle control |
| **External SMS Gateways** | Twilio & 2Factor.in | Multi-channel SMS/WhatsApp OTP delivery |
| **Media Cloud Storage** | Cloudinary | Automated compression and hosting of product/avatar media |
| **Real-Time Notification** | Server-Sent Events (SSE) | Light-weight, unidirectional socketless event streams |

---

## 2. System Architecture

The application adopts a clean, decoupled **3-Tier Architecture** that enforces a strict separation of concerns among request routing, business logic execution, and database persistence.

### 2.1 Request flow
```mermaid
sequenceDiagram
    participant Client as Frontend PWA
    participant Auth as Auth & Role Middleware
    participant Val as Validation Middleware
    participant Route as Express Router
    participant DB as Prisma (PostgreSQL)
    participant SSE as EventHub SSE Client

    Client->>Auth: HTTP Request + Bearer Token
    Auth-->>Client: 401 Unauthorized (If signature fails)
    Auth->>Val: Pass req.user payload
    Val-->>Client: 422 Unprocessable (If body invalid)
    Val->>Route: Pass sanitized req.body
    Route->>DB: Execute Transaction / Query
    DB-->>Route: Return rows
    Route->>SSE: Broadcast updates (e.g. ORDER_PLACED)
    SSE-->>Client: Push notification stream
    Route-->>Client: 200 OK Response
```

### 2.2 Layer Responsibilities
- **Routing Layer (`backend/routes/`)**: Maps API path endpoints directly to inline controllers or handlers. It isolates the HTTP request definitions from the underlying logic.
- **Middleware Layer (`backend/middleware/`)**: Performs cross-cutting security operations:
  - `auth.js`: Verifies JWT credentials and exposes user claims (`req.user`).
  - `requireAdmin` / `requireDelivery`: Protects endpoints via role-based access.
  - `validate.js`: Sanitizes inputs and strips out of-schema request parameters using Yup schemas.
- **Database Layer (`backend/prisma/`)**: Connects to the PostgreSQL cluster, enforces constraints (such as non-negative inventory values), and aggregates relational data.
- **Utilities (`backend/utils/`)**: Provides isolated modules for token signatures, twilio dispatch, audit logs, and in-memory SSE connections.

---

## 3. Project Structure

```text
backend/
├── config/
│   ├── cloudinary.js         # Cloudinary configuration and buffer upload utility
│   └── prisma.js             # PrismaClient initialization with logging configs
├── middleware/
│   ├── auth.js               # JWT authentication token & role checks
│   └── validate.js           # Yup request validation wrapper middleware
├── prisma/
│   ├── schema.prisma         # PostgreSQL relational database models & schemas
│   ├── seed.js               # Seed script for base categories, brands, settings, & admin
│   ├── seedProducts.js       # Seed script for initial grocery products & variants
│   └── seedNewInventory.js   # Extended script for bulk database mock population
├── routes/
│   ├── addresses.js          # Customer delivery addresses CRUD routes
│   ├── admin.js              # Admin dashboard, team members, manual sales, and stock adjust
│   ├── auth.js               # OTP request/verify, registration, and user profiles
│   ├── brands.js             # Brand management API
│   ├── categories.js         # Categories and subcategories API
│   ├── delivery.js           # Delivery rider console, pickups, and QR/OTP completion
│   ├── orders.js             # Customer checkout, order listing, and cancellation
│   ├── products.js           # Product directory, variant additions, and CSV bulk uploads
│   └── store.js              # Public store settings and real-time SSE event hub
├── utils/
│   ├── auditLogger.js        # Relational audit logging helper
│   ├── eventHub.js           # SSE client listing and event broadcasting
│   ├── tokens.js             # JWT Access and Refresh token generators
│   ├── twilio.js             # Twilio SMS/WhatsApp integration
│   └── twoFactor.js          # 2Factor OTP SMS gateway API client
├── server.js                 # App entry point, middleware registration, & error handling
└── package.json              # Node.js dependencies and operational scripts
```

---

## 4. Installation & Setup

Follow these steps to establish a local development server.

### 4.1 Prerequisites
- **Node.js**: v18.0.0 or higher is required.
- **PostgreSQL**: An active PostgreSQL server instance.
- **Cloud Accounts** (Optional - Fallbacks Mocked in Code):
  - Cloudinary account for media uploads.
  - Twilio SID/Auth Token or 2Factor.in API Key for OTP SMS dispatches.

### 4.2 Installation
1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Initialize the environment configuration file:
   ```bash
   copy .env.example .env
   ```
   *(Configure database credentials and secret hashes in `.env`)*

### 4.3 Environment Variables
Configure the following keys in your `.env` file:

| Variable | Required | Description | Example |
| --- | --- | --- | --- |
| `PORT` | No | Port the Express server listens on (Default: `5000`) | `5000` |
| `NODE_ENV` | No | App execution mode (`development` or `production`) | `development` |
| `DATABASE_URL` | Yes | PostgreSQL database connection string (with credentials) | `postgresql://postgres:pwd@localhost:5432/sst_db?schema=public` |
| `JWT_SECRET` | Yes | Secret signature hash for short-lived JWT Access Tokens | `super_secret_access_signature_key_123` |
| `JWT_REFRESH_SECRET` | Yes | Secret signature hash for JWT Refresh Session Tokens | `super_secret_refresh_signature_key_456` |
| `CLOUDINARY_CLOUD_NAME`| No | Cloudinary dashboard cloud handle | `siddhivinayak-trading` |
| `CLOUDINARY_API_KEY` | No | Cloudinary credential API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET`| No | Cloudinary credential API Secret | `ab-cde_fgh-ijk-lmn` |
| `TWILIO_ACCOUNT_SID` | No | Twilio Account identifier | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | No | Twilio Authentication secret token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_FROM` | No | Twilio registered phone number or WhatsApp sender | `+14155238886` or `whatsapp:+14155238886` |
| `TWOFACTOR_API_KEY` | No | 2Factor.in premium SMS gateway API authorization key | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `TWOFACTOR_TEMPLATE_NAME`| No | Approved SMS template handle on 2Factor portal | `SST_OTP_SMS` |

> [!NOTE]
> If Cloudinary credentials are omitted, the server automatically bypasses image uploads and resolves to an Unsplash grocery placeholder URL.
> If SMS credentials (`TWILIO` or `2FACTOR`) are omitted, the server defaults to mock OTP dispatching (OTP code is fixed to `123456`).

---

## 5. Running the Application

### Development Mode
Runs the backend with auto-reload enabled (via `nodemon`):
```bash
npm run dev
```

### Production Mode
Launches the server in production mode:
```bash
npm start
```

### Database Sync & Seeding
Execute the following commands to initialize database structures and populate standard configuration models:
```bash
# Generate Prisma JavaScript Client
npm run prisma:generate

# Run schema migrations to push tables to PostgreSQL
npm run prisma:migrate

# Seed categories, brands, settings, and mock products
npx prisma db seed
```

---

## 6. Database Documentation

The platform uses a relational PostgreSQL database structure driven through the Prisma ORM.

### 6.1 Database ERD Summary
- **User**: Holds admin credentials, customer profiles, and delivery riders.
- **Address**: Stores customer delivery locations.
- **Category & Subcategory**: Catalog hierarchy (e.g., Groceries -> Pulses).
- **Brand**: Manufacturers of products.
- **Product**: Definitions of catalog items.
- **Variant**: Inventory units containing price, stock values, and attributes (e.g., Fortune Rice - 5 Kg).
- **Order & OrderItem**: Transaction summaries and itemized sales snapshots.
- **InventoryTransaction**: Log adjustments tracking every stock change.
- **AuditLog**: Trace tracking edits made by administrators.
- **StoreSetting**: Configurable business operational settings.

```mermaid
erDiagram
    users ||--o{ addresses : "has"
    users ||--o{ orders : "places"
    users ||--o{ inventory_transactions : "adjusts"
    users ||--o{ audit_logs : "triggers"
    categories ||--|{ subcategories : "contains"
    categories ||--o{ products : "groups"
    subcategories ||--o{ products : "sub-groups"
    brands ||--o{ products : "manufactures"
    products ||--|{ variants : "offers"
    variants ||--o{ inventory_transactions : "logs"
    variants ||--o{ order_items : "sold"
    orders ||--|{ order_items : "contains"
    orders ||--o{ inventory_transactions : "modifies"
```

### 6.2 Model Definitions

#### `User` (`users` table)
- `id` (UUID, Primary Key)
- `phone` (String, Unique) - E.164 formatting
- `name` (String, Nullable)
- `avatarUrl` (String, Nullable)
- `isAdmin` (Boolean, Default: false)
- `role` (String, Default: "CUSTOMER") - Values: `CUSTOMER`, `DELIVERY`, `ADMIN`

#### `Variant` (`variants` table)
- `id` (UUID, Primary Key)
- `productId` (UUID, Foreign Key -> `Product`)
- `attributeName` (String) - e.g., "Weight", "Volume"
- `attributeValue` (String) - e.g., "5 Kg", "1 L"
- `price` (Decimal, 10, 2)
- `stock` (Integer, Default: 0) - Database check constraint prevents negative stock.
- `status` (String, Default: "ACTIVE") - `ACTIVE` or `INACTIVE`

#### `InventoryTransaction` (`inventory_transactions` table)
Tracks historical audit logs of stock movements:
- `id` (UUID, Primary Key)
- `variantId` (UUID, Foreign Key -> `Variant`)
- `quantity` (Integer) - Positive for additions, negative for order checkout deductions.
- `transactionType` (String) - `STOCK_ADDITION`, `STOCK_REDUCTION`, `MANUAL_ADJUSTMENT`, `ORDER_DEDUCTION`, `ORDER_RESTORE`.
- `reason` (String, Nullable)
- `adminUserId` (UUID, Nullable, Foreign Key -> `User`)
- `referenceOrderId` (UUID, Nullable, Foreign Key -> `Order`)

---

## 7. Authentication & Authorization

The system implements passwordless login via **Mobile Phone Number & One-Time Password (OTP)**.

```mermaid
graph TD
    A[Request OTP] --> B{Admins / Bypass list?}
    B -->|Yes| C[Generate local mock OTP '123456']
    B -->|No| D{2Factor API Key set?}
    D -->|Yes| E[Dispatch auto-generated OTP via 2Factor]
    D -->|No| F{Twilio config set?}
    F -->|Yes| G[Send random OTP via SMS/WhatsApp]
    F -->|No| H[Mock local OTP '123456']
    C & E & G & H --> I[Save session to in-memory Cache]
    I --> J[Verify OTP]
    J --> K{OTP Valid?}
    K -->|No| L[Return 400 Bad Request]
    K -->|Yes| M{User exists in DB?}
    M -->|No| N[Return 200 OK + Temporary registrationToken]
    M -->|Yes| O[Generate access & refresh token + Return User Profile]
```

### Bypass & Verification Master Credentials (MVP Staging)
- **Bypass Numbers**: Phone `+919876543210` or `9876543210` (Pre-seeded admin account) automatically runs in bypass mode and expects the OTP `123456`.
- **Master Bypass OTP**: The code `123456` serves as a master verification code across *all* phone numbers during testing.

### Token Lifecycle
- **Access Tokens**: Short-lived (15 minutes). Sent in `Authorization: Bearer <token>` header. Contains `userId`, `phone`, `isAdmin`, and `role`.
- **Refresh Tokens**: Long-lived (7 days). Exchanged via `/api/auth/token/refresh` to obtain a fresh access token without re-verifying OTP.

---

## 8. API Documentation

### 8.1 Public APIs

#### GET /health
##### Description
Assesses server status and verifies connectivity to the PostgreSQL cluster.
##### Authentication
Not Required
##### Request
*No request parameters or body needed*
##### Success Response (200 OK)
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-07-06T16:32:00.000Z"
}
```
##### Error Response (500 Server Error)
```json
{
  "success": false,
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Database connection timed out."
}
```

#### POST /api/auth/otp/request
##### Description
Requests a 6-digit OTP code sent to the mobile phone number.
##### Authentication
Not Required
##### Request
###### Request Body
```json
{
  "phone": "9876543210"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "isNewUser": false,
  "message": "Verification code sent successfully."
}
```

#### POST /api/auth/otp/verify
##### Description
Verifies the OTP code. If the user is unregistered, returns a temporary registration token.
##### Authentication
Not Required
##### Request
###### Request Body
```json
{
  "phone": "9876543210",
  "code": "123456"
}
```
##### Success Response (200 OK - Returning User)
```json
{
  "success": true,
  "isNewUser": false,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
    "phone": "+919876543210",
    "name": "Admin Yatish",
    "avatarUrl": null,
    "isAdmin": true,
    "role": "ADMIN"
  }
}
```
##### Success Response (200 OK - New Unregistered User)
```json
{
  "success": true,
  "isNewUser": true,
  "registrationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/register
##### Description
Registers a new customer profile using the temporary `registrationToken` obtained after successful verification.
##### Authentication
Not Required
##### Request
###### Request Body
```json
{
  "registrationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "name": "Manas Wani"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "phone": "+919999999999",
    "name": "Manas Wani",
    "avatarUrl": null,
    "isAdmin": false,
    "role": "CUSTOMER"
  }
}
```

#### POST /api/auth/token/refresh
##### Description
Exchanges a valid long-lived Refresh Token for a new short-lived Access Token.
##### Authentication
Not Required
##### Request
###### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/categories
##### Description
Retrieves all active categories alongside their active subcategories.
##### Authentication
Not Required
##### Request
*No request parameters or body needed*
##### Success Response (200 OK)
```json
{
  "success": true,
  "categories": [
    {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Dairy",
      "slug": "dairy",
      "status": "ACTIVE",
      "subcategories": [
        {
          "id": "s1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "categoryId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "name": "Milk",
          "slug": "milk",
          "status": "ACTIVE"
        }
      ]
    }
  ]
}
```

#### GET /api/brands
##### Description
Retrieves all active brands.
##### Authentication
Not Required
##### Request
*No request parameters or body needed*
##### Success Response (200 OK)
```json
{
  "success": true,
  "brands": [
    {
      "id": "b1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Amul",
      "slug": "amul",
      "logoUrl": null,
      "status": "ACTIVE"
    }
  ]
}
```

#### GET /api/products
##### Description
Retrieves a paginated list of active products matching search inputs or category/brand filters.
##### Authentication
Not Required
##### Request
###### Query Parameters
| Parameter | Type | Required | Description | Default |
| --- | --- | --- | --- | --- |
| `search` | String | No | Full-text fuzzy matches product name, SKU, category, brand | None |
| `category` | String | No | Filter by category slug | None |
| `subcategory`| String | No | Filter by subcategory slug | None |
| `brand` | String | No | Filter by brand slug | None |
| `minPrice` | Number | No | Minimum variant price threshold | None |
| `maxPrice` | Number | No | Maximum variant price threshold | None |
| `inStock` | Boolean| No | If `true`, returns only items with stock > 0 | None |
| `limit` | Number | No | Pagination size limits (Max: 100) | `20` |
| `offset` | Number | No | Pagination offsets | `0` |
##### Success Response (200 OK)
```json
{
  "success": true,
  "products": [
    {
      "id": "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Amul Taaza Fresh Toned Milk",
      "slug": "amul-taaza-fresh-toned-milk",
      "imageUrl": "/images/fresh_milk.png",
      "category": { "name": "Dairy", "slug": "dairy" },
      "subcategory": { "name": "Milk", "slug": "milk" },
      "brand": { "name": "Amul", "slug": "amul" },
      "variants": [
        {
          "id": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
          "attributeName": "Volume",
          "attributeValue": "500 ml",
          "price": "28.00",
          "stock": 100,
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

#### GET /api/products/:slug
##### Description
Fetches detailed specifications of a single product using its slug.
##### Authentication
Not Required
##### Request
###### Path Parameters
- `slug` (String, Required) - Product slug identifier
##### Success Response (200 OK)
```json
{
  "success": true,
  "product": {
    "id": "p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "name": "Amul Taaza Fresh Toned Milk",
    "slug": "amul-taaza-fresh-toned-milk",
    "description": "Pasteurized toned milk.",
    "imageUrl": "/images/fresh_milk.png",
    "category": { "name": "Dairy", "slug": "dairy" },
    "subcategory": { "name": "Milk", "slug": "milk" },
    "brand": { "name": "Amul", "slug": "amul" },
    "variants": [
      {
        "id": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
        "attributeName": "Volume",
        "attributeValue": "500 ml",
        "price": "28.00",
        "stock": 100,
        "status": "ACTIVE"
      }
    ]
  }
}
```

#### GET /api/store/settings
##### Description
Retrieves public configuration settings of the physical retail store.
##### Authentication
Not Required
##### Success Response (200 OK)
```json
{
  "success": true,
  "settings": {
    "store_name": "SHRI SIDDHIVINAYAK TRADING",
    "logo_url": "",
    "banner_url": "",
    "phone_number": "+919876543210",
    "whatsapp_number": "+919876543210",
    "address": "Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206",
    "opening_time": "08:00",
    "closing_time": "21:00",
    "store_status": "OPEN"
  }
}
```

#### GET /api/store/events
##### Description
Server-Sent Events (SSE) stream path. Emits live notifications (e.g. `ORDER_PLACED`, `ORDER_UPDATED`) to keep active client dashboards updated in real time.
##### Authentication
Not Required
##### Request
###### Headers
| Header | Value | Description |
| --- | --- | --- |
| `Accept` | `text/event-stream` | Necessary stream parameters |
| `Connection` | `keep-alive` | Maintain persistent socket |
| `Cache-Control` | `no-cache` | Prevent caching middleware |
##### Success Response (SSE Connection Opened)
Returns continuous chunks using key:value event notation:
```text
event: ORDER_PLACED
data: {"orderId":"31b9d4f9-22a4-4fbb-a1a7-ec30fb288339","orderNumber":"SST-20260701-0001"}
```

#### POST /api/delivery/verify
##### Description
Public QR scanner endpoint. Accepts an encrypted delivery JWT payload, decodes it, and marks the corresponding order as `DELIVERED`.
##### Authentication
Not Required
##### Request
###### Request Body
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "codPaymentMode": "CASH"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Delivery verified successfully via QR scan.",
  "orderNumber": "SST-20260701-0001",
  "recipientName": "Sunita Wani",
  "deliveredAt": "2026-07-06T16:40:00.000Z"
}
```
##### Error Response (400 Bad Request - Expired)
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The delivery verification QR code has expired. Please ask the customer to refresh their screen."
  }
}
```

---

### 8.2 Customer Authenticated APIs

All APIs in this section require the header:
`Authorization: Bearer <Access_Token>`

#### GET /api/auth/me
##### Description
Retrieves the profile information of the logged-in user.
##### Success Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
    "phone": "+919876543210",
    "name": "Sunita Wani",
    "avatarUrl": null,
    "isAdmin": false,
    "role": "CUSTOMER"
  }
}
```

#### PUT /api/auth/profile
##### Description
Updates the user's profile information. Optionally accepts an avatar image upload using multipart form-data.
##### Request
###### Request Headers
- `Content-Type`: `multipart/form-data`
###### Request Body (Form-Data)
- `name` (String, Optional)
- `avatar` (File, Optional) - Image buffer
##### Success Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "e44d3209-2f22-493e-8c38-89cbb67ea107",
    "phone": "+919876543210",
    "name": "Sunita Wani Update",
    "avatarUrl": "https://res.cloudinary.com/.../avatar.jpg",
    "isAdmin": false,
    "role": "CUSTOMER"
  }
}
```

#### GET /api/addresses
##### Description
Lists all saved shipping addresses of the logged-in customer, sorted with default addresses first.
##### Success Response (200 OK)
```json
{
  "success": true,
  "addresses": [
    {
      "id": "da14c449-d3e9-4e09-959c-7034177d6124",
      "recipientName": "Sunita Wani",
      "recipientPhone": "+919876543210",
      "addressLine1": "Shop No. 4, Uran Naka",
      "addressLine2": "Opp. Krishna Tower",
      "landmark": "Uran Naka Corner",
      "city": "Panvel",
      "state": "Maharashtra",
      "postalCode": "410206",
      "isDefault": true
    }
  ]
}
```

#### POST /api/addresses
##### Description
Adds a new shipping address. Unsets other defaults if the new address is marked as default.
##### Request
###### Request Body
```json
{
  "recipientName": "Sunita Wani",
  "recipientPhone": "9876543210",
  "addressLine1": "Shop No. 4, Uran Naka",
  "addressLine2": "Opp. Krishna Tower",
  "landmark": "Uran Naka Corner",
  "city": "Panvel",
  "state": "Maharashtra",
  "postalCode": "410206",
  "isDefault": true
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "address": {
    "id": "da14c449-d3e9-4e09-959c-7034177d6124",
    "userId": "e44d3209-2f22-493e-8c38-89cbb67ea107",
    "recipientName": "Sunita Wani",
    "recipientPhone": "+919876543210",
    "addressLine1": "Shop No. 4, Uran Naka",
    "addressLine2": "Opp. Krishna Tower",
    "landmark": "Uran Naka Corner",
    "city": "Panvel",
    "state": "Maharashtra",
    "postalCode": "410206",
    "isDefault": true
  }
}
```

#### PUT /api/addresses/:id
##### Description
Updates an existing address.
##### Success Response (200 OK)
```json
{
  "success": true,
  "address": {
    "id": "da14c449-d3e9-4e09-959c-7034177d6124",
    "recipientName": "Sunita Wani",
    "recipientPhone": "+919876543210",
    "addressLine1": "Shop No. 4 Updated",
    "isDefault": true
  }
}
```

#### PATCH /api/addresses/:id/default
##### Description
Sets an address as the customer's default shipping location.
##### Success Response (200 OK)
```json
{
  "success": true,
  "address": {
    "id": "da14c449-d3e9-4e09-959c-7034177d6124",
    "isDefault": true
  }
}
```

#### DELETE /api/addresses/:id
##### Description
Deletes a saved address. If the default address is deleted, sets the most recently added address as the default.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Address deleted successfully."
}
```

#### GET /api/orders
##### Description
Retrieves the logged-in customer's order history.
##### Success Response (200 OK)
```json
{
  "success": true,
  "orders": [
    {
      "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
      "orderNumber": "SST-20260701-0001",
      "status": "PENDING",
      "paymentMethod": "COD",
      "totalAmount": "350.00",
      "createdAt": "2026-07-06T16:30:00.000Z"
    }
  ]
}
```

#### GET /api/orders/:id
##### Description
Retrieves detailed information of a single order. If the order is `OUT_FOR_DELIVERY`, includes the verification `deliveryToken` and `deliveryOtp`.
##### Success Response (200 OK)
```json
{
  "success": true,
  "order": {
    "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
    "orderNumber": "SST-20260701-0001",
    "status": "OUT_FOR_DELIVERY",
    "paymentMethod": "COD",
    "totalAmount": "350.00",
    "deliveryRiderName": "Suresh Kumar",
    "deliveryRiderPhone": "+919632587410",
    "deliveryToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "deliveryTokenExpiresAt": "2026-07-07T16:30:00.000Z",
    "deliveryOtp": "654321",
    "items": [
      {
        "id": "item1-uuid",
        "productName": "Amul Taaza Fresh Toned Milk",
        "variantName": "Volume: 500 ml",
        "price": "28.00",
        "quantity": 2
      }
    ]
  }
}
```

#### POST /api/orders
##### Description
Places a new order. Deducts variant stock levels immediately within an atomic database transaction.
##### Request
###### Request Body
```json
{
  "addressId": "da14c449-d3e9-4e09-959c-7034177d6124",
  "paymentMethod": "COD",
  "items": [
    {
      "variantId": "v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "quantity": 2
    }
  ]
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "order": {
    "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
    "orderNumber": "SST-20260701-0001",
    "status": "PENDING",
    "paymentMethod": "COD",
    "totalAmount": "56.00",
    "recipientName": "Sunita Wani",
    "recipientPhone": "+919876543210",
    "deliveryAddress": "Sunita Wani, +919876543210, Shop No. 4, Uran Naka, Opp. Krishna Tower, Panvel, Maharashtra - 410206"
  }
}
```

#### POST /api/orders/:id/cancel
##### Description
Cancels a customer's order. Allowed only when status is `PENDING` or `CONFIRMED`. Restores the deducted stock levels.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order cancelled successfully.",
  "status": "CANCELLED"
}
```

---

### 8.3 Delivery Rider APIs

APIs in this section require:
`Authorization: Bearer <Access_Token>` (Role must be `DELIVERY` or `ADMIN`)

#### GET /api/delivery/assigned
##### Description
Retrieves a list of active and historical orders assigned to the logged-in rider.
##### Success Response (200 OK)
```json
{
  "success": true,
  "orders": [
    {
      "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
      "orderNumber": "SST-20260701-0001",
      "status": "OUT_FOR_DELIVERY",
      "totalAmount": "350.00",
      "recipientName": "Sunita Wani",
      "recipientPhone": "+919876543210",
      "deliveryAddress": "Shop No. 4, Uran Naka, Panvel",
      "items": []
    }
  ]
}
```

#### PATCH /api/delivery/orders/:id/pickup
##### Description
Rider pickup action. Transitions order status from `PACKED` / `CONFIRMED` to `OUT_FOR_DELIVERY`.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order marked as picked up. Out for delivery!",
  "order": {
    "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
    "status": "OUT_FOR_DELIVERY"
  }
}
```

#### POST /api/delivery/orders/:id/verify-otp
##### Description
Completes delivery verification manually by inputting the customer's 6-digit OTP code. Marks order as `DELIVERED`.
##### Request
###### Request Body
```json
{
  "otp": "654321",
  "codPaymentMode": "CASH"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Delivery verified successfully via OTP entry.",
  "order": {
    "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
    "status": "DELIVERED",
    "deliveredAt": "2026-07-06T16:45:00.000Z"
  }
}
```

#### POST /api/delivery/scan-pickup
##### Description
Rider self-assignment endpoint. Enables a rider to self-assign and pick up a packed order by scanning the store's package slip QR.
##### Request
###### Request Body
```json
{
  "orderId": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Order successfully assigned and marked as picked up!",
  "order": {
    "id": "31b9d4f9-22a4-4fbb-a1a7-ec30fb288339",
    "status": "OUT_FOR_DELIVERY",
    "deliveryRiderId": "rider-uuid-here"
  }
}
```

---

### 8.4 Admin Protected APIs

APIs in this section require:
`Authorization: Bearer <Access_Token>` (Claims must show `isAdmin: true` and role must be `ADMIN`)

#### GET /api/categories/admin/all
##### Description
Lists all categories and subcategories (including those marked `INACTIVE`).
##### Success Response (200 OK)
```json
{
  "success": true,
  "categories": [...]
}
```

#### POST /api/categories
##### Description
Creates a new product category.
##### Request
###### Request Body
```json
{
  "name": "Groceries",
  "status": "ACTIVE"
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "category": {
    "id": "cat-uuid",
    "name": "Groceries",
    "slug": "groceries",
    "status": "ACTIVE"
  }
}
```

#### PUT /api/categories/:id
##### Description
Modifies category attributes.
##### Success Response (200 OK)
```json
{
  "success": true,
  "category": { "id": "cat-uuid", "name": "Groceries New Name", "status": "ACTIVE" }
}
```

#### DELETE /api/categories/:id
##### Description
Deletes a category and recursively removes all associated subcategories.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Category and all associated subcategories deleted successfully."
}
```

#### POST /api/categories/:categoryId/subcategories
##### Description
Creates a subcategory under a parent category.
##### Success Response (201 Created)
```json
{
  "success": true,
  "subcategory": { "id": "sub-uuid", "categoryId": "cat-uuid", "name": "Rice" }
}
```

#### PUT /api/categories/subcategories/:id
##### Description
Modifies subcategory attributes.
##### Success Response (200 OK)
```json
{
  "success": true,
  "subcategory": { "id": "sub-uuid", "name": "Basmati Rice" }
}
```

#### DELETE /api/categories/subcategories/:id
##### Description
Deletes a subcategory.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Subcategory deleted successfully."
}
```

#### GET /api/brands/admin/all
##### Description
Lists all brands including those marked `INACTIVE`.
##### Success Response (200 OK)
```json
{
  "success": true,
  "brands": [...]
}
```

#### POST /api/brands
##### Description
Creates a new manufacturing brand.
##### Success Response (201 Created)
```json
{
  "success": true,
  "brand": { "id": "brand-uuid", "name": "Amul", "slug": "amul", "status": "ACTIVE" }
}
```

#### PUT /api/brands/:id
##### Description
Modifies brand properties.
##### Success Response (200 OK)
```json
{
  "success": true,
  "brand": { "id": "brand-uuid", "name": "Amul Dairy Products" }
}
```

#### DELETE /api/brands/:id
##### Description
Deletes a brand.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Brand deleted successfully."
}
```

#### GET /api/products/admin/all
##### Description
Lists all products, sub-variants, and categories (including `INACTIVE` items).
##### Success Response (200 OK)
```json
{
  "success": true,
  "products": [...]
}
```

#### POST /api/products
##### Description
Creates a new base product. Optionally handles an image file upload and inline variants arrays.
##### Request
###### Request Headers
- `Content-Type`: `multipart/form-data`
###### Request Body (Form-Data)
- `name` (String, Required)
- `categoryId` (UUID, Optional)
- `subcategoryId` (UUID, Optional)
- `brandId` (UUID, Optional)
- `description` (String, Optional)
- `sku` (String, Optional)
- `barcode` (String, Optional)
- `status` (String, Default: "ACTIVE")
- `image` (File, Optional) - Product image file
- `variants` (Stringified JSON, Optional) - Array of variant objects:
  ```json
  [
    {"attributeName": "Weight", "attributeValue": "1 Kg", "price": 175.00, "stock": 50}
  ]
  ```
##### Success Response (201 Created)
```json
{
  "success": true,
  "product": {
    "id": "prod-uuid",
    "name": "Tata Sampann Premium Toor Dal",
    "variants": [...]
  }
}
```

#### PUT /api/products/:id
##### Description
Modifies product attributes.
##### Request
###### Request Headers
- `Content-Type`: `multipart/form-data`
##### Success Response (200 OK)
```json
{
  "success": true,
  "product": { "id": "prod-uuid", "name": "Updated Product Name" }
}
```

#### DELETE /api/products/:id
##### Description
Deletes a product and recursively deletes all its variants.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Product and all associated variants deleted successfully."
}
```

#### POST /api/products/:productId/variants
##### Description
Adds a variant to a product. Creates an initial inventory transaction record.
##### Request
###### Request Body
```json
{
  "attributeName": "Weight",
  "attributeValue": "5 Kg",
  "price": 850.00,
  "stock": 20,
  "status": "ACTIVE"
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "variant": {
    "id": "var-uuid",
    "productId": "prod-uuid",
    "price": "850.00",
    "stock": 20
  }
}
```

#### PUT /api/products/variants/:id
##### Description
Modifies a variant's attributes or price. Logs stock manual adjustments if the stock value changes.
##### Success Response (200 OK)
```json
{
  "success": true,
  "variant": { "id": "var-uuid", "stock": 25 }
}
```

#### DELETE /api/products/variants/:id
##### Description
Deletes a product variant.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Variant deleted successfully."
}
```

#### POST /api/products/admin/import-csv
##### Description
Bulk imports products and variants using a CSV file. Parses categories/brands and uploads external image URLs directly to Cloudinary.
##### Request
###### Request Headers
- `Content-Type`: `multipart/form-data`
###### Request Body (Form-Data)
- `file` (File, Required) - Target CSV file
##### CSV Header Fields
`Product Name`, `Description`, `Category`, `Brand`, `SKU`, `Price`, `Stock`, `Weight`, `Variant Name`, `Variant Value`, `ImageUrl`
##### Success Response (200 OK)
```json
{
  "success": true,
  "summary": {
    "totalRows": 25,
    "importedProducts": 10,
    "importedVariants": 15,
    "failedRowsCount": 0
  },
  "errors": []
}
```

#### PUT /api/store/settings
##### Description
Modifies configuration settings for the store.
##### Request
###### Request Body
```json
{
  "settings": [
    { "key": "store_status", "value": "CLOSED" }
  ]
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Store settings updated successfully.",
  "settings": {
    "store_status": "CLOSED"
  }
}
```

#### GET /api/admin/dashboard/metrics
##### Description
Aggregates sales performance metrics and inventory statistics for the admin dashboard.
##### Success Response (200 OK)
```json
{
  "success": true,
  "metrics": {
    "totalOrders": 1280,
    "totalRevenue": 452900,
    "totalCustomers": 420,
    "totalProducts": 250,
    "ordersToday": 12,
    "revenueToday": 4820
  }
}
```

#### GET /api/admin/dashboard/low-stock
##### Description
Lists active product variants with stock levels below the threshold of 5 units.
##### Success Response (200 OK)
```json
{
  "success": true,
  "variants": [
    { "id": "var-uuid", "stock": 2, "product": { "name": "Tata Tea Assam" } }
  ]
}
```

#### GET /api/admin/dashboard/top-products
##### Description
Lists the top 5 best-selling products by quantity sold.
##### Success Response (200 OK)
```json
{
  "success": true,
  "products": [
    { "productName": "Amul Taaza Milk", "variantName": "Volume: 500 ml", "totalSold": 480 }
  ]
}
```

#### GET /api/admin/orders
##### Description
Retrieves a paginated list of all orders. Supports searching and status filtering.
##### Request
###### Query Parameters
- `status`: Filters by order status (`ACTIVE`, `ALL`, `PENDING`, `CONFIRMED`, `DELIVERED`, etc.)
- `search`: Searches by order number, customer name, phone number, or payment method
##### Success Response (200 OK)
```json
{
  "success": true,
  "orders": [...]
}
```

#### PATCH /api/admin/orders/:id/status
##### Description
Updates the status of an order. Restores variant stock if transitioning to `CANCELLED` or `REJECTED`.
##### Request
###### Request Body
```json
{
  "status": "PROCESSING"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "order": { "id": "order-uuid", "status": "PROCESSING" }
}
```

#### PATCH /api/admin/orders/:id/assign-delivery
##### Description
Assigns a delivery rider to an order. Transitions status to `OUT_FOR_DELIVERY` and generates the delivery verification token and OTP.
##### Request
###### Request Body
```json
{
  "deliveryRiderId": "rider-user-uuid"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "order": {
    "id": "order-uuid",
    "status": "OUT_FOR_DELIVERY",
    "deliveryRiderName": "Suresh Kumar",
    "deliveryToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "deliveryOtp": "123456"
  }
}
```

#### POST /api/admin/orders/manual
##### Description
Creates a manual counter or telephone sale. The order is automatically marked as `DELIVERED` and variant stock is deducted.
##### Request
###### Request Body
```json
{
  "recipientName": "Walk-in Customer",
  "recipientPhone": "9999999999",
  "deliveryAddress": "Counter Sale",
  "items": [
    { "variantId": "var-uuid", "quantity": 1 }
  ]
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "order": { "id": "order-uuid", "orderNumber": "SST-MAN-123456", "status": "DELIVERED" }
}
```

#### POST /api/admin/inventory/adjust
##### Description
Manually adjusts the stock level of a product variant.
##### Request
###### Request Body
```json
{
  "variantId": "var-uuid",
  "quantity": 50,
  "transactionType": "STOCK_ADDITION",
  "reason": "Restocked from distributor"
}
```
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Stock adjusted successfully.",
  "variant": { "id": "var-uuid", "stock": 70 }
}
```

#### GET /api/admin/inventory/transactions
##### Description
Retrieves a list of all inventory transactions, sorted with the most recent first.
##### Success Response (200 OK)
```json
{
  "success": true,
  "transactions": [...]
}
```

#### GET /api/admin/audit-logs
##### Description
Retrieves system audit logs. Supports filtering by table name and action.
##### Success Response (200 OK)
```json
{
  "success": true,
  "logs": [...]
}
```

#### GET /api/admin/users
##### Description
Retrieves a list of customer accounts alongside their order metrics.
##### Success Response (200 OK)
```json
{
  "success": true,
  "customers": [
    {
      "id": "user-uuid",
      "name": "Sunita Wani",
      "phone": "+919876543210",
      "ordersCount": 15,
      "totalSpend": 4500.00
    }
  ]
}
```

#### GET /api/admin/team
##### Description
Retrieves all store team members (roles `ADMIN` and `DELIVERY`).
##### Success Response (200 OK)
```json
{
  "success": true,
  "team": [...]
}
```

#### POST /api/admin/team
##### Description
Creates or updates a team member's details and role.
##### Request
###### Request Body
```json
{
  "name": "Rider Ramesh",
  "phone": "9632587410",
  "role": "DELIVERY"
}
```
##### Success Response (201 Created)
```json
{
  "success": true,
  "message": "Team member saved successfully.",
  "member": { "id": "member-uuid", "name": "Rider Ramesh", "role": "DELIVERY", "isAdmin": false }
}
```

#### DELETE /api/admin/team/:id
##### Description
Removes administrative or delivery privileges from an account, downgrading them to a standard customer profile.
##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Team member removed from staff directory."
}
```

---

## 9. Error Handling

### 9.1 Standard Error Format
All API errors return a standard JSON structure with the corresponding HTTP status code:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "A developer-friendly explanation of what went wrong.",
    "details": []
  }
}
```

### 9.2 Validation Errors (Status 422 Unprocessable Entity)
When request payload validation fails (via Yup schema validation), the `details` field is populated with field-specific errors:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation errors occurred.",
    "details": [
      {
        "field": "phone",
        "message": "Phone number must be a valid 10-digit number optionally prefixed with +91."
      }
    ]
  }
}
```

### 9.3 Centralized Error Handler
The server implements a centralized Express error middleware in `server.js`:
```javascript
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
      details: err.details || []
    }
  });
});
```

---

## 10. Middleware Documentation

The backend registers several global and route-specific middleware functions:

### 10.1 Global Middleware
- **CORS Middleware**: Registered globally using `cors()`. Permissive header configurations (`methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`, `allowedHeaders: ['Content-Type', 'Authorization']`).
- **Body Parsers**: Express JSON parser (`express.json()`) and URL encoder (`express.urlencoded()`).
- **Request Logger**: Custom logging middleware that outputs requests to the console:
  ```text
  [2026-07-06T16:30:00.000Z] POST /api/auth/otp/request
  ```

### 10.2 Route-Specific Middleware
1. **`validate(schema, property = 'body')`**: Validates request parameters against a Yup schema. If validation fails, aborts the request and returns a `422` status code. Strips unknown parameters.
2. **`authenticateToken`**: Extracts the Authorization header token. If missing or signature verification fails, blocks the request and returns a `401` status code. Attaches the token payload to `req.user`.
3. **`requireAdmin`**: Executes after `authenticateToken`. Checks if `req.user.isAdmin` is true. If not, blocks the request and returns a `403` status code.
4. **`requireDelivery`**: Executes after `authenticateToken`. Restricts endpoint access to users with `role: "DELIVERY"` or `isAdmin: true`. If check fails, returns a `403` status code.

---

## 11. External Services

The application integrates with the following external services:

1. **Cloudinary SDK**: Hosts product media and user profile avatars. If environment variables are missing, the server logs a warning and uses Unsplash grocery placeholders.
2. **Twilio SMS Gateway**: Sends custom SMS messages for OTP codes. Fallback is enabled if Twilio credentials are not set.
3. **2Factor.in REST API**: Used for sending OTPs in India. Sends SMS messages using templates. If variables are missing, falls back to Twilio or mock credentials.

---

## 12. Security Documentation

- **Stateless Session Control**: Exposes short-lived Access Tokens (15 minutes) and handles session exchanges using Refresh Tokens (7 days).
- **Input Sanitization**: Rejects payloads containing unmapped variables and enforces strict formatting (e.g. phone numbers must match regex validation).
- **Transaction Safety**: Performs catalog changes and inventory adjustments within atomic Prisma database transactions (`prisma.$transaction()`) to prevent race conditions during checkout.
- **Secure QR Scans**: Uses HMAC-SHA256 signatures for delivery tokens. This allows unauthenticated delivery riders to verify orders safely without logging in.

---

## 13. Logging & Monitoring

- **Console Audits**: Server processes log HTTP requests with ISO timestamps, method names, endpoints, and response statuses.
- **Database Logs**: Prisma client is configured to log raw database queries, warnings, and errors in development mode:
  ```javascript
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  ```
- **Auditing System (`AuditLog` Model)**: The server records actions (insert, update, delete) to the `audit_logs` table. This provides a history of administrative changes.

---

## 14. Testing

> [!WARNING]
> The backend does not currently have automated unit or integration test suites configured.

### Manual Verification Instructions
Use Postman or cURL to verify endpoints locally:
1. Start the local server: `npm run dev`.
2. Check backend health: `curl http://localhost:5000/health`.
3. Execute the auth flow using the bypass number:
   ```bash
   curl -X POST http://localhost:5000/api/auth/otp/request -H "Content-Type: application/json" -d "{\"phone\":\"9876543210\"}"
   ```
4. Verify the OTP session using the code `123456`:
   ```bash
   curl -X POST http://localhost:5000/api/auth/otp/verify -H "Content-Type: application/json" -d "{\"phone\":\"9876543210\",\"code\":\"123456\"}"
   ```

---

## 15. Deployment

- **Hosting Options**: The backend is ready to deploy to Render, Railway, or AWS EC2 instances.
- **Database Configuration**: Ensure the target database url is set in `DATABASE_URL` and run Prisma migrations on deploy:
  ```bash
  npx prisma migrate deploy
  ```
- **Production Requirements**:
  - Restrict CORS origins in `server.js` from `*` to the frontend production URL.
  - Set secure values for `JWT_SECRET` and `JWT_REFRESH_SECRET` env variables.
  - Ensure SSL is configured on your production domain to allow EventSource client connections.

---

## 16. Troubleshooting

- **Prisma Schema Drift**: If the PostgreSQL schema drifts, run `npx prisma migrate dev` to synchronize your models.
- **SSE Connection Closed**: If your event stream connection drops, ensure that proxies or firewalls on your hosting provider do not close long-lived HTTP connections, and that SSL is enabled.
- **Twilio SMS Fails**: Ensure that Twilio credentials are valid, the trial account balance is sufficient, and the recipient number is verified if using a trial sandbox.

---

## 17. Contribution Guidelines

- **Code Style**: Format code using Standard JS conventions.
- **Git Branching**:
  - `main` / `master`: Production branch. Keep stable.
  - `dev` / `staging`: Integration branch.
  - Feature branches: Use `feature/feature-name` naming convention.
- **Pull Requests**: Ensure all database schema changes have corresponding migration files.

---

## 18. API Summary Table

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| **GET** | `/health` | Verify server and database health | No |
| **POST**| `/api/auth/otp/request` | Requests a login OTP | No |
| **POST**| `/api/auth/otp/verify` | Verifies the login OTP | No |
| **POST**| `/api/auth/register` | Completes registration for new users | No |
| **POST**| `/api/auth/token/refresh` | Refreshes the JWT Access Token | No |
| **GET** | `/api/auth/me` | Fetches the current user profile | Yes (Customer) |
| **PUT** | `/api/auth/profile` | Updates user profile and avatar | Yes (Customer) |
| **GET** | `/api/addresses` | Retrieves saved shipping addresses | Yes (Customer) |
| **POST**| `/api/addresses` | Creates a new shipping address | Yes (Customer) |
| **PUT** | `/api/addresses/:id` | Updates a shipping address | Yes (Customer) |
| **PATCH**| `/api/addresses/:id/default`| Sets address as default | Yes (Customer) |
| **DELETE**| `/api/addresses/:id` | Deletes a shipping address | Yes (Customer) |
| **GET** | `/api/categories` | Retrieves active categories | No |
| **GET** | `/api/categories/admin/all`| Admin: Lists all categories | Yes (Admin) |
| **POST**| `/api/categories` | Admin: Creates a category | Yes (Admin) |
| **PUT** | `/api/categories/:id` | Admin: Updates a category | Yes (Admin) |
| **DELETE**| `/api/categories/:id` | Admin: Deletes a category | Yes (Admin) |
| **POST**| `/api/categories/:categoryId/subcategories`| Admin: Creates subcategory | Yes (Admin) |
| **PUT** | `/api/categories/subcategories/:id`| Admin: Updates subcategory | Yes (Admin) |
| **DELETE**| `/api/categories/subcategories/:id`| Admin: Deletes subcategory | Yes (Admin) |
| **GET** | `/api/brands` | Retrieves active brands | No |
| **GET** | `/api/brands/admin/all` | Admin: Lists all brands | Yes (Admin) |
| **POST**| `/api/brands` | Admin: Creates a brand | Yes (Admin) |
| **PUT** | `/api/brands/:id` | Admin: Updates a brand | Yes (Admin) |
| **DELETE**| `/api/brands/:id` | Admin: Deletes a brand | Yes (Admin) |
| **GET** | `/api/products` | Retrieves active products | No |
| **GET** | `/api/products/:slug` | Retrieves single product details | No |
| **GET** | `/api/products/admin/all`| Admin: Lists all products | Yes (Admin) |
| **POST**| `/api/products` | Admin: Creates a product | Yes (Admin) |
| **PUT** | `/api/products/:id` | Admin: Updates a product | Yes (Admin) |
| **DELETE**| `/api/products/:id` | Admin: Deletes a product | Yes (Admin) |
| **POST**| `/api/products/:productId/variants`| Admin: Adds a variant | Yes (Admin) |
| **PUT** | `/api/products/variants/:id`| Admin: Updates a variant | Yes (Admin) |
| **DELETE**| `/api/products/variants/:id`| Admin: Deletes a variant | Yes (Admin) |
| **POST**| `/api/products/admin/import-csv`| Admin: Bulk imports CSV products | Yes (Admin) |
| **GET** | `/api/orders` | Retrieves user's order history | Yes (Customer) |
| **GET** | `/api/orders/:id` | Retrieves single order details | Yes (Customer) |
| **POST**| `/api/orders` | Places a new order | Yes (Customer) |
| **POST**| `/api/orders/:id/cancel` | Cancels an order | Yes (Customer) |
| **POST**| `/api/delivery/verify` | Public QR code verification scan | No |
| **GET** | `/api/delivery/assigned` | Rider: Retrieves assigned orders | Yes (Rider) |
| **PATCH**| `/api/delivery/orders/:id/pickup`| Rider: Marks order as picked up | Yes (Rider) |
| **POST**| `/api/delivery/orders/:id/verify-otp`| Rider: Verifies delivery OTP | Yes (Rider) |
| **POST**| `/api/delivery/scan-pickup`| Rider: Self-assigns order via QR | Yes (Rider) |
| **GET** | `/api/store/events` | SSE: SSE Event hub connection | No |
| **GET** | `/api/store/settings` | Retrieves store configuration settings | No |
| **PUT** | `/api/store/settings` | Admin: Updates store settings | Yes (Admin) |
| **GET** | `/api/admin/dashboard/metrics`| Admin: Fetches sales metrics | Yes (Admin) |
| **GET** | `/api/admin/dashboard/low-stock`| Admin: Fetches low stock alerts | Yes (Admin) |
| **GET** | `/api/admin/dashboard/top-products`| Admin: Fetches top sold items | Yes (Admin) |
| **GET** | `/api/admin/orders` | Admin: Lists all orders | Yes (Admin) |
| **PATCH**| `/api/admin/orders/:id/status`| Admin: Updates order status | Yes (Admin) |
| **PATCH**| `/api/admin/orders/:id/assign-delivery`| Admin: Assigns order delivery | Yes (Admin) |
| **POST**| `/api/admin/orders/manual` | Admin: Creates manual order | Yes (Admin) |
| **POST**| `/api/admin/inventory/adjust`| Admin: Adjusts variant stock levels | Yes (Admin) |
| **GET** | `/api/admin/inventory/transactions`| Admin: Lists inventory logs | Yes (Admin) |
| **GET** | `/api/admin/audit-logs` | Admin: Lists audit log events | Yes (Admin) |
| **GET** | `/api/admin/users` | Admin: Lists customers with metrics | Yes (Admin) |
| **GET** | `/api/admin/team` | Admin: Lists store staff directory | Yes (Admin) |
| **POST**| `/api/admin/team` | Admin: Saves a team member | Yes (Admin) |
| **DELETE**| `/api/admin/team/:id` | Admin: Removes a team member | Yes (Admin) |
