# IMPLEMENTATION_ROADMAP.md

# Phase 7: Implementation Roadmap - SHRI SIDDHIVINAYAK TRADING

This roadmap breaks down the development lifecycle of the Kirana Commerce & Delivery Platform into 10 structured sprints.

---

## Sprint 1: Project Setup
- **Objective:** Configure workspace repositories, setup React/Express frameworks, configure Tailwind colors, and test database connectivity.
- **Frontend Tasks:**
  - Create React project using Vite.
  - Setup styling using Tailwind CSS with Outfit & Inter Google Fonts.
  - Structure Redux Toolkit main store config.
- **Backend Tasks:**
  - Initialize Node/Express server setup.
  - Set up PostgreSQL pool connection and verification routes.
- **Milestone:** Backend successfully connects to PostgreSQL; frontend renders custom theme colors.

---

## Sprint 2: Authentication
- **Objective:** Implement mobile number OTP-based passwordless authentication and secure API routes.
- **Frontend Tasks:**
  - Build Auth Slice in Redux.
  - Build Mobile phone login page and OTP modal component.
  - Protect private admin paths using route guards.
- **Backend Tasks:**
  - Create `users` table schema.
  - Implement `/api/auth/otp/request` and `/api/auth/otp/verify` endpoints.
  - Implement security token validation middleware (`auth.js` and `isAdmin.js`).
- **Milestone:** Users can register/log in via a mock OTP (e.g. `123456`) and receive a JWT.

---

## Sprint 3: Product Catalog
- **Objective:** Build database structures for products, brands, and categories, and design catalogs views.
- **Frontend Tasks:**
  - Build Catalog Slice in Redux.
  - Build customer Home grid view, Category/Brand filters, and Product Search bar.
  - Design Product Detail view with dynamic variants dropdown selector.
- **Backend Tasks:**
  - Run database migrations creating `categories`, `subcategories`, `brands`, `products`, and `variants` tables.
  - Implement `/api/products` and `/api/products/:slug` endpoints.
  - Implement Admin API endpoints allowing CRUD operations on catalog tables.
- **Milestone:** Catalog is fully browsable and searchable on customer interface; admins can modify listings.

---

## Sprint 4: Cart & Checkout
- **Objective:** Implement guest carts, address books, and checkout verification with store timings control.
- **Frontend Tasks:**
  - Build Redux Cart Slice with localStorage persistence.
  - Implement cart merging logic upon user login.
  - Design Cart checkout drawer and Address Management list.
- **Backend Tasks:**
  - Run migrations creating `addresses` and `store_settings` tables.
  - Implement address CRUD endpoints.
  - Add middleware to block checkouts if current server time is outside store timings settings.
- **Milestone:** Customers can manage addresses, add items to cart, and proceed to checkout during store hours.

---

## Sprint 5: Order Management
- **Objective:** Implement order status workflows, order tracking progress UI, and manual order options.
- **Frontend Tasks:**
  - Design Customer Orders tracking progress bar page.
  - Build Admin Orders Kanban board showing order stages.
  - Build Admin manual order creation form.
- **Backend Tasks:**
  - Run migrations creating `orders` and `order_items` tables.
  - Implement order placement API with database transaction validations.
  - Implement order status update routes and admin manual order entry endpoint.
- **Milestone:** Customer orders are submitted and processed by admin; stock levels deduct appropriately.

---

## Sprint 6: Inventory
- **Objective:** Setup inventory transaction auditing logs and manual stock adjustments dashboards.
- **Frontend Tasks:**
  - Build Admin Stock management view.
  - Add "Adjust Stock" drawer to increase/decrease stock levels.
- **Backend Tasks:**
  - Run migrations creating `inventory_transactions` table.
  - Write backend logic executing stock deduction on confirmed orders, stock restoration on cancellations, and logging transaction events.
- **Milestone:** Stock is updated dynamically on order changes; all adjustments are logged in inventory transactions.

---

## Sprint 7: QR Delivery Verification
- **Objective:** Build cryptographic delivery validation tokens and unauthenticated scanning verification screens.
- **Frontend Tasks:**
  - Integrate QR Code renderer on Customer Order Tracking view.
  - Build unauthenticated `/delivery/scan` camera-scanner view.
  - Build success/error full-screen verification feedback overlays.
- **Backend Tasks:**
  - Implement verification token signing using HMAC-SHA256.
  - Create `/api/delivery/verify` POST endpoint verifying signatures and updating order state to `DELIVERED`.
- **Milestone:** Delivery agents scan order QR codes to securely verify delivery and update status.

---

## Sprint 8: Admin Dashboard
- **Objective:** Implement real-time admin analytics charts and dashboard indicators.
- **Frontend Tasks:**
  - Design responsive Admin Dashboard view.
  - Integrate `recharts` to render sales trends and item category distributions.
  - Display real-time incoming order cards and low-stock alert widgets.
- **Backend Tasks:**
  - Implement `/api/admin/dashboard/metrics` aggregating revenues, sales counts, and stock alerts.
- **Milestone:** Admins can view store sales performance and monitor inventory alerts.

---

## Sprint 9: Audit Logs
- **Objective:** Setup database triggers logging all data modifications and create an admin log search viewer.
- **Frontend Tasks:**
  - Design Admin Audit Logs search page.
  - Build collapsible JSON diff viewer for detailed change analyses.
- **Backend Tasks:**
  - Write PostgreSQL audit logging trigger functions and bind triggers to monitored tables.
  - Create `/api/admin/audit-logs` endpoint with filters.
- **Milestone:** All database changes to products, variants, orders, and settings are audited and viewable in the dashboard.

---

## Sprint 10: PWA & Deployment
- **Objective:** Add PWA manifest, compile production build, host frontend/backend, and perform end-to-end sanity tests.
- **Tasks:**
  - Setup PWA assets manifest and Workbox offline caching.
  - Configure PWA install invitation banners.
  - Deploy React frontend to Vercel.
  - Deploy Express API and PostgreSQL database to Render/Railway.
  - Complete full customer-to-delivery-to-admin integration flow tests.
- **Milestone:** Installable PWA is active on production URL; platform is fully functional in production.
