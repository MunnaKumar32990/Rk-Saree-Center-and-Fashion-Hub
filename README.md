# 🛍️ RK Saree & Fashion Hub

A full-stack e-commerce platform for saree and fashion products with advanced features including admin dashboard, payment integration, order management, and more.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Admin Features](#-admin-features)
- [Security Features](#-security-features)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Customer Features
- 🔐 **User Authentication** - Register, login, email verification, 2FA, password reset
- 🛒 **Shopping Cart** - Add, update, remove items with real-time updates
- ❤️ **Wishlist** - Save favorite products for later
- 🔍 **Product Search & Filter** - Search by name, filter by category, price range
- 📦 **Order Management** - Place orders, track status, view order history
- 💳 **Payment Integration** - Razorpay payment gateway integration
- 📧 **Email Notifications** - Order confirmations, shipping updates
- 👤 **User Profile** - Manage personal information and addresses
- 🎟️ **Coupon System** - Apply discount coupons at checkout
- 📱 **Responsive Design** - Mobile-friendly interface

### Admin Features
- 📊 **Dashboard** - Sales analytics, revenue charts, order statistics
- 📦 **Product Management** - Add, edit, delete products with image uploads
- 🛍️ **Order Management** - View, update order status, process returns
- 👥 **User Management** - View and manage customer accounts
- 🎟️ **Coupon Management** - Create and manage discount coupons
- 📢 **Announcements** - Display promotional banners
- 📈 **Analytics** - Sales reports and performance metrics

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **Recharts** - Data visualization
- **React Icons** - Icon library
- **jsPDF** - PDF generation

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Razorpay** - Payment gateway
- **Cloudinary** - Image storage
- **Multer** - File upload handling
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting
- **Morgan** - HTTP request logger
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
rk-saree-fashion-hub/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and service configurations
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Custom middleware (auth, error handling)
│   │   ├── models/          # Mongoose schemas
│   │   │   ├── user.js
│   │   │   ├── Product.js
│   │   │   ├── Order.js
│   │   │   ├── Coupon.js
│   │   │   ├── Announcement.js
│   │   │   └── ReturnRequest.js
│   │   ├── routes/          # API routes
│   │   │   ├── userRoutes.js
│   │   │   ├── productRoutes.js
│   │   │   ├── orderRoutes.js
│   │   │   ├── contactRoutes.js
│   │   │   ├── uploadRoutes.js
│   │   │   ├── paymentRoutes.js
│   │   │   ├── couponRoutes.js
│   │   │   └── announcementRoutes.js
│   │   ├── utils/           # Helper functions
│   │   └── server.js        # Entry point
│   ├── .env.example
│   ├── package.json
│   └── verifyExistingUsers.js
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── admin/           # Admin panel components
    │   │   ├── AdminDashboard.jsx
    │   │   ├── AdminProduct.jsx
    │   │   ├── AdminAddProduct.jsx
    │   │   ├── AdminEditProduct.jsx
    │   │   ├── AdminOrders.jsx
    │   │   ├── AdminOrderDetails.jsx
    │   │   ├── AdminUsers.jsx
    │   │   ├── AdminCoupons.jsx
    │   │   └── AdminAnnouncements.jsx
    │   ├── assets/          # Images, fonts, static files
    │   ├── components/      # Reusable components
    │   ├── context/         # React Context (Auth, Cart, Wishlist)
    │   ├── hooks/           # Custom React hooks
    │   ├── pages/           # Page components
    │   │   ├── Home.jsx
    │   │   ├── Category.jsx
    │   │   ├── ProductDetails.jsx
    │   │   ├── Cart.jsx
    │   │   ├── Checkout.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Profile.jsx
    │   │   ├── MyOrders.jsx
    │   │   ├── OrderDetails.jsx
    │   │   ├── Wishlist.jsx
    │   │   └── ContactUs.jsx
    │   ├── services/        # API service functions
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or MongoDB Atlas account)
- **Git**

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/rk-saree-fashion-hub.git
cd rk-saree-fashion-hub
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

## 🔐 Environment Variables

### Backend (.env)

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/rk-saree-db?retryWrites=true&w=majority

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# Razorpay (Payment Gateway)
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_SECRET=your_razorpay_secret_key_here

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
ADMIN_RECEIVER_EMAIL=admin@example.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
```

### Getting API Keys

1. **MongoDB Atlas**: [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. **Razorpay**: [https://dashboard.razorpay.com/app/keys](https://dashboard.razorpay.com/app/keys)
3. **Cloudinary**: [https://cloudinary.com/console](https://cloudinary.com/console)
4. **Gmail App Password**: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

## 🏃 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm run dev
```
Server runs on: `http://localhost:5000`

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### Production Mode

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Start Backend in Production
```bash
cd backend
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/verify-email/:token` - Verify email
- `POST /api/users/forgot-password` - Request password reset
- `POST /api/users/reset-password/:token` - Reset password
- `POST /api/users/2fa/enable` - Enable 2FA
- `POST /api/users/2fa/verify` - Verify 2FA code

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Products
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `POST /api/products/:id/reviews` - Add product review

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/myorders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/pay` - Update order to paid
- `PUT /api/orders/:id/deliver` - Update order to delivered (Admin)
- `GET /api/orders` - Get all orders (Admin)

### Payment
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment signature

### Coupons
- `GET /api/coupons` - Get all coupons
- `POST /api/coupons` - Create coupon (Admin)
- `POST /api/coupons/validate` - Validate coupon code
- `DELETE /api/coupons/:id` - Delete coupon (Admin)

### Announcements
- `GET /api/announcements` - Get active announcements
- `POST /api/announcements` - Create announcement (Admin)
- `PUT /api/announcements/:id` - Update announcement (Admin)
- `DELETE /api/announcements/:id` - Delete announcement (Admin)

### Contact
- `POST /api/contact` - Send contact form message

### Upload
- `POST /api/upload` - Upload image to Cloudinary

## 👨‍💼 Admin Features

### Access Admin Panel
Navigate to `/admin/dashboard` after logging in with admin credentials.

### Admin Capabilities
- View sales analytics and revenue charts
- Manage products (CRUD operations)
- Process and track orders
- Manage user accounts
- Create and manage discount coupons
- Post announcements and promotional banners
- Generate sales reports

### Creating Admin User
Run the following in MongoDB or use the verification script:
```javascript
// Update user role to admin
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt encryption for passwords
- **Rate Limiting** - Prevents brute force attacks
- **Helmet.js** - Sets security HTTP headers
- **CORS Protection** - Whitelist allowed origins
- **Input Validation** - Express-validator for request validation
- **XSS Protection** - Sanitizes user inputs
- **2FA Support** - Two-factor authentication option
- **Email Verification** - Confirms user email addresses

## 🎨 Key Features Implementation

### Cart Management
- Persistent cart using Context API
- Real-time price calculations
- Stock validation

### Wishlist
- Save products for later
- Quick add to cart from wishlist

### Order Processing
1. Add items to cart
2. Proceed to checkout
3. Enter shipping information
4. Apply coupon (optional)
5. Choose payment method
6. Complete payment via Razorpay
7. Receive order confirmation email

### Payment Flow
- Razorpay integration for secure payments
- Support for multiple payment methods
- Payment verification and order confirmation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👤 Author

**RK Saree Center**
- Email: rksareecenter32@gmail.com

## 🙏 Acknowledgments

- React and Node.js communities
- MongoDB Atlas for database hosting
- Cloudinary for image management
- Razorpay for payment processing

---

**Note**: This is a production-ready e-commerce platform. Ensure all environment variables are properly configured before deployment. For production deployment, consider using services like Vercel (frontend), Railway/Render (backend), and MongoDB Atlas (database).
