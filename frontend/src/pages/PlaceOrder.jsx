import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

const PlaceOrder = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const shippingAddress = JSON.parse(localStorage.getItem("shippingAddress"));

  const itemsPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const shippingPrice = itemsPrice > 2000 ? 0 : 100;
  const totalPrice = itemsPrice + shippingPrice;

  const placeOrderHandler = async () => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const { data } = await api.post(
      "/orders",
      {
        orderItems: cartItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          image: item.image,
          price: item.price,
          product: item._id,
        })),
        shippingAddress,
        paymentMethod: "Razorpay",
        itemsPrice,
        shippingPrice,
        totalPrice,
      },
      {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      }
    );

    navigate(`/payment/${data._id}`);
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Order Summary</h2>
      <p>Items: ₹{itemsPrice}</p>
      <p>Shipping: ₹{shippingPrice}</p>
      <h3>Total: ₹{totalPrice}</h3>

      <button onClick={placeOrderHandler}>Place Order</button>
    </div>
  );
};

export default PlaceOrder;
