# 🛍️ RK Saree & Fashion Hub

A **production-grade, full-stack e-commerce platform** built for RK Saree Center — a family-owned clothing showroom. Designed to compete with modern fashion e-commerce stores with a premium UI, robust admin panel, and real business features.

🌐 **Live Site:** [https://rk-saree-center-and-fashion-hub.vercel.app](https://rk-saree-center-and-fashion-hub.vercel.app)

---

## 📋 Table of Contents

- [Project Status](#-project-status)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Local Development Setup](#-local-development-setup)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Deployment](#-deployment)
- [Security](#-security)
- [Author](#-author)

---

## ✅ Project Status

All three planned phases of improvements are **complete**. Below is a summary:

### Phase 1 — Critical Fixes ✅
- Fixed HTML entry point with correct title, favicon, and meta tags
- Per-page SEO using `react-helmet-async` (Home, Category, ProductDetails, Login, Cart)
- Fixed broken search — keyword from URL params
- Centralized shipping/pricing logic in `utils/pricing.js`
- Server-side order price validation (security hardening)
- Require current password for profile password change
- Color swatch selector on Product Detail page
- Fixed Footer social links & newsletter → WhatsApp CTA
- Created real Privacy Policy + Terms of Service pages
- Replaced hardcoded fake testimonials with real dynamic stats
- Removed public `/check-status` debug endpoint
- Added `robots.txt` to public folder

### Phase 2 — Business Features ✅
- **Cash on Delivery (COD)** — payment method selector + backend COD order handling
- **Lazy loading** — `React.lazy()` + `Suspense` for all pages & admin code split
- **URL-synced filters** — subcategory and color filters stored in URL params
- **Color filter swatches** in sidebar (premium circular color picker)
- **WhatsApp floating button** — animated, pulsing tooltip, hidden on admin pages
- **Size guide modal** — clothing + saree tabs, measurement tables, WhatsApp CTA
- **Customer order cancellation** — backend + frontend confirm dialog
- **Notify Me** — email capture + WhatsApp fallback for out-of-stock products
- **Cloudinary image optimization** — applied to ProductCard and ProductDetails
- **Image alt texts** — `productAlt()` utility for SEO-friendly image descriptions
- **Invoice PDF download** — jsPDF-powered invoice generation in OrderDetails
- **Recently Viewed products** — localStorage persistence with a reusable hook
- **PWA Manifest** — `manifest.json` linked in `index.html`
- **Vite manual chunking** — `vendor-react`, `vendor-ui`, `vendor-pdf` code splits

### Phase 3 — Conversion & Growth ✅
- **Breadcrumb JSON-LD + Product Schema** — structured data for Google rich results
- **Out-of-Stock overlay** on product cards
- **Subcategory + Color active filter chips** — removable chips above product grid
- **Share product button** — Web Share API with WhatsApp fallback
- **Admin: Colors/Sizes fields** in Add/Edit product form (properly saved to database)
- **Admin: COD auto-paid** — marking a COD order as Delivered automatically marks it Paid
- **Google Analytics + Meta Pixel** — dynamic injection via environment variables
- **Sitemap.xml** — dynamically generated XML sitemap for all products and categories
- **Custom 404 page** — branded design with WhatsApp help CTA and quick links

### Deployment ✅
- Backend deployed on **Render**
- Frontend deployed on **Vercel**
- SPA routing configured via `vercel.json`
- CORS whitelist updated with Vercel production URL
- Linux case-sensitivity fix (`User.js` model rename)

---

## ✨ Features

### 🧑‍💼 Customer Features
| Feature | Details |
|---|---|
| 🔐 Authentication | Register, login, email verification, 2FA, forgot/reset password |
| 🛒 Shopping Cart | Add/update/remove items, real-time price updates, persistent across sessions |
| ❤️ Wishlist | Save products for later, quick add-to-cart |
| 🔍 Search & Filters | Keyword search, category, subcategory, color, size, price range, rating — all URL-synced |
| 📦 Order Tracking | Place orders, view status timeline, download invoice PDF |
| 💵 COD Support | Choose Cash on Delivery at checkout |
| 💳 Razorpay Payments | Secure online payment gateway integration |
| 🎟️ Coupon Codes | Apply discount codes at checkout |
| 🔔 Notify Me | Capture email for restocked products |
| 🕐 Recently Viewed | Track and display last-viewed products |
| ↩️ Order Cancellation | Cancel eligible orders from order history |
| 📄 Invoice Download | Generate and download order invoice as PDF |
| 📐 Size Guide | Pop-up guide with clothing and saree measurement tables |
| 📲 WhatsApp | Floating CTA button and fallback for all actions |
| 📢 Share Product | Native share API with WhatsApp fallback |
| 🗺️ Location Widget | Detect delivery location via GPS |

### 🛠️ Admin Features
| Feature | Details |
|---|---|
| 📊 Dashboard | Revenue, orders, users, monthly sales chart |
| 📦 Product Management | Add/edit/delete products with images, sizes, colors, discounts |
| 🛍️ Order Management | Update status, bulk update, tracking info, auto-mark COD as paid |
| 👥 User Management | View customer accounts, promote to admin |
| 🎟️ Coupon Management | Create and manage discount coupons |
| 📢 Announcements | Promotional banners with scheduling |
| ↩️ Returns Management | Handle return requests and refunds |
| 📤 Export CSV | Download orders as CSV for accounting |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI library & build tool |
| React Router DOM | Client-side routing |
| Tailwind CSS | Utility-first styling |
| Axios | HTTP client for API calls |
| react-helmet-async | Per-page SEO meta tags |
| React Hot Toast | Toast notifications |
| Recharts | Admin analytics charts |
| React Icons | Icon library (Feather icons) |
| jsPDF | Invoice PDF generation |
| Cloudinary | CDN image delivery & optimization |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | Server & API framework |
| MongoDB + Mongoose | Database & ODM |
| JWT | Authentication tokens |
| Bcryptjs | Password hashing |
| Nodemailer | Transactional emails |
| Razorpay | Payment gateway |
| Cloudinary + Multer | Image upload & storage |
| Helmet | Security headers |
| express-rate-limit | Brute-force protection |
| Morgan | HTTP request logging |
| CORS | Cross-origin request handling |

---

## 📁 Project Structure

```
rk-saree-fashion-hub/
├── backend/
│   ├── src/
│   │   ├── config/              # DB connection, Cloudinary config
│   │   ├── controllers/         # Route handlers
│   │   │   ├── userController.js
│   │   │   ├── productController.js  # includes getSitemap
│   │   │   ├── orderController.js    # COD auto-paid logic
│   │   │   ├── couponController.js
│   │   │   ├── announcementController.js
│   │   │   └── paymentController.js
│   │   ├── middlewares/         # Auth, error handling
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── Order.js
│   │   │   ├── Coupon.js
│   │   │   ├── Announcement.js
│   │   │   └── ReturnRequest.js
│   │   ├── routes/
│   │   └── utils/
│   │       ├── asyncHandler.js
│   │       ├── coupons.js
│   │       └── sendEmail.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   ├── robots.txt
    │   └── manifest.json
    ├── src/
    │   ├── admin/               # Admin panel pages
    │   ├── components/          # Reusable UI components
    │   │   ├── Header.jsx
    │   │   ├── Footer.jsx
    │   │   ├── FilterSidebar.jsx      # Color + subcategory filters
    │   │   ├── WhatsAppButton.jsx
    │   │   ├── SizeGuideModal.jsx
    │   │   ├── RecentlyViewed.jsx
    │   │   └── AnnouncementBanner.jsx
    │   ├── context/             # Auth, Cart, Wishlist context
    │   ├── hooks/               # useDebounce, useRecentlyViewed
    │   ├── pages/               # All page components
    │   │   ├── Home.jsx
    │   │   ├── Category.jsx           # URL-synced filters
    │   │   ├── ProductDetails.jsx
    │   │   ├── Cart.jsx
    │   │   ├── NotFound.jsx           # Custom 404
    │   │   ├── PrivacyPolicy.jsx
    │   │   └── TermsOfService.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── utils/
    │   │   ├── pricing.js             # Centralized shipping logic
    │   │   └── cloudinary.js          # Image optimization helpers
    │   ├── App.jsx                    # GA + Meta Pixel injection
    │   └── main.jsx
    ├── vercel.json                    # SPA routing rewrites
    ├── .env.example
    └── vite.config.js                 # Manual chunk splitting
```

---

## 🏃 Local Development Setup

### Prerequisites
- **Node.js** v18+
- **npm**
- **MongoDB Atlas** account (or local MongoDB)

### 1. Clone the repository
```bash
git clone https://github.com/MunnaKumar32990/Rk-Saree-Center-and-Fashion-Hub.git
cd Rk-Saree-Center-and-Fashion-Hub
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install --legacy-peer-deps
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your API URL
```

### 5. Run Both Servers
```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/rk-saree-db

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Razorpay
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_SECRET=your_razorpay_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Gmail with App Password)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# CORS — your deployed frontend URL
FRONTEND_URL=https://rk-saree-center-and-fashion-hub.vercel.app
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api

# Optional: Analytics
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_META_PIXEL_ID=XXXXXXXXXXXXXXXXX
```

---

## 📡 API Endpoints

### Authentication
| Method | Route | Description |
|---|---|---|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | User login |
| GET | `/api/users/verify-email/:token` | Verify email |
| POST | `/api/users/forgot-password` | Request password reset |
| POST | `/api/users/reset-password/:token` | Reset password |

### Products
| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | Get products (keyword, category, subcategory, color, size, price, rating, sort, page) |
| GET | `/api/products/top` | Get top-rated products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (Admin) |
| PUT | `/api/products/:id` | Update product (Admin) |
| DELETE | `/api/products/:id` | Delete product (Admin) |
| POST | `/api/products/:id/reviews` | Add review (Auth) |
| GET | `/sitemap.xml` | Dynamic XML sitemap |

### Orders
| Method | Route | Description |
|---|---|---|
| POST | `/api/orders` | Create order |
| GET | `/api/orders/myorders` | My orders |
| GET | `/api/orders/:id` | Order details |
| PUT | `/api/orders/:id/pay` | Mark paid (Razorpay) |
| PUT | `/api/orders/:id/deliver` | Mark delivered (Admin) |
| PUT | `/api/orders/:id/status` | Update status (Admin) |
| PUT | `/api/orders/:id/cancel` | Cancel order (Customer) |
| PUT | `/api/orders/bulk-status` | Bulk update status (Admin) |
| GET | `/api/orders/stats` | Dashboard stats (Admin) |
| GET | `/api/orders/export-csv` | Export CSV (Admin) |

---

## 🚀 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://rk-saree-center-and-fashion-hub.vercel.app |
| Backend API | Render | https://rk-saree-center-and-fashion-hub.onrender.com |
| Database | MongoDB Atlas | Managed cloud cluster |
| Images | Cloudinary | CDN image delivery |

### Key Deployment Notes
- **Build Command (Render):** `npm install --legacy-peer-deps` (fixes Express 5 peer dep conflict)
- **Start Command (Render):** `npm run dev`
- **Root Directory (Vercel):** `frontend`
- **SPA Routing:** `frontend/vercel.json` rewrites all paths to `index.html`
- **CORS:** Vercel domain is whitelisted in `backend/src/server.js`

---

## 🔒 Security

- JWT-based authentication with HTTP-only principles
- Bcrypt password hashing
- Server-side price validation (cart totals cannot be manipulated)
- Express rate limiting on all routes (300/15min) and auth routes (20/15min)
- Helmet.js security headers
- CORS origin whitelist
- Email verification before account activation
- Optional Two-Factor Authentication (2FA)

---

## 👤 Author

**Munna Kumar** — Building this as a professional online presence for our family business, **RK Saree Center**.

- 📧 Email: rksareecenter32@gmail.com
- 🐙 GitHub: [MunnaKumar32990](https://github.com/MunnaKumar32990)

---

*Built with ❤️ for our family business. This project represents months of learning, building, and improving to create a market-ready e-commerce store for RK Saree & Fashion Hub.*
