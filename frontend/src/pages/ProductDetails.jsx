import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";


const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const { addToCart } = useCart();


  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
    };

    fetchProduct();
  }, [id]);

  if (!product) return <h3 style={{ padding: "30px" }}>Loading...</h3>;

  return (
    <div style={styles.container}>
      <img src={product.image} alt={product.name} style={styles.image} />

      <div>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <h3>₹{product.price}</h3>

        <button
  style={styles.button}
  onClick={() => addToCart(product, 1)}
>
  Add to Cart
</button>

      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    gap: "40px",
    padding: "30px",
  },
  image: {
    width: "350px",
    objectFit: "cover",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#111",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    marginTop: "15px",
  },
};

export default ProductDetails;
