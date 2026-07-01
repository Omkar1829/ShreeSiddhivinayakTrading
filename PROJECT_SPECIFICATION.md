# MASTER_PROJECT_SPECIFICATION.md

# SHRI SIDDHIVINAYAK TRADING - Kirana Commerce & Delivery Platform

## 1. Executive Summary

Build a production-ready, mobile-first commerce and delivery platform for SHRI SIDDHIVINAYAK TRADING, a trusted grocery retailer in Panvel established in 2007.

The platform enables customers to browse products, place orders, track order status, and verify deliveries using QR codes. Admins manage products, inventory, orders, and delivery assignments through a web dashboard.

This project is intended to be:
- A strong CDAC project
- A portfolio-quality application
- A deployable real-world solution for the business

---

## 2. Business Information

### Store Name
SHRI SIDDHIVINAYAK TRADING

### Established
2007

### Partners
- YOGESH RAVINDRA WANI
- RAVINDRA VISHWANATH WANI

### Working Partners
- YATISH RAVINDRA WANI
- MANAS YOGESH WANI

### Address
Shop No. 4, Opp. Krishna Tower
Uran Naka
Panvel – 410206
Maharashtra, India

### Legal Details
GSTIN: 27ABLFS6784R1ZV
FSSAI License: 11514024002414

### Tagline
Premium Groceries | Trusted Since 2007 | Panvel

### Business Goals
- Superior quality and freshness
- Transparent pricing
- Personalized service
- Reliable doorstep delivery

### Customer Promise
- Free Delivery (MVP)
- Fast Service
- Trusted Neighborhood Store
- Premium Grocery Experience

---

## 3. Project Vision

Create a digital commerce platform that combines the trust of a local grocery store with the convenience of modern online ordering and delivery management.

---

## 4. Technology Stack

### Frontend
- React
- JavaScript
- Redux Toolkit
- React Router
- Vite
- Tailwind CSS
- Axios
- React Hook Form
- PWA Support

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL

### Communication
- Twilio (Future WhatsApp Integration)

### Authentication
- Mobile Number + OTP

### Deployment
Frontend:
- Vercel

Backend:
- Railway / Render / AWS EC2

Database:
- PostgreSQL

---

## 5. User Types

### Customer

Can:
- Browse products
- Search products
- Add products to cart
- Manage addresses
- Place orders
- Track orders
- Reorder previous orders
- Display delivery QR
- Contact store

### Admin

Can:
- Manage products
- Manage inventory
- Manage brands
- Manage categories
- Manage orders
- Create manual orders
- Assign deliveries
- View dashboard
- View audit logs
- Configure store settings

All admin users have equal permissions in MVP.

### Delivery Personnel

MVP:
- No login

Future:
- Dedicated delivery accounts

---

## 6. Authentication

### Customer Login

Flow:

Mobile Number
→ OTP
→ Verify
→ Login

If user does not exist:
- Create account automatically

### Guest Access

Guests can:
- Browse products
- Search products
- Add to cart

Login required during checkout.

---

## 7. Customer Profile

Fields:
- Name
- Mobile Number
- Profile Picture

Not Included:
- Gender
- Loyalty Program

---

## 8. Address Management

Customers can:

- Add Address
- Edit Address
- Delete Address
- Set Default Address

Multiple addresses supported.

---

## 9. Product Catalog

### Product Fields

- Name
- Description
- SKU
- Barcode
- Brand
- Category
- Subcategory
- Single Image
- Status

### Product Status

ACTIVE

INACTIVE

Inactive products are hidden from customers.

---

## 10. Brand Management

Admin CRUD Required

Examples:

- Amul
- Tata
- Britannia
- Parle
- Nestlé

---

## 11. Categories

Admin Managed

Examples:

Groceries

Dairy

Beverages

Snacks

Household

---

## 12. Subcategories

Examples:

Groceries
- Rice
- Flour
- Pulses

Dairy
- Milk
- Butter

---

## 13. Product Variants

Dynamic Attributes Required

Examples:

Rice
- 1 Kg
- 5 Kg
- 10 Kg

Milk
- 500 ml
- 1 L

Each Variant Contains:
- Attribute
- Value
- Price
- Stock
- Status

Inventory tracked at variant level.

---

## 14. Search System

### Customer Search

Search by:
- Product Name
- Brand
- Category
- Subcategory

### Admin Search

Search by:
- Product Name
- SKU
- Barcode
- Brand
- Category

---

## 15. Inventory Management

Purpose:
Support ordering and delivery workflows.

This is NOT a complete ERP.

### Supported

- Stock Addition
- Stock Reduction
- Manual Adjustments
- Order Deductions
- Inventory Transactions
- Low Stock Alerts

### Not Included

- Batch Tracking
- Expiry Tracking
- Supplier Management
- Purchase Orders
- Warehouse Management

---

## 16. Inventory Transactions

Examples:

+100 Stock Added

-5 Order Fulfilled

-2 Manual Adjustment

Every transaction must be logged.

---

## 17. Low Stock Alerts

Admin dashboard shows products below threshold.

No push notifications in MVP.

---

## 18. Cart System

Guest Cart Supported

Stored in browser local storage.

After login:
- Cart merged with customer account

---

## 19. Checkout

### Supported

- Cash On Delivery (COD)
- QR Payment (manual verification if needed)

### Not Included

- Razorpay
- Payment Gateway Integration
- Refund Automation

### Delivery Charges

Free Delivery in MVP

Future:
- Configurable delivery fees

---

## 20. Order Workflow

Customer Places Order

↓

PENDING

↓

Admin Reviews

↓

CONFIRMED
or
REJECTED

---

## 21. Order Status Flow

PENDING

CONFIRMED

PROCESSING

PACKED

OUT_FOR_DELIVERY

DELIVERED

Additional States:

CANCELLED

REJECTED

---

## 22. Order Cancellation

Allowed:
- Pending
- Confirmed

Not Allowed:
- Processing
- Packed
- Out For Delivery
- Delivered

---

## 23. Reorder Feature

Customer can reorder previous orders.

Available products:
- Added to cart

Unavailable products:
- Shown separately

---

## 24. Manual Orders

Admin can create orders for:

- Phone orders
- WhatsApp orders
- Walk-in customers

---

## 25. Delivery Assignment

Admin enters:

- Delivery Name
- Delivery Phone Number

No delivery login required in MVP.

---

## 26. QR Delivery Verification

When order reaches:

OUT_FOR_DELIVERY

System generates secure QR.

Customer displays QR.

Delivery person scans QR.

Backend validates:

- Order
- Token
- Expiry

If valid:

DELIVERED

---

## 27. Notifications

### MVP

Dashboard Notifications Only

Examples:

- New Order
- Low Stock
- Order Cancelled

### Future

- Push Notifications
- WhatsApp Notifications

---

## 28. Contact Store

Customer can:

- Call Store
- Open WhatsApp Chat

Store details configurable.

---

## 29. Store Settings

- Store Name
- Logo
- Banner
- Phone Number
- WhatsApp Number
- Address
- Opening Time
- Closing Time
- Store Status

---

## 30. Store Timings

Store Open:
Checkout Enabled

Store Closed:
Catalog Visible
Checkout Disabled

---

## 31. Dashboard

### Metrics

- Total Orders
- Total Revenue
- Total Customers
- Total Products
- Orders Today
- Revenue Today

### Sections

- Top Selling Products
- Low Stock Products
- Recent Orders

---

## 32. Audit Logs

Track:

- Product Changes
- Inventory Changes
- Order Status Changes
- Brand Changes
- Category Changes
- Store Setting Changes
- Delivery Assignments

---

## 33. PWA Requirements

Support:

- Install on Android
- Home Screen Icon
- Offline Asset Caching
- Mobile App Experience

---

## 34. Security Requirements

- OTP Authentication
- JWT Tokens
- Input Validation
- Rate Limiting
- CORS
- Audit Logging
- Secure APIs

---

## 35. MVP Scope

Included:

- OTP Login
- Guest Browsing
- Guest Cart
- Product Catalog
- Categories
- Brands
- Variants
- Inventory
- Low Stock Alerts
- Order Approval
- Manual Orders
- QR Delivery Verification
- Dashboard
- Audit Logs
- PWA

---

## 36. Deferred Features (V2)

- Delivery Staff Accounts
- Push Notifications
- WhatsApp Notifications
- Invoice Generation
- Reviews & Ratings
- GPS Tracking
- Coupons
- GST
- Scheduled Deliveries
- Advanced Inventory Features

---

## 37. Documentation Required Before Development

1. PROJECT_REQUIREMENTS.md
2. USER_FLOWS.md
3. DATABASE_DESIGN.md
4. ER_DIAGRAM.md
5. API_SPECIFICATION.md
6. SYSTEM_ARCHITECTURE.md
7. UI_UX_PLAN.md
8. TASK_BREAKDOWN.md

Do not start implementation until documentation is reviewed.

---

## 38. Success Criteria

The MVP is complete when:

- Customers can place orders
- Admins can manage products
- Inventory updates correctly
- Orders move through workflow
- QR verification works
- Dashboard metrics work
- Audit logs work
- PWA installs successfully
- Application is deployed
