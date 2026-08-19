# 🛒 Shri Siddhivinayak Trading

> **Full-Stack Kirana Commerce, Inventory Management & Doorstep Delivery Platform**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## 📌 Executive Summary

**Shri Siddhivinayak Trading** is a production-grade, full-stack E-Commerce & Kirana Delivery Platform designed specifically for fast-paced retail and doorstep delivery operations. 

Built with a modern web architecture, it bridges the gap between traditional Kirana stores and digital-first logistics. The platform delivers a high-performance **Mobile-First Progressive Web App (PWA)** for customers, a **Real-Time Command Dashboard** for store managers, and a **QR-Code-Driven Delivery Agent System**.

---

## ✨ Key Features

### 🛍️ Customer Experience (Storefront & PWA)
* **Mobile-First PWA:** Installable web application with offline capabilities and app-like experience.
* **Instant Phone OTP Authentication:** Seamless login via WhatsApp-first OTP (with automatic SMS fallback) powered by MiniMoth / DLT compliance.
* **Smart Catalog & Search:** High-speed product filtering by categories, brands, price ranges, and inventory status.
* **Dynamic Cart & Seamless Checkout:** Live address selection, delivery slot choices, and COD / Online payment integrations.
* **Real-Time Order Tracking:** End-to-end status visibility from order confirmation to doorstep delivery.

### 🛡️ Admin & Inventory Command Center
* **Real-Time Socket.IO Updates:** Live order notifications, sound alerts, and instant dashboard updates without refreshing.
* **Firebase Cloud Messaging (FCM):** Multi-device push notifications sent to store admins for new orders and low-stock alerts.
* **Inventory Control & Stock Management:** Comprehensive product, variant, category, and brand management with automated low-stock warnings.
* **Bulk Operations:** CSV import and verification engine for rapid bulk catalog updates.
* **Security & Audit Logs:** Granular activity logging for administrative actions, database mutations, and system changes.

### 🚚 Delivery Partner Logistics
* **Dedicated Delivery Portal:** Specialized interface for delivery drivers to manage assigned shipments.
* **Built-in QR Code Scanner:** Verification system using `html5-qrcode` for instant order handoff and delivery confirmation.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client[React 19 PWA Client / Admin / Logistics] -->|HTTP / WebSockets| Server[Node.js + Express API Gateway]
    Server -->|ORM Queries| DB[(PostgreSQL Database)]
    Server -->|Real-Time Sockets| Socket[Socket.IO Engine]
    Server -->|Push Alerts| FCM[Firebase Cloud Messaging]
    Server -->|OTP Gateway| MiniMoth[MiniMoth / WhatsApp & SMS API]
    Server -->|Media Storage| Cloudinary[Cloudinary CDN]
```

### **Frontend Stack**
* **Framework:** React 19, React Router DOM v6
* **Build Tool:** Vite 5, Progressive Web App (PWA) Plugin
* **State Management:** Redux Toolkit, React-Redux
* **Styling:** Tailwind CSS, Lucide Icons
* **Form & Validation:** React Hook Form, Yup validation
* **Hardware Integrations:** HTML5 QR Code Scanner

### **Backend Stack**
* **Runtime:** Node.js (v18+)
* **Web Framework:** Express.js
* **Database & ORM:** PostgreSQL, Prisma ORM (v5)
* **Real-time Communication:** Socket.IO
* **Authentication:** JWT Access & Refresh Token Rotation, Cryptographic OTP Engine (`crypto.randomInt`)
* **Third-Party Integrations:** MiniMoth WhatsApp/SMS Gateway, Firebase Admin SDK, Cloudinary CDN

---

## 🔒 Security & Performance Features

* **Strict Content Security & Headers:** Protected via `helmet` and custom `corsOptions`.
* **Rate Limiting:** IP-based request throttling on authentication endpoints using `express-rate-limit`.
* **Cryptographic OTP Entropy:** OTPs generated via secure hardware entropy rather than pseudo-random numbers.
* **Brute-Force Lockout System:** Built-in account lockout mechanisms and resend cooldown timers.
* **Database Optimization:** Indexed database schemas and foreign key cascades managed through Prisma migrations.

---

## 🚀 Local Development Setup

### **Prerequisites**
* Node.js v18.x or higher
* PostgreSQL Database
* npm package manager

### **1. Clone the Repository**
```bash
git clone https://github.com/YourUsername/ShreeSiddhivinayakTrading.git
cd ShreeSiddhivinayakTrading
```

### **2. Backend Configuration & Setup**
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file (.env)
cp .env.example .env
```

Configure your `.env` variables:
```env
PORT=5050
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/siddhivinayak?schema=public"
JWT_SECRET="your_secure_jwt_secret"
JWT_REFRESH_SECRET="your_secure_jwt_refresh_secret"
MINIMOTH_API_KEY="mm_live_your_minimoth_key"
```

Run database migrations and seed default data:
```bash
# Generate Prisma client & apply database migrations
npx prisma migrate dev

# Start backend server
npm run dev
```
Backend will be available at: `http://localhost:5050`

---

### **3. Frontend Setup**
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend will be available at: `http://localhost:3000`

---

## 📂 Project Structure

```text
SiddhivinayakTreading/
├── backend/
│   ├── config/             # Database, Prisma, Firebase, Socket.IO configs
│   ├── controllers/        # Request handlers & controllers
│   ├── middleware/         # Auth, Rate Limiter, Validation, Logger
│   ├── prisma/             # Prisma Schema, Migrations, Seeds
│   ├── routes/             # API Endpoint routes (Auth, Orders, Admin, Products)
│   ├── services/           # Notification & Push services
│   ├── utils/              # Cryptographic OTP, Tokens, Audit Logger, MiniMoth API
│   └── server.js           # Server Entry Point
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Storefront, Admin & Delivery pages
│   │   ├── store/          # Redux Toolkit Slices & Store
│   │   └── utils/          # API Axios instance & helpers
│   ├── index.html
│   └── vite.config.js
│
└── README.md
```

---

## 👤 Author & Maintainer

**Omkar**  
* Full-Stack Developer & Software Engineer  
* GitHub: [@Omkar1829](https://github.com/Omkar1829)  
* Project Repo: [ShreeSiddhivinayakTrading](https://github.com/Omkar1829/ShreeSiddhivinayakTrading)

---

## 📜 License

This project is licensed under the [ISC License](LICENSE).
