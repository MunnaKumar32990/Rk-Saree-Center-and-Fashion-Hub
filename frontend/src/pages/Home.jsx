import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import ProductCard from "../components/ProductCard";
import { SkeletonCard } from "../components/Loader";
import {
  FiArrowRight, FiStar, FiTruck, FiShield,
  FiRefreshCw, FiAward, FiZap, FiHeart
} from "react-icons/fi";

/* ─── Static data ─────────────────────────────────────────────── */
const CATEGORIES = [
  { name: "Women", emoji: "👗", color: "from-rose-400 to-pink-500", desc: "Ethnic & Western" },
  { name: "Men", emoji: "👔", color: "from-sky-400 to-blue-600", desc: "Formal & Casual" },
  { name: "Kids", emoji: "🧒", color: "from-yellow-400 to-orange-500", desc: "Fun & Comfortable" },
  { name: "Sarees", emoji: "🥻", color: "from-primary-400 to-primary-600", desc: "Traditional Beauty" },
  { name: "Kurtis", emoji: "✨", color: "from-teal-400 to-emerald-600", desc: "Everyday Elegance" },
  { name: "Lehengas", emoji: "💃", color: "from-accent-500 to-orange-500", desc: "Festive Collection" },
];

const FEATURES = [
  { icon: FiTruck, title: "Free Delivery", desc: "On orders above ₹2,000", color: "from-emerald-400 to-teal-500" },
  { icon: FiShield, title: "Secure Payments", desc: "100% secure checkout", color: "from-blue-400 to-sky-500" },
  { icon: FiRefreshCw, title: "Easy Returns", desc: "7-day return policy", color: "from-amber-400 to-orange-500" },
  { icon: FiStar, title: "Quality Assured", desc: "Premium selected fabrics", color: "from-pink-400 to-rose-500" },
];

const TESTIMONIALS = [
  { name: "Priya Sharma", loc: "Mumbai", rating: 5, text: "Absolutely stunning sarees! The quality is unmatched and delivery was super fast. Will definitely shop again!", avatar: "P" },
  { name: "Rekha Devi", loc: "Patna", rating: 5, text: "The lehenga I ordered for my daughter's wedding was exactly as described. Perfect fit and gorgeous fabric.", avatar: "R" },
  { name: "Anita Kumari", loc: "Delhi", rating: 5, text: "Best online saree store I've found. The colours are true to the photos and the packaging was beautiful.", avatar: "A" },
];

const STATS = [
  { value: "500+", label: "Products" },
  { value: "10K+", label: "Happy Customers" },
  { value: "4.8★", label: "Avg Rating" },
  { value: "7Days", label: "Easy Returns" },
];

/* ─── Scroll-reveal hook ──────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

/* ─── Animated counter ────────────────────────────────────────── */
function useCounter(target, duration = 1400, active = false) {
  const [val, setVal] = useState(0);
  // Check if the numeric part is a decimal (like "4.8") — skip animation for these
  const numericPart = target.replace(/[^\d.]/g, "");
  const isDecimal = numericPart.includes(".");
  useEffect(() => {
    if (!active || isDecimal) return;
    const end = parseInt(numericPart) || 0;
    if (!end) { setVal(target); return; }
    const step = Math.ceil(end / (duration / 16));
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, end);
      setVal(cur);
      if (cur >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration, isDecimal, numericPart]);
  return val || target;
}

function StatCounter({ value, label, delay = 0 }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.5 });
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const count = useCounter(value, 1400, active);
  const numericPart = value.replace(/[^\d.]/g, "");
  const isDecimal = numericPart.includes(".");
  const suffix = value.replace(/[\d.]/g, "");
  return (
    <div ref={ref} className="text-center reveal" style={{ transitionDelay: `${delay}ms` }}>
      <p className="font-outfit font-black text-3xl sm:text-4xl text-white">
        {/* Decimal values (e.g. 4.8★) render as-is; integers animate */}
        {isDecimal ? value : (active && typeof count === "number" ? `${count}${suffix}` : value)}
      </p>
      <p className="text-primary-200 text-sm mt-1">{label}</p>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */
const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useReveal();

  useEffect(() => {
    api.get("/products?limit=8&sort=newest")
      .then(r => setProducts(r.data.products || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-brand-bg overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-hero overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 right-[10%] w-80 h-80 bg-primary-400/25 rounded-full blur-3xl animate-orb" />
          <div className="absolute bottom-10 left-[5%] w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-orb" style={{ animationDelay: "3s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div className="reveal-left">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse2" />
              <span className="text-white/80 text-sm font-medium tracking-wide">New Collection 2026</span>
              <FiZap className="w-3 h-3 text-accent-400" />
            </div>

            <h1 className="font-outfit text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
              Dress to<br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary-300 via-accent-300 to-primary-200 bg-clip-text text-transparent animate-gradient-shift">
                  Impress
                </span>
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full" />
              </span>
            </h1>

            <p className="text-gray-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-md">
              Discover exquisite sarees, ethnic wear & modern fashion.
              Premium quality, timeless style — curated just for you.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link
                to="/category/Women"
                className="btn-shine inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 animate-gradient-shift text-white font-bold px-8 py-4 rounded-2xl hover:shadow-float transition-all hover:scale-105 active:scale-95"
              >
                Shop Now <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/category/Sarees"
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
              >
                Explore Sarees
              </Link>
            </div>

            {/* Trust badges row */}
            <div className="flex items-center gap-3 flex-wrap">
              {["🔒 Secure Checkout", "🚚 Free Delivery", "↩️ Easy Returns"].map(b => (
                <span key={b} className="text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Right — visual */}
          <div className="hidden lg:flex justify-center reveal-right">
            <div className="relative w-[420px] h-[500px]">
              {/* Main card */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/25 to-accent-500/20 rounded-[2.5rem] border border-white/10 backdrop-blur-sm flex items-center justify-center animate-float-slow">
                <div className="text-center px-8">
                  <div className="text-9xl mb-5 drop-shadow-2xl">🥻</div>
                  <p className="font-outfit text-2xl font-bold text-white mb-1">Premium Fashion</p>
                  <p className="text-gray-300 text-sm">Curated for you</p>
                </div>
              </div>

              {/* Floating card — top right */}
              <div className="absolute -top-5 -right-6 bg-white rounded-2xl shadow-brand-lg p-4 animate-float" style={{ animationDelay: "0.5s" }}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Offer</p>
                <p className="font-outfit font-black text-gray-900 text-lg">Up to 40% OFF</p>
                <div className="mt-1 h-1 rounded-full bg-gradient-to-r from-primary-400 to-accent-500" />
              </div>

              {/* Floating card — bottom left */}
              <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-brand-lg p-4 animate-float" style={{ animationDelay: "1.2s" }}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Free Delivery</p>
                <p className="font-outfit font-black text-gray-900">Orders ₹2,000+</p>
              </div>

              {/* Floating mini badge */}
              <div className="absolute top-1/3 -left-8 bg-accent-500 text-white rounded-xl px-3 py-2 shadow-lg animate-float" style={{ animationDelay: "0.8s" }}>
                <div className="flex items-center gap-1.5">
                  <FiStar className="w-3.5 h-3.5 fill-current" />
                  <span className="font-bold text-sm">4.8</span>
                </div>
                <p className="text-xs opacity-90">Top Rated</p>
              </div>

              {/* New tag */}
              <div className="absolute top-6 left-0 bg-primary-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-float" style={{ animationDelay: "1.6s" }}>
                🆕 New Arrivals
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L48 50C96 40 192 20 288 16.7C384 13.3 480 26.7 576 33.3C672 40 768 40 864 33.3C960 26.7 1056 13.3 1152 13.3C1248 13.3 1344 26.7 1392 33.3L1440 40V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z" fill="#F0FDF4" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MARQUEE STRIP
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-primary-600 py-3 overflow-hidden shadow-md">
        <div className="marquee-container">
          <div className="marquee-inner text-white text-sm font-medium">
            {Array(4).fill("✦ Free delivery on orders above ₹2,000 \u00A0\u00A0 ✦ New arrivals every week \u00A0\u00A0 ✦ Use code WELCOME10 for 10% off \u00A0\u00A0 ✦ Premium quality fabrics \u00A0\u00A0 ✦ Easy 7-day returns \u00A0\u00A0").join("")}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FEATURES STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-primary-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={i}
                className="reveal flex items-center gap-4 group p-4 rounded-2xl hover:bg-primary-50 transition-all duration-300 cursor-default"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-outfit font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12 reveal">
          <span className="inline-block bg-primary-100 text-primary-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">Categories</span>
          <h2 className="font-outfit text-3xl sm:text-4xl font-black text-gray-900 mb-3">Shop by Category</h2>
          <p className="text-gray-500 max-w-sm mx-auto">Find exactly what you're looking for across our curated collections</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={cat.name}
              to={`/category/${cat.name}`}
              className="reveal"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:border-primary-200 hover:shadow-brand-lg transition-all duration-300 hover:-translate-y-2 group">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-3xl shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {cat.emoji}
                </div>
                <p className="font-outfit font-bold text-gray-900 text-sm mb-0.5">{cat.name}</p>
                <p className="text-gray-400 text-xs">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STATS BANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 animate-gradient-shift py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <StatCounter key={s.label} value={s.value} label={s.label} delay={i * 100} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          LATEST PRODUCTS
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10">
          <div className="reveal-left">
            <span className="inline-block bg-accent-100 text-accent-600 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">Just In</span>
            <h2 className="font-outfit text-3xl sm:text-4xl font-black text-gray-900">Latest Arrivals</h2>
            <p className="text-gray-500 mt-1">Fresh styles added this week</p>
          </div>
          <Link
            to="/category/Women"
            className="reveal-right hidden sm:flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 text-sm group"
          >
            View All <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p, i) => <ProductCard key={p._id} product={p} delay={i * 60} />)}
          </div>
        ) : (
          <div className="text-center py-24 text-gray-400">
            <div className="text-7xl mb-5">🛍️</div>
            <h3 className="font-outfit text-xl font-semibold text-gray-600 mb-2">No products yet</h3>
            <p className="text-sm">Check back soon for new arrivals!</p>
          </div>
        )}

        <div className="text-center mt-12 reveal">
          <Link
            to="/category/Women"
            className="btn-shine inline-flex items-center gap-2 border-2 border-primary-500 text-primary-600 font-bold px-10 py-3.5 rounded-2xl hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all duration-300 hover:shadow-brand"
          >
            Explore All Products <FiArrowRight />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-primary-800 to-brand-dark py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <span className="inline-block bg-white/10 text-primary-200 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">Why RK Fashion?</span>
            <h2 className="font-outfit text-3xl sm:text-4xl font-black text-white mb-3">Crafted With Care</h2>
            <p className="text-gray-400 max-w-md mx-auto">We bring you the finest Indian fashion with love and attention to detail</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FiAward, title: "Handpicked Quality", desc: "Every piece is individually selected by our fashion experts to ensure it meets our premium quality standards.", color: "from-emerald-400 to-teal-500", delay: 0 },
              { icon: FiHeart, title: "Customer First", desc: "Your satisfaction is our priority. Our dedicated support team is always ready to help you with any queries.", color: "from-rose-400 to-pink-500", delay: 100 },
              { icon: FiZap, title: "Fast & Reliable", desc: "Lightning-fast delivery with real-time tracking so you always know where your order is.", color: "from-amber-400 to-orange-500", delay: 200 },
            ].map(({ icon: Icon, title, desc, color, delay }) => (
              <div key={title} className="reveal bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 group" style={{ transitionDelay: `${delay}ms` }}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-outfit font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12 reveal">
          <span className="inline-block bg-accent-100 text-accent-600 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">Testimonials</span>
          <h2 className="font-outfit text-3xl sm:text-4xl font-black text-gray-900 mb-3">Loved by Customers</h2>
          <p className="text-gray-500">Join 10,000+ happy shoppers across India</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(({ name, loc, rating, text, avatar }, i) => (
            <div
              key={name}
              className="reveal bg-white rounded-3xl p-7 border border-gray-100 shadow-card hover:shadow-brand transition-all duration-300 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array(rating).fill(0).map((_, j) => (
                  <FiStar key={j} className="w-4 h-4 text-accent-500 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">"{text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                  {avatar}
                </div>
                <div>
                  <p className="font-outfit font-bold text-gray-900 text-sm">{name}</p>
                  <p className="text-gray-400 text-xs">{loc}</p>
                </div>
                <span className="ml-auto text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          PROMO BANNER
      ══════════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative bg-gradient-to-r from-brand-dark via-primary-800 to-primary-900 rounded-[2rem] p-10 sm:p-16 text-center overflow-hidden">
          {/* Decorations */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent-500/15 rounded-full blur-2xl" />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative reveal">
            <div className="inline-flex items-center gap-2 bg-accent-500/20 border border-accent-400/30 rounded-full px-4 py-1.5 mb-4">
              <FiZap className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-accent-300 text-xs font-bold uppercase tracking-widest">Limited Time Offer</span>
            </div>
            <h2 className="font-outfit text-3xl sm:text-5xl font-black text-white mb-4 leading-tight">
              Get 10% Off Your
              <span className="bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent"> First Order</span>
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Use code{" "}
              <span className="inline-flex items-center gap-1 bg-white/15 border border-white/25 px-3 py-1 rounded-lg font-mono font-bold text-white">
                WELCOME10
              </span>{" "}
              at checkout
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="btn-shine inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 animate-gradient-shift text-white font-bold px-10 py-4 rounded-2xl hover:shadow-float transition-all hover:scale-105 active:scale-95"
              >
                Create Account & Save <FiArrowRight />
              </Link>
              <Link
                to="/category/Sarees"
                className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all"
              >
                Browse Sarees
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;