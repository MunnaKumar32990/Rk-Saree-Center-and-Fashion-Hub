import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import { SkeletonCard } from "../components/Loader";
import { FiArrowRight, FiStar, FiTruck, FiShield, FiRefreshCw } from "react-icons/fi";

const CATEGORIES = [
  { name: "Women", emoji: "👗", color: "from-pink-500 to-rose-500", desc: "Ethnic & Western" },
  { name: "Men", emoji: "👔", color: "from-blue-500 to-indigo-600", desc: "Formal & Casual" },
  { name: "Kids", emoji: "🧒", color: "from-yellow-400 to-orange-500", desc: "Fun & Comfortable" },
  { name: "Sarees", emoji: "🥻", color: "from-purple-500 to-violet-600", desc: "Traditional Beauty" },
  { name: "Kurtis", emoji: "✨", color: "from-green-500 to-teal-600", desc: "Everyday Elegance" },
  { name: "Lehengas", emoji: "💃", color: "from-red-500 to-pink-600", desc: "Festive Collection" },
];

const FEATURES = [
  { icon: FiTruck, title: "Free Delivery", desc: "On orders above ₹2,000" },
  { icon: FiShield, title: "Secure Payments", desc: "100% secure checkout" },
  { icon: FiRefreshCw, title: "Easy Returns", desc: "7-day return policy" },
  { icon: FiStar, title: "Quality Assured", desc: "Premium selected fabrics" },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [allRes, topRes] = await Promise.all([
          api.get("/products?limit=8&sort=newest"),
          api.get("/products?featured=true&limit=4"),
        ]);
        setProducts(allRes.data.products || allRes.data);
        setFeatured(topRes.data.products || topRes.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="bg-brand-bg">
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[85vh] flex items-center bg-gradient-hero">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-left">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse2" />
              <span className="text-white/80 text-sm font-medium">New Collection 2025</span>
            </div>

            <h1 className="font-outfit text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
              Dress to
              <br />
              <span className="bg-gradient-to-r from-primary-300 to-accent-300 bg-clip-text text-transparent">
                Impress
              </span>
            </h1>

            <p className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
              Discover our exquisite collection of sarees, ethnic wear & modern fashion.
              Premium quality, timeless style.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/category/Women"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold px-8 py-4 rounded-2xl hover:shadow-float transition-all hover:scale-105 active:scale-95"
              >
                Shop Women <FiArrowRight />
              </Link>
              <Link
                to="/category/Sarees"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all"
              >
                Explore Sarees
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div>
                <p className="font-outfit font-bold text-3xl text-white">500+</p>
                <p className="text-gray-400 text-sm">Products</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="font-outfit font-bold text-3xl text-white">10K+</p>
                <p className="text-gray-400 text-sm">Happy Customers</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="font-outfit font-bold text-3xl text-white">4.8★</p>
                <p className="text-gray-400 text-sm">Rating</p>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="hidden lg:block animate-fade-right">
            <div className="relative">
              <div className="w-full h-[500px] bg-gradient-to-br from-primary-500/30 to-accent-500/30 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <div className="text-8xl mb-4">🥻</div>
                  <p className="font-outfit text-2xl font-bold text-white">Premium Fashion</p>
                  <p className="text-gray-300 mt-2">Curated for you</p>
                </div>
              </div>
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-brand-lg p-4 animate-scale-in">
                <p className="text-xs font-semibold text-gray-500">TODAY'S OFFER</p>
                <p className="font-outfit font-bold text-gray-900">Up to 40% OFF</p>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-brand-lg p-4 animate-scale-in" style={{ animationDelay: "0.2s" }}>
                <p className="text-xs font-semibold text-gray-500">FREE DELIVERY</p>
                <p className="font-outfit font-bold text-gray-900">Orders ₹2,000+</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ──────────────────────────────────────────────── */}
      <div className="bg-primary-600 py-3 overflow-hidden">
        <div className="marquee-container">
          <div className="marquee-inner text-white text-sm font-medium">
            {Array(3).fill("✦ Free delivery on orders above ₹2,000 &nbsp;&nbsp; ✦ New arrivals every week &nbsp;&nbsp; ✦ Use code WELCOME10 for 10% off first order &nbsp;&nbsp; ✦ Premium quality fabrics &nbsp;&nbsp; ✦ Easy returns in 7 days &nbsp;&nbsp;").join("")}
          </div>
        </div>
      </div>

      {/* ── Features Strip ───────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-outfit font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Shop by Category
          </h2>
          <p className="text-gray-500">Find exactly what you're looking for</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.name}
              to={`/category/${cat.name}`}
              className="group animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:border-primary-200 hover:shadow-brand transition-all hover:-translate-y-1.5 duration-300">
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                  {cat.emoji}
                </div>
                <p className="font-outfit font-bold text-gray-900 text-sm">{cat.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Latest Products ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-outfit text-3xl sm:text-4xl font-bold text-gray-900">
              Latest Arrivals
            </h2>
            <p className="text-gray-500 mt-1">Fresh styles just for you</p>
          </div>
          <Link
            to="/category/Women"
            className="hidden sm:flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 text-sm group"
          >
            View All <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p, i) => <ProductCard key={p._id} product={p} delay={i * 60} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="font-outfit text-xl font-semibold text-gray-600 mb-2">No products yet</h3>
            <p className="text-sm">Check back soon for new arrivals!</p>
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/category/Women"
            className="inline-flex items-center gap-2 border-2 border-primary-500 text-primary-600 font-semibold px-8 py-3 rounded-2xl hover:bg-primary-500 hover:text-white transition-all"
          >
            Explore All Products <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* ── Promo Banner ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-gradient-to-r from-brand-dark to-primary-900 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-primary-300 font-semibold text-sm uppercase tracking-widest mb-3">Limited Time Offer</p>
            <h2 className="font-outfit text-3xl sm:text-5xl font-black text-white mb-4">
              Get 10% Off Your
              <span className="text-accent-400"> First Order</span>
            </h2>
            <p className="text-gray-300 mb-8 text-lg">Use code <span className="bg-white/15 border border-white/20 px-3 py-1 rounded-lg font-mono font-bold text-white">WELCOME10</span> at checkout</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold px-8 py-4 rounded-2xl hover:shadow-float transition-all hover:scale-105"
            >
              Create Account & Save <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;