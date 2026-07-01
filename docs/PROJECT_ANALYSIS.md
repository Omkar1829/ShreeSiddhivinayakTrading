# PROJECT_ANALYSIS.md

# Phase 1: Project Analysis - SHRI SIDDHIVINAYAK TRADING

## 1. Project Understanding
**SHRI SIDDHIVINAYAK TRADING** is a trusted neighborhood grocery store located in Panvel, Maharashtra, established in 2007. To modernise its operations and expand its reach, the business is launching a mobile-first online commerce and doorstep delivery platform. 

This platform will serve two primary customer needs: browsing and ordering premium groceries from home, and receiving them via reliable local delivery. For the owners, it will digitize inventory, streamline order management, generate real-time business insights, and automate delivery verification via QR codes.

As a portfolio-grade and CDAC-quality project, it demands production-grade software engineering, secure coding practices, database integrity, audit compliance, and an installable Progressive Web Application (PWA) experience.

---

## 2. Business Objectives
- **Digital Expansion:** Extend the store's physical presence into the digital space, capturing the growing demand for online grocery delivery in Panvel.
- **Customer Convenience:** Minimize friction for loyal and new customers by offering search, guest carts, order history, quick reordering, and direct WhatsApp/Phone communication.
- **Operational Efficiency:** Enable store partners (Yatish, Manas, Yogesh, Ravindra) to manage products, categories, subcategories, brands, and real-time inventory adjustments from a single dashboard.
- **Delivery Trust (Verification):** Prevent delivery disputes and status errors by using a QR-code scanning mechanism to confirm that the correct order was handed over to the customer.
- **Business Transparency:** Log every single inventory movement and state change (audit logs) to prevent stock mismatches and track internal operations.

---

## 3. User Personas

### Persona A: The Customer (e.g., Sunita, Age 42)
* **Context:** A busy homemaker in Uran Naka, Panvel. She has ordered groceries from Shri Siddhivinayak Trading via phone call for years.
* **Needs:** 
  - A clean, simple, mobile-first interface in her browser.
  - The ability to browse categories (Groceries, Dairy, Beverages) and search for specific brands (Amul, Tata, Britannia).
  - Quick checkout using Cash on Delivery (COD) or a QR payment display.
  - Reordering her monthly staples (e.g., 10kg Tata Sampann Dal, 5L Fortune Oil) in under three taps.
  - Displaying a QR code to the delivery boy when the order arrives at her door.

### Persona B: The Store Owner/Admin (e.g., Yatish / Manas)
* **Context:** Working partners running day-to-day store operations, packing orders, and managing stock levels.
* **Needs:**
  - An intuitive, responsive admin dashboard to manage product catalogs and variants (e.g., 500ml vs 1L milk).
  - Immediate notification of incoming orders and low-stock alerts.
  - A quick way to enter phone-in or walk-in orders manually (Manual Order creation).
  - Assigning a delivery person's name and phone number to an order.
  - Visualizing daily sales, order volumes, top products, and checking the audit log to review inventory adjustments.

### Persona C: The Delivery Agent (Unauthenticated workflow)
* **Context:** A local delivery boy employed by the store.
* **Needs:**
  - No complex log-in credentials or app setup.
  - A fast, unauthenticated web scanner tool on his phone to scan the customer's delivery QR code.
  - Real-time confirmation that the order status has changed to `DELIVERED` upon scanning.

---

## 4. Functional Requirements

### 4.1 Frontend / PWA (Customer-Facing)
- **Guest Browsing:** Search and filter catalog items by category, subcategory, and brand without logging in.
- **Dynamic Product Variants:** Display multiple purchasing options (e.g., 1 Kg, 5 Kg, 10 Kg) with respective prices and real-time stock indicators.
- **Guest Cart:** Add items to cart; storage persisted in browser `localStorage`.
- **OTP Authentication:** Passwordless signup and login via Mobile Number + OTP (mocked in development, ready for Twilio API in production).
- **Cart Merge:** Merge the guest cart with the customer's account cart upon successful login.
- **Address Manager:** Add, edit, delete, and set a default shipping address.
- **Checkout Process:** Choice of Cash on Delivery (COD) or Store QR Code Payment. Free delivery by default.
- **Order Tracking:** Real-time progress bar for order states: `PENDING` -> `CONFIRMED` -> `PROCESSING` -> `PACKED` -> `OUT_FOR_DELIVERY` -> `DELIVERED`.
- **QR Code Generator:** Renders a secure, time-limited QR code once an order reaches `OUT_FOR_DELIVERY` status.
- **Store Timings Guard:** Disable checkout dynamically if the current server time is outside the configured Store Settings hours. Catalog remains viewable.
- **PWA Installation:** Installable home-screen shortcut on Android, customized icon, offline caching of static assets.

### 4.2 Backend / Admin Panel
- **Dashboard Metrics:** Total orders, total revenue, customer count, product count, and today's sales/orders statistics.
- **Product CRUD:** Manage product details, single image upload, subcategory linkages, active/inactive statuses, and variants.
- **Category & Brand CRUD:** Structure the catalog hierarchy.
- **Inventory Management:** Edit stock levels manually, log reason for adjustments (e.g., damage, manual addition), and review low-stock thresholds.
- **Manual Order Creation:** Create order entries for walk-in or telephone customers, deducting variant stock immediately.
- **Delivery Assignment:** Update order assignment to include Delivery Name and Delivery Phone Number.
- **Audit Logs:** Secure, read-only table displaying chronological logs of operations (brand edits, price updates, stock changes, etc.).
- **Store Settings Panel:** Configure business hours, name, logo, banner, phone numbers, and emergency "closed" status.

### 4.3 QR Verification Engine
- Generates a cryptographically signed order token payload (including `order_id`, `client_id`, `expiry`).
- API endpoint (`/api/delivery/verify`) to decrypt, validate order state, check timestamp expiration, and transition order to `DELIVERED`.

---

## 5. Non-Functional Requirements
- **Mobile-First Responsiveness:** Customer UI must resemble a native mobile application, optimized for Chrome (Android) and Safari (iOS).
- **Security:**
  - JWT (JSON Web Tokens) for API session state validation.
  - Passwordless, secure OTP validation checks.
  - Input validation utilizing libraries such as `Joi` or `Zod` to prevent injections.
  - CORS policies restricting API access to verified frontend domains.
- **Performance:** Sub-2 second load times for the product catalog. Lightweight payload exchanges.
- **Data Integrity:** Database transactions for order checkouts to ensure inventory is deducted atomically and concurrent buys do not cause negative stock levels.
- **Audit Compliance:** Complete log history for all catalog adjustments, preserving data transparency.

---

## 6. Assumptions & Scope Boundaries

### Assumptions
1. **Mock OTP:** Since real SMS credits cost money and require DLT registration in India, the application will default to a mock verification code (e.g., `123456`) in development and staging environments.
2. **Manual QR Payment:** QR payment is a display of the store's static UPI QR code. The customer pays using their own UPI app (GPay, PhonePe), and the payment confirmation is confirmed by store managers upon delivery or order pickup.
3. **No Delivery Logins:** Delivery personnel access a dedicated, public route `/delivery/scan` which requests browser camera permission. They scan the customer's QR, which contains a signed order token. The API validates the signature and completes the delivery. No credentials needed for delivery staff.

### Boundaries (Explicitly Excluded from MVP)
- No online payment gateway integrations (Razorpay, Paytm).
- No delivery driver accounts, driver shift logs, or GPS live tracking.
- No automated GST calculations or tax invoicing PDFs.
- No discount coupons, promo codes, or loyalty points.
- No customer product reviews or rating systems.
- No advanced warehouse management, vendor procurement sheets, or expiration tracking.

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Offline Scanning Issues** | High | Delivery agents may lose internet access. The scanned order URL can display a fallback numerical code that the customer can read out, or the agent can save the scanned token locally and submit it when back online. |
| **Double Deduction of Inventory** | High | Concurrent checkouts of the same product variant. Mitigate by using database transactions (`SELECT ... FOR UPDATE` or SQL constraint checks) to verify stock availability before final insertion. |
| **Unapproved Access to Admin Routes** | Critical | Leakage of dashboard data. Mitigate by implementing Express middleware that validates JWT roles and blocks non-admin tokens. |
| **PWA Service Worker Staling** | Medium | Users seeing outdated UI assets. Mitigate by implementing service worker update-prompts or immediate activation strategies (`skipWaiting`, `clientsClaim`). |
