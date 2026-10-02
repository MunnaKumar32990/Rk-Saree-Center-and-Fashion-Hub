import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";

import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AnnouncementBanner from "./components/AnnouncementBanner";
import WhatsAppButton from "./components/WhatsAppButton";
import { PageLoader } from "./components/Loader";
import RouteFallback from "./components/RouteFallback";

// ── Critical pages ───────────────────────────────────────────────────────────
import Home from "./pages/Home";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminRoute from "./components/AdminRoute";

// ── Lazy pages ───────────────────────────────────────────────────────────────
const Profile = lazy(() => import("./pages/Profile"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TwoFactorAuth = lazy(() => import("./pages/TwoFactorAuth"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PlaceOrder = lazy(() => import("./pages/PlaceOrder"));
const Payment = lazy(() => import("./pages/Payment"));
const Success = lazy(() => import("./pages/Success"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Returns = lazy(() => import("./pages/Returns"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ── Admin (always lazy — heaviest) ───────────────────────────────────────────
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./admin/AdminProduct"));
const AdminAddProduct = lazy(() => import("./admin/AdminAddProduct"));
const AdminEditProduct = lazy(() => import("./admin/AdminEditProduct"));
const AdminOrders = lazy(() => import("./admin/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./admin/AdminOrderDetails"));
const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./admin/AdminCoupons"));
const AdminAnnouncements = lazy(() => import("./admin/AdminAnnouncements"));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * Listen for the session-expiry event raised by the axios interceptor so the
 * user gets an explanation rather than silently landing on a bare login page.
 */
const SessionExpiryListener = () => {
  useEffect(() => {
    const onExpired = () => {
      import("react-hot-toast").then(({ default: toast }) => {
        toast("Your session expired — please sign in again to continue. Your cart is safe.", {
          icon: "🔒",
          duration: 6000,
        });
      });
    };
    window.addEventListener("auth:session-expired", onExpired);
    return () => window.removeEventListener("auth:session-expired", onExpired);
  }, []);
  return null;
};

/**
 * Analytics.
 *
 * Both scripts are built with `document.createElement` and injected as script
 * *src*, not inlined strings, so nothing evaluates script content from a
 * variable. The original built a `<script>` and assigned `innerHTML`, which
 * would execute as soon as the ID landed in the document.
 */
const useAnalytics = () => {
  useEffect(() => {
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    const pixelId = import.meta.env.VITE_META_PIXEL_ID;

    if (gaId && !document.getElementById("google-analytics-script")) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", gaId);

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      script.id = "google-analytics-script";
      script.onerror = () => console.warn("[analytics] GA failed to load");
      document.head.appendChild(script);
    }

    if (pixelId && !document.getElementById("meta-pixel-script")) {
       
      window.fbq = window.fbq || function () {
        (window.fbq.q = window.fbq.q || []).push(arguments);
      };
      window.fbq.loaded = true;
      window.fbq.version = "2.0";
      window.fbq("init", pixelId);
      window.fbq("track", "PageView");
       

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.id = "meta-pixel-script";
      script.onerror = () => console.warn("[analytics] Meta Pixel failed to load");
      document.head.appendChild(script);
    }
  }, []);
};

/**
 * Route guard. Uses AuthContext so it stays in sync across tabs, and passes the
 * originating location so login can return the customer to exactly where they
 * were — rather than dumping them on the home page and losing their cart flow.
 */
const PrivateRoute = ({ children }) => {
  const { userInfo } = useAuth();
  const location = useLocation();

  if (!userInfo?.token) {
    return <RouteFallback to="/login" state={{ from: location }} />;
  }
  return children;
};

const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-3 focus:left-3 focus:px-5 focus:py-3 focus:bg-teal-700 focus:text-white focus:rounded-lg focus:font-semibold"
      >
        Skip to main content
      </a>

      <AnnouncementBanner />
      <Header />

      <main id="main-content" className="flex-grow" tabIndex={-1}>
        <ErrorBoundary resetKeys={[location.pathname]}>
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
              <Route path="/returns" element={<Returns />} />
              <Route path="/size-guide" element={<SizeGuide />} />
              <Route path="/search" element={<Category />} />
              <Route path="/offers" element={<Category />} />

              {/* Private */}
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/myorders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
              {/* Aliases so older bookmarks and shared links keep working. */}
              <Route path="/orders" element={<PrivateRoute><MyOrders /></PrivateRoute>} />
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

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

const App = () => {
  useAnalytics();

  return (
    <Router>
      <ScrollToTop />
      <SessionExpiryListener />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppLayout />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: "12px",
                  fontSize: "14px",
                  maxWidth: "92vw",
                  padding: "12px 16px",
                },
              }}
            />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;