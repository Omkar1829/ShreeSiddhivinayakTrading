# TASK_BREAKDOWN.md

# Phase 6: Task Breakdown - SHRI SIDDHIVINAYAK TRADING

## Epic 1: Project Initialization & Build Setup

### Feature 1.1: Frontend Scaffolding
- **Task 1.1.1: Initialize React SPA with Vite**
  - Subtask 1.1.1.1: Execute `npm create vite@latest` selecting React and JavaScript.
  - Subtask 1.1.1.2: Install Redux Toolkit, React Router DOM, Axios, Tailwind CSS, and React Hook Form.
  - Subtask 1.1.1.3: Set up clean folder structure: `src/components`, `src/features`, `src/routes`, `src/store`, `src/styles`.
- **Task 1.1.2: Configure Tailwind CSS & Theme Settings**
  - Subtask 1.1.2.1: Initialize `tailwind.config.js` and specify HSL colors (Forest Emerald, Warm Amber).
  - Subtask 1.1.2.2: Add Google Fonts link for Outfit and Inter in `index.html`.
  - Subtask 1.1.2.3: Implement base utility classes and custom scrollbars in `index.css`.

### Feature 1.2: Backend Server Setup
- **Task 1.2.1: Initialize Express.js Server**
  - Subtask 1.2.1.1: Set up `package.json`, install `express`, `pg`, `cors`, `dotenv`, `jsonwebtoken`, `morgan`.
  - Subtask 1.2.1.2: Configure `server.js` with CORS, JSON body parsers, and custom centralized error middleware.
  - Subtask 1.2.1.3: Configure `.env` configuration file for environment variables management.
- **Task 1.2.2: Set Up Database Context**
  - Subtask 1.2.2.1: Set up pg-pool connection config in `backend/config/db.js`.
  - Subtask 1.2.2.2: Implement SQL initialization migrations script.

---

## Epic 2: Core Authentication System (OTP & JWT)

### Feature 2.1: Passwordless OTP Authentication Flow
- **Task 2.1.1: Express Auth Routes & DB Helpers**
  - Subtask 2.1.1.1: Create `users` table and implement queries to find/create users by mobile number.
  - Subtask 2.1.1.2: Create POST `/api/auth/otp/request` endpoint which generates a 6-digit mock OTP (stored in memory/DB with 5-minute expiry).
  - Subtask 2.1.1.3: Create POST `/api/auth/otp/verify` that checks OTP, issues JWT, and returns user object.
- **Task 2.1.2: Express Auth Middleware**
  - Subtask 2.1.2.1: Create `auth.js` middleware verifying JWT from request header bearer schemes.
  - Subtask 2.1.2.2: Create `isAdmin.js` middleware checking `is_admin` database columns flags.

### Feature 2.2: Frontend Auth Pages & Store State
- **Task 2.2.1: Redux Auth Slice**
  - Subtask 2.2.1.1: Define `authSlice` to track token, loading status, errors, and current user info.
  - Subtask 2.2.1.2: Implement axios interceptors to inject JWT headers and clear session on 401s.
- **Task 2.2.2: Mobile Login View**
  - Subtask 2.2.2.1: Design clean mobile login form requesting phone number.
  - Subtask 2.2.2.2: Design verification OTP step form.
  - Subtask 2.2.2.3: Route customers to checkout page or profile page after successful authentication.

---

## Epic 3: Catalog & Search Management

### Feature 3.1: Catalog Schema & Admin CRUD
- **Task 3.1.1: Database Tables Creation**
  - Subtask 3.1.1.1: Create `categories`, `subcategories`, and `brands` tables with slug indexes.
  - Subtask 3.1.1.2: Create `products` and `variants` tables with check constraints for prices/stock.
- **Task 3.1.2: Admin API Endpoints**
  - Subtask 3.1.2.1: Implement product, category, and brand CRUD routes with validation middleware.
  - Subtask 3.1.2.2: Implement variant CRUD route linked to product IDs.

### Feature 3.2: Customer Browsing & Search
- **Task 3.2.1: Search & Filter API**
  - Subtask 3.2.1.1: Implement pg-trgm indexing search on product names.
  - Subtask 3.2.1.2: Create `/api/products` endpoint filtering by categories, subcategories, brands, and search terms.
- **Task 3.2.2: Catalog Frontend Screens**
  - Subtask 3.2.2.1: Design customer Home catalog grid.
  - Subtask 3.2.2.2: Design Product Listing filters bar.
  - Subtask 3.2.2.3: Build Product Details specs page supporting dynamic variant choices.

---

## Epic 4: Cart, Address, & Checkout System

### Feature 4.1: Cart Integration
- **Task 4.1.1: Redux Cart Slice**
  - Subtask 4.1.1.1: Build `cartSlice` storing variant IDs, quantity, and name.
  - Subtask 4.1.1.2: Write middleware to persist guest cart state inside localStorage.
  - Subtask 4.1.1.3: Create helper merging localStorage cart with DB cart upon login verification.

### Feature 4.2: Address Management
- **Task 4.2.1: Addresses API**
  - Subtask 4.2.1.1: Create DB table `addresses` and implement endpoints (GET, POST, PUT, DELETE).
  - Subtask 4.2.1.2: Implement logic to ensure only one address is flagged as `is_default` at any time.

### Feature 4.3: Checkout & Timings Validation
- **Task 4.3.1: Store Open/Closed Check**
  - Subtask 4.3.1.1: Create DB table `store_settings` containing opening hours variables.
  - Subtask 4.3.1.2: Add middleware on checkout route asserting if current time falls inside open timings.
- **Task 4.3.2: Place Order Checkout**
  - Subtask 4.3.2.1: Create `/api/orders` to execute db transaction: verify stock, insert order, insert order items, and update stock.
  - Subtask 4.3.2.2: Build checkout screen with address selection and COD/UPI toggles.

---

## Epic 5: Order Processing Workflow

### Feature 5.1: Order Management Backend
- **Task 5.1.1: Order Status Engine**
  - Subtask 5.1.1.1: Implement database constraints for allowed order states.
  - Subtask 5.1.1.2: Implement status transition API endpoint ensuring status rules (e.g., no cancellation after packing).
- **Task 5.1.2: Manual Order Creation**
  - Subtask 5.1.2.1: Create `/api/admin/orders/manual` allowing admins to input order details directly.

### Feature 5.2: Admin Orders Dashboard UI
- **Task 5.2.1: Responsive Admin Order Board**
  - Subtask 5.2.1.1: Create tabbed list views tracking order phases.
  - Subtask 5.2.1.2: Implement status update action buttons and assignments dialog launcher.

---

## Epic 6: Inventory Tracking & Auditing

### Feature 6.1: Inventory Transactions Logs
- **Task 6.1.1: Transactions Schema & Logic**
  - Subtask 6.1.1.1: Create table `inventory_transactions` capturing adjustments.
  - Subtask 6.1.1.2: Add SQL trigger/service logger to insert audit records automatically on order fulfillment/cancellation.

### Feature 6.2: Audit Logs Interface
- **Task 6.2.1: Database-Trigger Audit Logs**
  - Subtask 6.2.1.1: Write DB trigger code tracking inserts, updates, and deletes on tables.
  - Subtask 6.2.1.2: Build Admin Audit Logs screen fetching logs with filtering UI.

---

## Epic 7: QR Code Delivery Verification

### Feature 7.1: Cryptographic Token & Verification API
- **Task 7.1.1: Token Generation**
  - Subtask 7.1.1.1: Write utility using jsonwebtoken signing order tokens containing order details and 24h expiry.
  - Subtask 7.1.1.2: Integrate token generation when orders transition to `OUT_FOR_DELIVERY` status.
- **Task 7.1.2: Verification Endpoint**
  - Subtask 7.1.2.1: Implement public `/api/delivery/verify` endpoint validating tokens.

### Feature 7.2: Delivery Frontend Scanner Page
- **Task 7.2.1: QR Generator & Scanning UI**
  - Subtask 7.2.1.1: Integrate `qrcode.react` in Customer Tracking page rendering the QR token URL.
  - Subtask 7.2.1.2: Create public `/delivery/scan` view incorporating `html5-qrcode` camera scanner.
  - Subtask 7.2.1.3: Build success/error full-screen layouts confirming scan verification results.

---

## Epic 8: Admin Dashboard & Reports

### Feature 8.1: Real-Time Admin Analytics
- **Task 8.1.1: Analytics Endpoints**
  - Subtask 8.1.1.1: Create query to calculate revenue, customer totals, and today's sales.
  - Subtask 8.1.1.2: Create query locating variants with stock below low-threshold value.
- **Task 8.1.2: Metrics Charts UI**
  - Subtask 8.1.2.1: Build Admin Dashboard page utilizing `recharts` for sales and volume line charts.
  - Subtask 8.1.2.2: Add low stock alerts cards section.

---

## Epic 9: Progressive Web App (PWA) Integration

### Feature 9.1: Offline Support & Assets Caching
- **Task 9.1.1: PWA Config**
  - Subtask 9.1.1.1: Create `manifest.json` with appropriate theme colors, name, and circular/square app icons.
  - Subtask 9.1.1.2: Set up service worker script using Vite PWA plugin or manual Workbox config to cache bundle files.
  - Subtask 9.1.1.3: Add banner prompts guiding mobile browser users to install the app.

---

## Epic 10: Testing, Build & Deployment

### Feature 10.1: Build Compilation & Hosting
- **Task 10.1.1: Frontend Build & Vercel Deploy**
  - Subtask 10.1.1.1: Configure production environment variables in `.env.production`.
  - Subtask 10.1.1.2: Configure Vercel project linking frontend build settings.
- **Task 10.1.2: Backend Build & Railway/Render Deploy**
  - Subtask 10.1.2.1: Set up Dockerfile or launch configurations for hosting Node/Express API.
  - Subtask 10.1.2.2: Deploy PostgreSQL database and run migrations schemas.
  - Subtask 10.1.2.3: Conduct integration sanity test: place customer order, deduct stock, verify QR code.
