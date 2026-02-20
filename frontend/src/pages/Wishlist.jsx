import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import api from "../services/api";
import { PageLoader } from "../components/Loader";
import ProductCard from "../components/ProductCard";
import { FiHeart, FiTrash2 } from "react-icons/fi";

const Wishlist = () => {
    const { userInfo } = useAuth();
    const { wishlist, fetchWishlist, removeFromWishlist } = useWishlist();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchWishlist();
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        // wishlist is an array of product objects or ids
        if (wishlist.length > 0 && typeof wishlist[0] === "object") {
            setProducts(wishlist);
        }
    }, [wishlist]);

    if (loading) return <PageLoader text="Loading wishlist..." />;

    return (
        <div className="min-h-screen bg-brand-bg">
            <div className="bg-gradient-to-r from-brand-dark to-primary-900 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <FiHeart className="w-6 h-6 text-accent-400" />
                        <h1 className="font-outfit text-3xl font-bold text-white">My Wishlist</h1>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{products.length} saved items</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {products.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="text-7xl mb-4">🤍</div>
                        <h2 className="font-outfit text-2xl font-bold text-gray-800 mb-3">Your wishlist is empty</h2>
                        <p className="text-gray-500 mb-6">Save items you love for later</p>
                        <Link to="/category/Women" className="inline-block bg-primary-600 text-white font-bold px-8 py-3 rounded-2xl hover:bg-primary-700 transition-all">
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {products.map((p, i) => (
                            <ProductCard key={p._id} product={p} delay={i * 60} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
