# 🌾 Shree Siddhivinayak Trading

[![Production Live](https://img.shields.io/badge/Status-Production--Ready-success.svg?style=for-the-badge&logo=vercel)](https://github.com/Omkar1829/ShreeSiddhivinayakTrading)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20Vite-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma-darkblue?style=for-the-badge&logo=postgresql)](https://www.prisma.io/)

Shree Siddhivinayak Trading is a production-grade, hyper-local e-commerce and delivery logistics platform. Custom-built over a **2-month development cycle**, the system bridges the gap between catalog browsing, store operations, and last-mile logistics for grocery distribution in the Panvel region.

The application features a responsive consumer storefront, a comprehensive administrative operations terminal, and a dedicated delivery agent dashboard utilizing camera-based QR code verification and OTP completion flows.

---

## 🏗 System Architecture & Workflows

The platform is designed around a decoupled, three-tier architecture:
1. **Frontend Application**: A responsive Single Page Application (SPA) built with React 19, Redux Toolkit, and Vite, featuring progressive web app characteristics.
2. **REST API Server**: An Express.js backend running on Node.js, utilizing Prisma ORM to communicate with a PostgreSQL database.
3. **Logistics & Events Hub**: Real-time event broadcasting via Server-Sent Events (SSE) alongside a resilient polling fallback to synchronize orders across the user, admin, and delivery dashboards.

```mermaid
graph TD
    User["🛒 Client Storefront"] -->|1. Places Order| API["⚙️ Node.js REST API"]
    API -->|2. Stores Transaction| DB[("🗄 PostgreSQL DB")]
    API -->|3. Broadcasts event| EH["📡 Real-time SSE Hub"]
    EH -->|Instantly updates feed| Admin["💼 Admin Operations Console"]
    Admin -->|Assigns delivery| API
    EH -->|Notifies assignments| Rider["🛵 Delivery Rider Dashboard"]
    Rider -->|QR code / OTP verification| API
```

---

## 🛠 Tech Stack

### Frontend Core
* **Library/Runtime**: React 19, Vite (Fast builds & Hot Modules)
* **State Management**: Redux Toolkit (`@reduxjs/toolkit`) for global shopping cart, settings, and credentials
* **Styling**: Tailwind CSS & CSS modules for clean, high-performance UI
* **Hardware Integration**: `html5-qrcode` camera integration for mobile scanning

### Backend Core
* **Engine**: Node.js & Express.js
* **Database & ORM**: PostgreSQL, Prisma ORM
* **Authentication**: JSON Web Tokens (JWT) with secure HTTP-only refresh tokens
* **OTP Gateway**: Multi-channel integration (Twilio SMS and 2Factor REST SMS)
* **Cloud Storage**: Cloudinary SDK for automated media compression

---

## 📅 Development Timeline & Step-by-Step Additions

### 🚀 Month 1: Core Commerce Foundation
* **Database Schema Design**: Designed robust relational Prisma models for Users, Products, Variants, Categories, Brands, Addresses, Orders, OrderItems, and AuditLogs.
* **Authentication Infrastructure**: Integrated verification logic using temporary tokens. Configured OTP verification bypasses for testing (e.g. `9876543210` with mock code `123456`).
* **Shopping Cart & Checkout**: Developed Redux-driven cart logic, product filtering, dynamic searches, price-per-unit breakdowns (per kg / per liter), and multi-step delivery address selection.

### ⚙️ Month 2: Operations, Logistics & Real-Time Sync
* **Interactive Admin Terminal**: Built a comprehensive administrative shell to monitor metrics, handle product catalog inventory, update stock values, view system audit logs, and assign delivery riders.
* **Rider Dashboard & Verification Logistics**: Created a mobile-optimized Rider Console supporting pickups, deliveries, and delivered logs.
* **Dual QR-OTP Verification**:
  * Store pick-up via camera scan.
  * Delivery confirmation via secure QR codes or 6-digit client-side OTP verification.
* **Live SSE Sync with Polling Fallback**: Built a real-time event broadcaster. Added a 10-second polling fallback for cases where browser Mixed Content filters (HTTP/HTTPS) block EventSource streams on production servers.
* **Branded Copy Updates**: Updated hero messaging to reflect local Panvel delivery incentives.
* **Multi-Step User Registration**: Implemented a registration wizard that requests a user's name on signup after phone verification, keeping returning logins immediate.

---

## 📈 Next Steps: Going Live (Month 3 Roadmap)

Over the next month, the platform will transition from staging to fully live production.

```
[Week 1: SSL & Security Configuration] ──> [Week 2: Payment Integration] ──> [Week 3: Stress Testing] ──> [Week 4: Launch]
```

1. **Security & Production Domain Configuration (Week 1)**:
   * Map AWS EC2 backend to a domain name with an SSL certificate (`https://api.siddhivinayaktrading.com`) to allow native, unblocked secure EventSource connections.
2. **Online Payment Integrations (Week 2)**:
   * Connect payment gateways (such as Razorpay or UPI deep links) to support cashless transactions alongside Cash-on-Delivery (COD).
3. **Load Testing & Database Indexes (Week 3)**:
   * Perform load and stress testing on backend queries and optimize PostgreSQL indexes for scale.
4. **Staging Deploy & Fleet Onboarding (Week 4)**:
   * Onboard delivery riders, print store slips with pre-generated QR codes, and go live!

---

## 🚀 Local Installation & Set-Up

### Prerequisites
* Node.js v18+
* PostgreSQL database instance

### Database Setup
1. Clone the repository and navigate to the root directory.
2. Create a `.env` file in the `/backend` folder:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/siddhivinayak"
   JWT_SECRET="your_jwt_access_secret"
   JWT_REFRESH_SECRET="your_jwt_refresh_secret"
   PORT=5000
   ```
3. Run migrations and seed files:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

### Start Servers
* **Backend REST API**:
  ```bash
  cd backend
  npm run dev
  ```
* **Vite Frontend SPA**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

---

## 📄 License
This project is licensed under the MIT License. Developed for **Shree Siddhivinayak Trading**.
