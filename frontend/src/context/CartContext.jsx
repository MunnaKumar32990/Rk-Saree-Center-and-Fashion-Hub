import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cartItems")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  // Add to cart (with size support)
  const addToCart = (product, qty = 1, size = "") => {
    const key = `${product._id}_${size}`;
    const existItem = cartItems.find((x) => x.cartKey === key);

    if (existItem) {
      setCartItems((prev) =>
        prev.map((x) =>
          x.cartKey === key ? { ...x, qty: x.qty + qty } : x
        )
      );
    } else {
      setCartItems((prev) => [...prev, { ...product, qty, size, cartKey: key }]);
    }
  };

  // Remove from cart
  const removeFromCart = (cartKey) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  // Update quantity
  const updateQty = (cartKey, qty) => {
    if (qty <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.cartKey === cartKey ? { ...item, qty } : item))
    );
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cartItems");
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        cartItemCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
