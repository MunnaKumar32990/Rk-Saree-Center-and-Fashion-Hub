import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Context Providers
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";

// Layout (always loaded — not lazy)
import Header from "./components/Header";
import Footer from "./components/Footer";
import AnnouncementBanner from "./components/AnnouncementBanner";
import WhatsAppButton from "./components/WhatsAppButton";
import { PageLoader } from "./components/Loader";

// ── Critical pages (loaded immediately) ────────────────────────────────────
import Home from "./pages/Home";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";

// ── Lazy pages (loaded on demand — reduces initial bundle) ──────────────────
const Profile = lazy(() => import("./pages/Profile"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TwoFactorAuth = lazy(() => import("./pages/TwoFactorAuth"));
const Checkout = lazy(() => import("./pages/checkout"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));
const Payment = lazy(() => import("./pages/Payment"));
const Success = lazy(() => import("./pages/Success"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ── Admin pages (heaviest — always lazy) ───────────────────────────────────
import AdminRoute from "./components/AdminRoute";
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./admin/AdminProduct"));
const AdminAddProduct = lazy(() => import("./admin/AdminAddProduct"));
const AdminEditProduct = lazy(() => import("./admin/AdminEditProduct"));
const AdminOrders = lazy(() => import("./admin/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./admin/AdminOrderDetails"));
const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./admin/AdminCoupons"));
const AdminAnnouncements = lazy(() => import("./admin/AdminAnnouncements"));

// Scroll to top on every route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Private Route Guard
const PrivateRoute = ({ children }) => {
  const { userInfo } = useAuth();
  return userInfo ? children : <Navigate to="/login" replace />;
};

// Main layout wrapper (needs to be inside Router for Header to use navigate)
const AppLayout = () => (
  <div className="flex flex-col min-h-screen">
    <AnnouncementBanner />
    <Header />
    <main className="flex-grow">
      <Suspense fallback={<PageLoader text="Loading..." />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/category/:categoryName" element={<Category />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/2fa" element={<TwoFactorAuth />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/shipping" element={<ShippingInfo />} />
          <Route path="/search" element={<Category />} />

          {/* Private */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/myorders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
          <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/placeorder" element={<PrivateRoute><PlaceOrder /></PrivateRoute>} />
          <Route path="/payment/:orderId" element={<PrivateRoute><Payment /></PrivateRoute>} />
          <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
          <Route path="/order/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
          <Route path="/admin/products/add" element={<AdminRoute><AdminAddProduct /></AdminRoute>} />
          <Route path="/admin/products/:id/edit" element={<AdminRoute><AdminEditProduct /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
          <Route path="/admin/orders/:id" element={<AdminRoute><AdminOrderDetails /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
          <Route path="/admin/announcements" element={<AdminRoute><AdminAnnouncements /></AdminRoute>} />

          {/* Legal */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
);

const App = () => (
  <Router>
    <ScrollToTop />
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppLayout />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "12px",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
              },
            }}
          />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </Router>
);

export default App;
