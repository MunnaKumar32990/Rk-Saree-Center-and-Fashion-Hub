import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/checkout";
import PlaceOrder from "./pages/PlaceOrder";
import Payment from "./pages/Payment";
import Success from "./pages/Success";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./admin/AdminDashboard";
import Login from "./pages/Login";
import AdminProducts from "./admin/AdminProduct";
import AdminAddProduct from "./admin/AdminAddProduct";
import AdminEditProduct from "./admin/AdminEditProduct";
import AdminOrders from "./admin/AdminOrders";
import MyOrders from "./pages/MyOrders";
import Register from "./pages/Register";
import PrivateRoute from "./components/PrivateRoute";
import OrderDetails from "./pages/OrderDetails";
import AdminUsers from "./admin/AdminUsers";
import Profile from "./pages/Profile";
import ContactUs from "./pages/ContactUs";
import ShippingInfo from "./pages/ShippingInfo";

const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/category/:categoryName" element={<Category />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/placeorder" element={<PlaceOrder />} />
        <Route path="/payment/:orderId" element={<Payment />} />
        <Route path="/success" element={<Success />} />
        <Route path="/register" element={<Register />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/shipping" element={<ShippingInfo />} />

        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />
        <Route
  path="/admin/products/add"
  element={
    <AdminRoute>
      <AdminAddProduct />
    </AdminRoute>
  }
/>
<Route
  path="/admin/products/:id/edit"
  element={
    <AdminRoute>
      <AdminEditProduct />
    </AdminRoute>
  }
/>
<Route
  path="/admin/orders"
  element={
    <AdminRoute>
      <AdminOrders />
    </AdminRoute>
  }
/>
<Route
  path="/myorders"
  element={
    <PrivateRoute>
      <MyOrders />
    </PrivateRoute>
  }
/>

<Route
  path="/checkout"
  element={
    <PrivateRoute>
      <Checkout />
    </PrivateRoute>
  }
/>
<Route
  path="/order/:id"
  element={
    <PrivateRoute>
      <OrderDetails />
    </PrivateRoute>
  }
/>

<Route
  path="/admin/users"
  element={
    <AdminRoute>
      <AdminUsers />
    </AdminRoute>
  }
/>
<Route
  path="/profile"
  element={
    <PrivateRoute>
      <Profile />
    </PrivateRoute>
  }
/>

        <Route path="/login" element={<Login />} />


          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
