import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Context Providers
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";

// Layout
import Header from "./components/Header";
import Footer from "./components/Footer";

// Pages
import Home from "./pages/Home";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import MyOrders from "./pages/MyOrders";
import Wishlist from "./pages/Wishlist";

// Lazy-imported pages (optional future enhancement)
import Checkout from "./pages/checkout";
import PlaceOrder from "./pages/PlaceOrder";
import Payment from "./pages/Payment";
import Success from "./pages/Success";
import OrderDetails from "./pages/OrderDetails";
import ContactUs from "./pages/ContactUs";
import ShippingInfo from "./pages/ShippingInfo";

// Admin
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./admin/AdminDashboard";
import AdminProducts from "./admin/AdminProduct";
import AdminAddProduct from "./admin/AdminAddProduct";
import AdminEditProduct from "./admin/AdminEditProduct";
import AdminOrders from "./admin/AdminOrders";
import AdminUsers from "./admin/AdminUsers";

// Private Route Guard
const PrivateRoute = ({ children }) => {
  const { userInfo } = useAuth();
  return userInfo ? children : <Navigate to="/login" replace />;
};

// Main layout wrapper (needs to be inside Router for Header to use navigate)
const AppLayout = () => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-grow">
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryName" element={<Category />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <Footer />
  </div>
);

const App = () => (
  <Router>
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
