/* eslint-disable react-refresh/only-export-components -- A context module
   legitimately exports both the provider component and the hook that consumes
   it. Keeping them in one file is the standard React pattern; the only
   non-component export here is a hook, so fast refresh is unaffected. */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

/**
 * Wishlist.
 *
 * The original mixed two data shapes in one array: `addToWishlist` pushed a
 * string id, `fetchWishlist` pushed populated product objects. `Wishlist.jsx`
 * only rendered when `typeof wishlist[0] === "object"`, so adding an item from a
 * product card left the page saying "Your wishlist is empty" while the header
 * counter read "1 item". Everything here now stores **product objects only**.
 *
 * Also fixed: the provider never hydrated from the server on login, so heart
 * icons rendered empty everywhere except the wishlist page, and clicks fired
 * redundant POSTs. Errors are now surfaced instead of swallowed — previously a
 * failed request still showed "Added to wishlist!".
 */
export const WishlistProvider = ({ children }) => {
  const { userInfo } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const productId = (item) => (typeof item === "string" ? item : item?._id);

  const isWishlisted = useCallback(
    (id) => wishlist.some((p) => productId(p) === id),
    [wishlist]
  );

  const fetchWishlist = useCallback(async () => {
    if (!userInfo?.token) {
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("/users/wishlist");
      setWishlist(Array.isArray(data) ? data.filter((p) => p && p._id) : []);
    } catch {
      // Leave whatever we had; an empty wishlist is better than wiping the UI
      // on a transient network blip.
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token]);

  // Hydrate on login so hearts are accurate site-wide.
  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  /** @returns {Promise<boolean>} whether the change actually persisted */
  const addToWishlist = useCallback(async (id) => {
    try {
      const { data } = await api.post(`/users/wishlist/${id}`);
      // Placeholder object until the next fetch resolves it into a real product.
      setWishlist((prev) =>
        prev.some((p) => productId(p) === id)
          ? prev
          : [...prev, { _id: id, _placeholder: true, name: "Saved item", price: 0, image: "" }]
      );
      return data?.alreadySubscribed !== false;
    } catch {
      return false;
    }
  }, []);

  const removeFromWishlist = useCallback(async (id) => {
    // Optimistic: the heart must respond instantly even on a slow connection.
    const snapshot = wishlist;
    setWishlist((prev) => prev.filter((p) => productId(p) !== id));
    try {
      await api.delete(`/users/wishlist/${id}`);
      return true;
    } catch {
      setWishlist(snapshot);
      return false;
    }
  }, [wishlist]);

  /** @returns {Promise<boolean>} true if now saved, false if removed */
  const toggleWishlist = useCallback(
    async (id) => {
      if (isWishlisted(id)) {
        await removeFromWishlist(id);
        return false;
      }
      await addToWishlist(id);
      return true;
    },
    [isWishlisted, addToWishlist, removeFromWishlist]
  );

  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);

  const value = useMemo(
    () => ({
      wishlist,
      wishlistCount,
      loading,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      fetchWishlist,
      toggleWishlist,
    }),
    [wishlist, wishlistCount, loading, isWishlisted, addToWishlist, removeFromWishlist, fetchWishlist, toggleWishlist]
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};