import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";


const Cart = () => {
  const { cartItems, removeFromCart, updateQty } = useCart();

  const navigate = useNavigate();
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div style={{ padding: "30px" }}>
        <h2>Your cart is empty</h2>
        <Link to="/">Go Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>Shopping Cart</h2>

      {cartItems.map((item) => (
        <div key={item._id} style={styles.item}>
          <img src={item.image} alt={item.name} style={styles.image} />

          <div style={{ flex: 1 }}>
            <h4>{item.name}</h4>
            <p>₹{item.price}</p>
          </div>

          <select
            value={item.qty}
            onChange={(e) =>
              updateQty(item._id, Number(e.target.value))
            }
          >
            {[...Array(10).keys()].map((x) => (
              <option key={x + 1} value={x + 1}>
                {x + 1}
              </option>
            ))}
          </select>

          <button
            onClick={() => removeFromCart(item._id)}
            style={styles.remove}
          >
            Remove
          </button>
        </div>
      ))}

      <h3>Total: ₹{totalPrice}</h3>

      <button style={styles.checkout} onClick={() => navigate("/checkout")}>
  Proceed to Checkout
</button>

    </div>
  );
};

const styles = {
  item: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    borderBottom: "1px solid #ddd",
    padding: "15px 0",
  },
  image: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
  },
  remove: {
    background: "red",
    color: "#fff",
    border: "none",
    padding: "5px 10px",
    cursor: "pointer",
  },
  checkout: {
    marginTop: "20px",
    padding: "12px 20px",
    background: "#111",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
};

export default Cart;
