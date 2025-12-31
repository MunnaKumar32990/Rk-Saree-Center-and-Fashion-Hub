import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems } = useCart();

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");

  const submitHandler = (e) => {
    e.preventDefault();

    localStorage.setItem(
      "shippingAddress",
      JSON.stringify({ address, city, postalCode, country, phone })
    );

    navigate("/placeorder");
  };

  if (cartItems.length === 0) {
    navigate("/");
    return null;
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>Shipping Address</h2>

      <form onSubmit={submitHandler} style={styles.form}>
        <input placeholder="Address" required onChange={(e) => setAddress(e.target.value)} />
        <input placeholder="City" required onChange={(e) => setCity(e.target.value)} />
        <input placeholder="Postal Code" required onChange={(e) => setPostalCode(e.target.value)} />
        <input placeholder="Phone" required onChange={(e) => setPhone(e.target.value)} />
        <button type="submit">Continue</button>
      </form>
    </div>
  );
};

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxWidth: "300px",
  },
};

export default Checkout;
