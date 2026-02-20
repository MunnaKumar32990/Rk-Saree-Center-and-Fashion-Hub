import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
    const [wishlist, setWishlist] = useState([]);

    const isWishlisted = useCallback(
        (productId) => wishlist.some((p) => (p._id || p) === productId),
        [wishlist]
    );

    const addToWishlist = useCallback(async (productId) => {
        try {
            await api.post(`/users/wishlist/${productId}`);
            setWishlist((prev) => [...prev, productId]);
        } catch (err) {
            console.error("Wishlist add error:", err);
        }
    }, []);

    const removeFromWishlist = useCallback(async (productId) => {
        try {
            await api.delete(`/users/wishlist/${productId}`);
            setWishlist((prev) => prev.filter((p) => (p._id || p) !== productId));
        } catch (err) {
            console.error("Wishlist remove error:", err);
        }
    }, []);

    const fetchWishlist = useCallback(async () => {
        try {
            const { data } = await api.get("/users/wishlist");
            setWishlist(data);
        } catch {
            setWishlist([]);
        }
    }, []);

    const toggleWishlist = useCallback(
        async (productId) => {
            if (isWishlisted(productId)) {
                await removeFromWishlist(productId);
            } else {
                await addToWishlist(productId);
            }
        },
        [isWishlisted, addToWishlist, removeFromWishlist]
    );

    return (
        <WishlistContext.Provider
            value={{ wishlist, isWishlisted, addToWishlist, removeFromWishlist, fetchWishlist, toggleWishlist }}
        >
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) throw new Error("useWishlist must be used within WishlistProvider");
    return context;
};
