# RK Saree Center & Fashion Hub

> Full-stack e-commerce platform for sarees, kurtis, and ethnic wear — built for Indian customers on mobile-first 4G connections with Cash on Delivery.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

**RK Saree Center & Fashion Hub** is a production-grade e-commerce web application designed specifically for Indian ethnic wear retail. The platform addresses key pain points for both **customers** (detailed product specs, COD support, pincode-based delivery) and **sellers** (COD confirmation to reduce returns, inventory management, audit trails).

Built to perform on budget Android phones over 4G networks — where most Indian online shoppers browse.

---

## Live Demo

| Service  | URL |
|----------|-----|
| Frontend | [rk-saree-center-and-fashion-hub.vercel.app](https://rk-saree-center-and-fashion-hub.vercel.app) |
| Backend API | Hosted on [Render](https://render.com) |

> **Demo Credentials** — Register a new account or contact the admin for test access.

---

## Features

### 🛒 Customer Experience

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Browse sarees, kurtis, lehengas, suits with category/subcategory filters, price range, and sort options |
| **Saree Specification Sheet** | Fabric, weave, zari type, exact length & width, blouse-piece length, fall/pico, GI tag, Silk Mark, HSN code |
| **Live Search** | Predictive search with debounced API calls and keyboard navigation |
| **Pincode Serviceability** | Enter your pincode to check delivery availability, auto-fill city/state |
| **Product Reviews** | Star ratings, verified-purchase badges, star histogram, and fit feedback (runs small/true to size) |
| **Wishlist** | Save favourite products with cross-device sync for logged-in users |
| **Shopping Cart** | Quantity management with real-time stock validation, discounted price calculation |
| **Multiple Shipping Options** | Standard (4-6 days) and Express (2-3 days) with free shipping thresholds |
| **Cash on Delivery** | COD badge on every product page, COD confirmation via WhatsApp |
| **Online Payments** | Razorpay integration — UPI, Credit/Debit Cards, Net Banking, Wallets |
| **Order Tracking** | Real-time status updates with email notifications at every stage |
| **Saved Addresses** | Address book with one-tap reorder (up to 10 addresses) |
| **Gift Options** | Gift wrap, gift notes, and delivery instructions |
| **Size Guide** | Height-to-length tool and blouse-fabric table tailored for sarees |
| **Returns** | 7-day return policy with clear non-returnable conditions stated before purchase |
| **PWA** | Installable progressive web app with offline-capable shell |

### 📊 Admin Dashboard

| Feature | Description |
|---------|-------------|
| **Dashboard Analytics** | Revenue, orders, new customers, top products, and COD health metrics |
| **Product Management** | Full CRUD with Cloudinary image uploads, variant management, specifications editor |
| **Order Management** | Status workflow (Confirmed → Packed → Shipped → Out for Delivery → Delivered), bulk operations |
| **User Management** | View all users, toggle admin privileges, account management |
| **Coupon System** | Create percentage/flat coupons with min order, max discount, usage limits, expiry dates |
| **Announcements** | Site-wide banners with type (info/success/warning/offer), scheduling with start/end dates |
| **Shipping Labels** | Generate printable shipping labels and courier dispatch manifests |
| **Audit Log** | Every privileged action that moves money or grants privilege is recorded |
| **In-App Notifications** | Real-time notifications for order events, stock alerts, and system events |

### 🔒 Security & Integrity

| Feature | Description |
|---------|-------------|
| **Transaction-Backed Inventory** | Stock decrement/restore runs in MongoDB transactions to prevent overselling |
| **NoSQL Injection Prevention** | All user inputs sanitized against operator injection |
| **Rate Limiting** | Shared rate-limit store across instances (auth, orders, API endpoints) |
| **Helmet Security Headers** | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| **JWT Authentication** | Secure token-based auth with password-change revocation |
| **Input Validation** | Server-side validation on all endpoints with strict type checking |
| **Webhook Verification** | Razorpay and WhatsApp webhook signature verification |
| **CORS Policy** | Configurable allowlist for frontend origins |
| **Request Correlation** | X-Request-Id for tracing requests across distributed instances |
| **CSP Report Collector** | Collects Content-Security-Policy violations for monitoring |

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20+ | Runtime |
| **Express** | 5.x | Web framework |
| **Mongoose** | 9.x | MongoDB ODM |
| **MongoDB Atlas** | — | Database (replica set required) |
| **Razorpay** | 2.x | Payment gateway |
| **Cloudinary** | 2.x | Image CDN & uploads |
| **Nodemailer** | 10.x | Transactional emails |
| **Helmet** | 8.x | Security headers |
| **bcrypt** | 6.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT authentication |

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.x | UI framework |
| **Vite** | 7.x | Build tool & dev server |
| **Tailwind CSS** | 3.4 | Utility-first CSS |
| **React Router** | 7.x | Client-side routing |
| **Axios** | 1.x | HTTP client |
| **Framer Motion** | 12.x | Animations |
| **React Hot Toast** | 2.x | Toast notifications |
| **Recharts** | 3.x | Dashboard charts |
| **jsPDF** | 4.x | PDF generation (invoices, labels) |
| **React Helmet Async** | 3.x | SEO meta tags |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                       │
│  React 19 + Vite 7 + Tailwind CSS + React Router 7      │
│  PWA · Lazy-loaded routes · SEO with JSON-LD             │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼────────────────────────────────┐
│                   API Server (Express 5)                  │
│  Auth · Rate Limiting · CORS · Helmet · Compression      │
│  Request Correlation · CSP Report Collector               │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Products │ Orders   │ Users    │ Payments │ Webhooks     │
│ Coupons  │ Reviews  │ Uploads  │ Announce │ Contacts     │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                    Services Layer                         │
│  Inventory · Pricing · Email · COD · Notifications       │
│  Audit Log · Cron Lease · Pincode · Coupon Validator     │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌────────────┐  ┌──────────┐
    │ MongoDB  │  │ Cloudinary │  │ Razorpay │
    │ Atlas    │  │ (Images)   │  │(Payments)│
    │ (Replica │  └────────────┘  └──────────┘
    │  Set)    │
    └──────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** 20 or newer
- **MongoDB** — must be a **replica set** (transactions are used for inventory atomicity)
  - [MongoDB Atlas](https://www.mongodb.com/atlas) — already a replica set
  - Local development:
    ```bash
    mongod --dbpath ./data --replSet rs0
    mongosh --eval "rs.initiate()"
    ```

### Installation

```bash
# Clone the repository
git clone https://github.com/MunnaKumar32990/Rk-Saree-Center-and-Fashion-Hub.git
cd Rk-Saree-Center-and-Fashion-Hub
```

### Backend Setup

```bash
cd backend
cp .env.example .env    # Fill in your values — see Environment Variables section
npm install
npm run dev             # Starts with nodemon (hot reload)
# OR
npm start               # Production mode (no nodemon)
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env    # Set VITE_API_URL to your backend URL
npm install
npm run dev             # Starts Vite dev server on port 5173
```

### Seed Sample Data (Optional)

```bash
cd backend
node scripts/seedDev.mjs
```

Creates sample products (sarees, lehengas, kurtas), an admin user, a demo customer, coupons, and an announcement banner.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB replica set connection string |
| `JWT_SECRET` | ✅ | Min 32 characters — generate with crypto.randomBytes |
| `PORT` | — | API port (default: `5000`) |
| `NODE_ENV` | — | `development` or `production` |
| `FRONTEND_URL` | — | CORS allowlist (comma-separated origins) |
| `RAZORPAY_KEY_ID` | — | Razorpay API key (test or live) |
| `RAZORPAY_SECRET` | — | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | ⚠️ | Required when Razorpay is configured |
| `CLOUDINARY_CLOUD_NAME` | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary API secret |
| `EMAIL_USER` | — | Gmail address for transactional emails |
| `EMAIL_PASS` | — | Gmail App Password (16 characters) |
| `COD_CONFIRM_ENABLED` | — | Enable WhatsApp COD confirmation (`true`/`false`) |
| `WHATSAPP_API_TOKEN` | — | Meta WhatsApp Business API token |
| `WHATSAPP_PHONE_NUMBER_ID` | — | WhatsApp Business phone number ID |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Backend API URL (e.g., `http://localhost:5000/api`) |
| `VITE_BUSINESS_PHONE` | — | Display phone number |
| `VITE_WHATSAPP_NUMBER` | — | WhatsApp number for customer support |

> **Note:** `VITE_API_URL` is required for production builds. The build will fail if it's missing or points to localhost.

---

## Deployment

### Render (Backend)

The repository includes a [`render.yaml`](render.yaml) Blueprint for one-click deploy:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Runtime** | Node |

> ⚠️ **Do NOT use `npm run dev`** as the start command — it requires `nodemon` which is not available in production.

Set all required environment variables in the Render dashboard.

### Vercel (Frontend)

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Framework Preset** | Vite |

Set `VITE_API_URL` to your Render backend URL (e.g., `https://your-api.onrender.com/api`).

---

## Testing

### Backend (286 end-to-end tests)

```bash
cd backend
npm run test:setup   # One-time: initialize local replica set
npm test             # Runs 286 assertions against real HTTP + real MongoDB
```

The test suite validates:
- Security properties (injection prevention, auth checks, webhook verification)
- Money integrity (concurrent stock, coupon validation, payment verification)
- Order state machine (valid transitions, cancel/return flows)
- API contracts (response shapes the frontend depends on)
- Infrastructure (compression, rate limiting, request correlation)

### Frontend

```bash
cd frontend
npm run lint         # ESLint — must pass with 0 errors
npm run build        # Vite production build
```

---

## Project Structure

```
Rk-Saree-Center-and-Fashion-Hub/
├── backend/
│   ├── src/
│   │   ├── config/         # Database, env validation, pricing, Razorpay, Cloudinary
│   │   ├── controllers/    # Request handlers (order, product, user, payment, coupon)
│   │   ├── middlewares/     # Auth, error handling, rate limiting
│   │   ├── models/          # Mongoose schemas (User, Product, Order, Coupon, etc.)
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic (email, COD, inventory, notifications)
│   │   ├── utils/           # Input validation, token generation, helpers
│   │   └── server.js        # Application entry point
│   ├── scripts/             # Dev seeder, test runner, replica set init
│   ├── .env.example         # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── admin/           # Admin dashboard pages (11 components)
│   │   ├── components/      # Reusable UI components (24 components)
│   │   ├── context/         # React context providers (Auth, Cart, Wishlist)
│   │   ├── hooks/           # Custom hooks (useDebounce)
│   │   ├── pages/           # Route pages (25 pages)
│   │   ├── services/        # API client (Axios instance)
│   │   ├── utils/           # Pricing, storage, contact, Cloudinary helpers
│   │   ├── App.jsx          # Root component with routing
│   │   └── main.jsx         # Application entry point
│   ├── public/              # Static assets, PWA manifest, icons
│   ├── .env.example         # Frontend env template
│   └── package.json
├── render.yaml              # Render Blueprint for deployment
└── README.md
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/users/register` | Register a new user |
| `POST` | `/api/users/login` | Login and receive JWT |
| `POST` | `/api/users/forgot-password` | Request password reset |
| `PUT` | `/api/users/reset-password/:token` | Reset password |
| `GET` | `/api/users/profile` | Get current user profile |
| `PUT` | `/api/users/profile` | Update profile |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products (paginated, filterable, sortable) |
| `GET` | `/api/products/:id` | Get product details |
| `GET` | `/api/products/facets` | Get filter facets (categories, price range) |
| `POST` | `/api/products` | Create product (admin) |
| `PUT` | `/api/products/:id` | Update product (admin) |
| `DELETE` | `/api/products/:id` | Delete product (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Place a new order |
| `GET` | `/api/orders/mine` | Get current user's orders |
| `GET` | `/api/orders/:id` | Get order details |
| `PUT` | `/api/orders/:id/status` | Update order status (admin) |
| `PUT` | `/api/orders/:id/cancel` | Cancel an order |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payment/config` | Get Razorpay public key |
| `POST` | `/api/payment/create` | Create payment order |
| `POST` | `/api/payment/verify` | Verify payment signature |

### Coupons
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/coupons/public` | List active public coupons |
| `POST` | `/api/coupons/validate` | Validate a coupon code |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Service health check |

---

## Security

This application implements multiple layers of security:

- **Authentication:** JWT tokens with configurable expiry and password-change revocation
- **Authorization:** Role-based access control (customer/admin) on all protected routes
- **Input Sanitization:** All inputs validated and sanitized against NoSQL operator injection
- **Rate Limiting:** Distributed rate limiting via MongoDB (survives horizontal scaling)
- **Security Headers:** Helmet with CSP, HSTS, X-Frame-Options, Permissions-Policy
- **Payment Security:** Server-side amount verification, webhook signature validation
- **Inventory Integrity:** Multi-document transactions prevent overselling
- **Password Security:** bcrypt hashing with automatic salt rounds
- **Environment Safety:** Server refuses to boot with weak/example JWT secrets

> **Responsible Disclosure:** If you find a security vulnerability, please email [rksareecenter32@gmail.com](mailto:rksareecenter32@gmail.com) instead of opening a public issue.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All backend tests pass (`npm test` — 286/286)
- Frontend lint is clean (`npm run lint` — 0 errors)
- Frontend builds successfully (`npm run build`)

---

## License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

## Contact

**RK Saree Center & Fashion Hub**

| Channel | Details |
|---------|---------|
| 📧 Email | [rksareecenter32@gmail.com](mailto:rksareecenter32@gmail.com) |
| 📍 Location | Yogapatti Main Road, Yogapatti, Bihar 845452, India |
| 🌐 Website | [rksareefashionhub.com](https://rksareefashionhub.com) |

---

<p align="center">
  Built with ❤️ for Indian ethnic wear retail
</p>
