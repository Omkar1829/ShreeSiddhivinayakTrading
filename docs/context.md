# Shri Siddhivinayak Trading (SST) kirana Platform - Context & Architecture Reference

This document serves as a high-density, single-source reference for the project's technical architecture, database modifications, core logistics workflows, and API endpoints.

---

## 🛠️ Technology Stack
- **Frontend:** React 19 (JavaScript), Vite, Redux Toolkit (state management), React Router DOM, Tailwind CSS, Axios (API communication), HTML5-QRCode (Scanner library).
- **Backend:** Node.js, Express.js.
- **Database & ORM:** PostgreSQL (hosted), Prisma.
- **Services:** Cloudinary (product & avatar image hosting), 2Factor.in REST API (SMS OTP dispatches), Twilio REST API (Fallback/WhatsApp dispatches).

---

## 🗄️ Database Schema & Relations (`schema.prisma`)
The primary entity models are **User** and **Order**, modified to support delivery operations and cash collection logs.

### User Roles
- Roles are defined via `role String @default("CUSTOMER")` (`CUSTOMER`, `DELIVERY`, `ADMIN`).
- An administrator is flagged both by `isAdmin Boolean @default(false)` and `role: "ADMIN"`.
- Relationships are split to track shopper orders vs. rider delivery assignments:
  - `orders` -> `Order[] @relation("CustomerOrders")`
  - `riderOrders` -> `Order[] @relation("RiderOrders")`

### Order Schema Modifications
- `deliveryRiderId`: Links to the `User` record assigned as the rider.
- `deliveryRiderName` & `deliveryRiderPhone`: Cached rider details for fast delivery tracking.
- `deliveryOtp`: A random 6-digit PIN code given to the customer to authorize manual delivery verification.
- `deliveryToken` & `deliveryTokenExpiresAt`: Signed JWT tokens utilized by public QR scanner portals.
- `cashCollected` (boolean) & `cashCollectedAt` (timestamp): Logs Cash on Delivery (COD) cash handovers.
- `codPaymentMode` (string): Records whether the rider collected physical cash (`CASH`) or the customer paid via the shop's UPI QR code (`SHOP_QR`).

---

## 🔄 Core Workflows

### 1. Shopper Checkout & Verification
- Shoppers place orders using **COD** or **UPI Pre-Pay**.
- Once out for delivery, the shopper's order tracking console (`/orders/:id`) displays:
  - A secure **Delivery QR code** (containing a signed token).
  - A **6-digit manual Delivery Code (OTP)** (e.g. `584910`) for the delivery boy.
  - Assigned rider's name, profile, and phone click-to-call link.

### 2. Store Admin Console
- **Staff registry ([`AdminSettings.jsx`](file:///d:/my%20react%20projects/SiddhivinayakTreading/frontend/src/pages/AdminSettings.jsx)):** Admins can add or remove delivery riders or new administrators.
- **Dispatch options ([`AdminOrders.jsx`](file:///d:/my%20react%20projects/SiddhivinayakTreading/frontend/src/pages/AdminOrders.jsx)):** Packed orders display a "Dispatch QR" button. This opens a hybrid modal showing both a **Manual Rider Select Dropdown** (Option 1) and a **Rider Scan QR Code** (Option 2) side-by-side.

### 3. Rider Console (`/` when logged in as a Rider)
- If a user has the `DELIVERY` role, standard shop navigation is bypassed and they land on a mobile-first console:
  - **Pickups tab:** Allows riders to scan the admin's dispatch QR code to pick up and assign orders to themselves. Supports scanning multiple dispatches sequentially.
  - **Deliveries tab:** Shows active transit routes, recipient phones, addresses, and clear cash collection targets for COD orders.
  - **Verification:** For COD orders, riders must first specify whether they collected the cash physically (`CASH`) or via the shop's UPI QR code (`SHOP_QR`). Once selected, they can complete the delivery by scanning the customer's QR code or typing their 6-digit OTP.

### 4. OTP Authentication & 2Factor / Twilio Integration
- OTP request `/api/auth/otp/request` checks for 2Factor.in credentials. If present, it calls the 2Factor **AUTOGEN** API (`GET /SMS/{phone}/AUTOGEN/{template}`) which dispatches a secure OTP directly and returns a `sessionId`. This `sessionId` is stored in the cache. During validation (`/otp/verify`), the input code is matched against 2Factor's verify endpoint (`GET /SMS/VERIFY/{sessionId}/{code}`).
- If 2Factor credentials are missing, it falls back to Twilio. If both are missing, it falls back to terminal mock logging.
- **Bypass Key:** The code **`123456`** is hardcoded as a universal master key, letting developers bypass SMS checks in testing.

---

## 🔌 Primary API Endpoints

### Authentication & Staff (`auth.js` / `admin.js`)
- `POST /api/auth/otp/request` -> Generates OTP and sends via 2Factor or Twilio (falls back to mock log).
- `POST /api/auth/otp/verify` -> Checks OTP code (allows `123456` bypass) and returns JWT access tokens + user role.
- `GET /api/admin/team` -> Returns list of store administrators and delivery boys.
- `POST /api/admin/team` -> Registers new admins/delivery riders.
- `DELETE /api/admin/team/:id` -> Downgrades staff to `CUSTOMER` status.

### Deliveries & Logistics (`delivery.js`)
- `GET /api/delivery/assigned` -> Gets active and historical shipments bound to the authenticated rider.
- `POST /api/delivery/scan-pickup` -> Links scanned order ID to the rider and transitions status to `OUT_FOR_DELIVERY`.
- `POST /api/delivery/verify` -> Public QR verification endpoint. Marks status as `DELIVERED` and registers COD cash collection.
- `POST /api/delivery/orders/:id/verify-otp` -> Authenticated OTP check. Marks status as `DELIVERED` and registers COD cash collection.

---

## 🔑 Testing Credentials
- **Primary Admin Mobile:** `+919876543210` (Seeded)
- **Universal OTP Code:** `123456` (Mock/Testing bypass code)
