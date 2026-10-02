/* eslint-disable react-refresh/only-export-components -- A context module
   legitimately exports both the provider component and the hook that consumes
   it. Keeping them in one file is the standard React pattern; the other
   non-component exports here are constants, so fast refresh is unaffected. */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { readCart, writeCart } from "../utils/storage";

const CartContext = createContext(null);

/** Hard ceiling per line, mirroring the server's own limit. */
const MAX_QTY = 10;

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => readCart());

  useEffect(() => {
    writeCart(cartItems);
  }, [cartItems]);

  /** Stable identity for a line: same product + same size is the same line. */
  const lineKey = useCallback(
    (productId, size = "", color = "") => `${productId}_${size}_${color}`,
    []
  );

  const stockOf = useCallback((product) => {
    const raw = Number(product?.countInStock ?? 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, []);

  /**
   * Add to cart.
   *
   * Returns a result object instead of throwing so callers can show an accurate
   * message. Quantity is clamped to available stock here rather than at the
   * checkout button — previously a shopper could add 99 of a 3-in-stock item and
   * only discover it as a failed order.
   */
  const addToCart = useCallback(
    (product, qty = 1, size = "", color = "", options = {}) => {
      const available = stockOf(product);
      const want = Math.max(1, Number.parseInt(qty, 10) || 1);

      if (available <= 0) {
        return { ok: false, reason: "out_of_stock" };
      }

      const key = lineKey(product._id, size, color);

      let result = { ok: true, key, qty: want };

      setCartItems((prev) => {
        const existing = prev.find((x) => x.cartKey === key);
        const cap = Math.min(available, MAX_QTY);
        const nextQty = Math.min((existing?.qty || 0) + want, cap);

        if (existing && existing.qty >= cap) {
          result = { ok: false, reason: "max_stock", available: cap, key };
          return prev;
        }

        if (existing) {
          return prev.map((x) => (x.cartKey === key ? { ...x, qty: nextQty, customServices: options.customServices || x.customServices } : x));
        }

        // Snapshot only what the cart and order summary need. Persisting the
        // whole product document bloats localStorage and is a common source of
        // quota errors on low-end phones.
        return [
          ...prev,
          {
            _id: product._id,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image,
            countInStock: available,
            category: product.category,
            subcategory: product.subcategory,
            qty: nextQty,
            size: size || "",
            color: color || "",
            customServices: options.customServices || null,
            cartKey: key,
          },
        ];
      });

      return result;
    },
    [lineKey, stockOf]
  );

  const removeFromCart = useCallback((cartKey) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  }, []);

  const updateQty = useCallback((cartKey, qty) => {
    const next = Number.parseInt(qty, 10);
    if (!Number.isFinite(next) || next <= 0) {
      setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const cap = Math.min(
          Math.max(1, Number(item.countInStock) || MAX_QTY),
          MAX_QTY
        );
        return { ...item, qty: Math.min(next, cap) };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    writeCart([]);
  }, []);

  const cartItemCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [cartItems]
  );

  /** Subtotal uses the DISCOUNTED price so the cart total matches the PDP. */
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
        0
      ),
    [cartItems]
  );

  /**
   * Any line whose stock has since dropped to zero. Shown as a blocking warning
   * at checkout rather than discovered as a failed order.
   */
  const outOfStockItems = useMemo(
    () => cartItems.filter((item) => (Number(item.countInStock) || 0) < (item.qty || 1)),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      cartItemCount,
      cartTotal,
      outOfStockItems,
      lineKey,
      maxQty: MAX_QTY,
    }),
    [
      cartItems,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      cartItemCount,
      cartTotal,
      outOfStockItems,
      lineKey,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};

export { MAX_QTY };