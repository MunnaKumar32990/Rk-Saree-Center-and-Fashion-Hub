import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { FiShoppingCart, FiHeart, FiUser, FiSearch, FiMenu, FiX, FiChevronDown, FiLogOut, FiPackage, FiGrid, FiChevronRight, FiMapPin, FiLoader } from "react-icons/fi";
import useDebounce from "../hooks/useDebounce";
import LocationWidget from "./LocationWidget";
import api from "../services/api";
import { effectiveUnitPrice } from "../utils/pricing";

const CATEGORY_MENU = [
  {
    name: "Men",
    emoji: "👔",
    subcategories: ["Shirts", "T-Shirts", "Jeans", "Kurtas", "Sherwani", "Shorts", "Pajamas", "Track Pants"],
  },
  {
    name: "Women",
    emoji: "👗",
    subcategories: ["Sarees", "Lehengas", "Suits", "Kurtis", "Dupatta", "Blouses", "Chunni", "Undergarments"],
  },
  {
    name: "Kids",
    emoji: "🧒",
    subcategories: ["Boys Wear", "Girls Wear", "Kids T-Shirts", "Kids Shorts", "Kurta Sets", "Frocks", "Kids Lehenga"],
  },
];

// ─── Mobile Category Item with expandable subcategories ──────────────────────
const MobileCategoryItem = ({ cat, onClose }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center">
        <Link
          to={`/category/${cat.name}`}
          onClick={onClose}
          className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-gray-800 hover:bg-primary-50 hover:text-primary-600 transition-colors"
        >
          <span>{cat.emoji}</span> {cat.name}
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-gray-500 hover:text-primary-600"
        >
          <FiChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="ml-4 mr-2 mb-1 grid grid-cols-2 gap-1">
          {cat.subcategories.map((sub) => (
            <Link
              key={sub}
              to={`/category/${cat.name}?sub=${encodeURIComponent(sub)}`}
              onClick={onClose}
              className="px-3 py-2 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              {sub}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Mobile Location Button ───────────────────────────────────────────────────
const STORAGE_KEY = "rk_user_location";

const MobileLocationButton = () => {
  // Read straight from localStorage on first render instead of in an effect, so
  // the stored city is correct on the very first paint rather than one frame later.
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const detect = () => {
    if (!navigator.geolocation || loading) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.state || "Your Location";
          const pincode = addr.postcode || "";
          const locationData = { city, pincode };
          setLocation(locationData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...locationData, full: data.display_name }));
        } catch { /* ignore */ }
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 10000 }
    );
  };

  return (
    <button
      onClick={detect}
      disabled={loading}
      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 rounded-xl transition-colors"
    >
      <FiMapPin className={`w-4 h-4 ${loading ? "text-amber-500 animate-pulse" : "text-primary-600"}`} />
      {loading ? (
        <span className="text-amber-600 font-medium">Detecting location…</span>
      ) : location ? (
        <span>
          📍 <span className="font-semibold">{location.city}</span>
          {location.pincode && <span className="text-gray-400 ml-1">{location.pincode}</span>}
          <span className="text-xs text-primary-500 ml-2">(tap to update)</span>
        </span>
      ) : (
        <span className="text-primary-600 font-semibold">Detect My Location</span>
      )}
    </button>
  );
};


const Header = () => {
  const navigate = useNavigate();
  const { userInfo, logout } = useAuth();
  const { cartItemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [catDropdown, setCatDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [predictions, setPredictions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const userRef = useRef(null);
  const catRef = useRef(null);
  const searchBoxRef = useRef(null);
  const mobileSearchBoxRef = useRef(null);

  // Handle scroll for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatDropdown(false);
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target) &&
        (!mobileSearchBoxRef.current || !mobileSearchBoxRef.current.contains(e.target))
      ) {
        setSearchOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setUserDropdown(false);
        setCatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (value.trim().length >= 2) {
      setSearchOpen(true);
      setSearchLoading(true);
    } else {
      setPredictions([]);
      setSearchOpen(false);
      setSearchLoading(false);
    }
  };

  // Fetch search predictions as user types
  useEffect(() => {
    const query = debouncedSearch.trim();
    if (query.length < 2) return;

    let active = true;

    api
      .get(`/products?keyword=${encodeURIComponent(query)}&limit=5`)
      .then((res) => {
        if (!active) return;
        const list = res.data?.products || (Array.isArray(res.data) ? res.data : []);
        setPredictions(list);
      })
      .catch(() => {
        if (!active) return;
        setPredictions([]);
      })
      .finally(() => {
        if (active) setSearchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      navigate(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectProduct = (productId) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(`/product/${productId}`);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-white/90 backdrop-blur-xl shadow-md border-b border-gray-100"
        : "bg-white shadow-sm"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 flex items-center gap-2 group"
            onClick={() => setMenuOpen(false)}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-outfit font-bold text-sm">
              RK
            </div>
            <span className="font-outfit font-bold text-sm sm:text-lg text-brand-dark block group-hover:text-primary-600 transition-colors">
              RK Saree & Fashion
            </span>
          </Link>

          {/* Location Widget - Desktop */}
          <LocationWidget />

          {/* Search Bar - Desktop */}
          <div ref={searchBoxRef} className="hidden md:flex flex-1 max-w-md relative">
            <form
              onSubmit={handleSearchSubmit}
              className="w-full flex items-center"
            >
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search sarees, kurtas, fabrics..."
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) setSearchOpen(true);
                  }}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPredictions([]);
                      setSearchOpen(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    aria-label="Clear search"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Desktop Predictive Dropdown */}
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-slide-down">
                <div className="p-2.5 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold px-3.5 bg-gray-50/70">
                  <span>{searchLoading ? "Searching products..." : "Suggested Products"}</span>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>

                {searchLoading ? (
                  <div className="p-5 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Finding matching outfits...
                  </div>
                ) : predictions.length > 0 ? (
                  <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {predictions.map((p) => {
                      const thumb = p.images?.[0] || p.image || "/placeholder.jpg";
                      const price = effectiveUnitPrice(p);
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleSelectProduct(p._id)}
                          className="flex items-center gap-3 p-3 hover:bg-primary-50/40 cursor-pointer transition-colors group"
                        >
                          <img
                            src={thumb}
                            alt={p.name}
                            className="w-11 h-14 object-cover rounded-lg border border-gray-100 shrink-0 group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 group-hover:text-primary-600 truncate">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-gray-400">
                                {p.category} {p.subcategory ? `· ${p.subcategory}` : ""}
                              </span>
                              {p.specs?.fabric && (
                                <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                                  {p.specs.fabric}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-outfit font-bold text-xs text-gray-900">
                                ₹{price.toLocaleString("en-IN")}
                              </span>
                              {p.discount > 0 && (
                                <>
                                  <span className="text-[10px] text-gray-400 line-through">
                                    ₹{p.price?.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-[10px] text-emerald-600 font-bold">
                                    {p.discount}% OFF
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <FiChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600 shrink-0 transition-colors" />
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        navigate(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="w-full text-center py-2.5 bg-gray-50 hover:bg-primary-50 text-xs font-semibold text-primary-700 transition-colors flex items-center justify-center gap-1 border-t border-gray-100"
                    >
                      <span>View all results for "{searchQuery}"</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-600 font-medium">
                      No matching products found for "{searchQuery}"
                    </p>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="mt-2 text-xs text-primary-600 font-semibold hover:underline"
                    >
                      Search catalog anyway &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/category/Women?sub=Sarees"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-semibold text-primary-700 hover:bg-primary-50 transition-all whitespace-nowrap"
            >
              <span>🥻</span> Sarees
            </Link>
            <Link
              to="/category/Women"
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all whitespace-nowrap"
            >
              <span>👗</span> Women
            </Link>
            <Link
              to="/category/Men"
              className="hidden lg:flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all whitespace-nowrap"
            >
              <span>👔</span> Men
            </Link>
            <Link
              to="/category/Kids"
              className="hidden xl:flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all whitespace-nowrap"
            >
              <span>🧒</span> Kids
            </Link>

            {/* Categories Mega-Dropdown */}
            <div ref={catRef} className="relative">
              <button
                onClick={() => setCatDropdown(!catDropdown)}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all whitespace-nowrap"
              >
                More <FiChevronDown className={`transition-transform ${catDropdown ? "rotate-180" : ""}`} />
              </button>
              {catDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-5 animate-slide-down z-50 flex gap-0" style={{ width: '640px' }}>
                  {CATEGORY_MENU.map((cat, idx) => (
                    <div key={cat.name} className={`flex-1 px-5 ${idx < CATEGORY_MENU.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      <Link
                        to={`/category/${cat.name}`}
                        onClick={() => setCatDropdown(false)}
                        className="flex items-center gap-2 mb-3 group"
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="font-outfit font-bold text-sm text-gray-900 group-hover:text-primary-600 transition-colors">{cat.name}</span>
                        <FiChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 ml-auto transition-colors" />
                      </Link>
                      <div className="space-y-1">
                        {cat.subcategories.map((sub) => (
                          <Link
                            key={sub}
                            to={`/category/${cat.name}?sub=${encodeURIComponent(sub)}`}
                            onClick={() => setCatDropdown(false)}
                            className="block px-2 py-1.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all"
            >
              <FiShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-scale-in">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Link>

            {/* Wishlist */}
            {userInfo && (
              <Link
                to="/wishlist"
                className="p-2 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all"
              >
                <FiHeart className="w-5 h-5" />
              </Link>
            )}

            {/* User Dropdown */}
            {userInfo ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 hover:bg-primary-100 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                    {userInfo.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-primary-700 max-w-20 truncate">
                    {userInfo.name?.split(" ")[0]}
                  </span>
                  <FiChevronDown className={`w-4 h-4 text-primary-600 transition-transform ${userDropdown ? "rotate-180" : ""}`} />
                </button>
                {userDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-brand-lg border border-gray-100 py-2 animate-slide-down z-50">
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{userInfo.name}</p>
                      <p className="text-xs text-gray-500">{userInfo.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <FiUser className="w-4 h-4" /> My Profile
                    </Link>
                    <Link to="/myorders" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <FiPackage className="w-4 h-4" /> My Orders
                    </Link>
                    {userInfo.isAdmin && (
                      <Link to="/admin/dashboard" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiGrid className="w-4 h-4" /> Admin Panel
                      </Link>
                    )}
                    <div className="border-t border-gray-100 mt-1">
                      <button
                        onClick={() => { setUserDropdown(false); logout(); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FiLogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-600 px-3 py-2 transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all hover:shadow-brand active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile: icons + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Link to="/cart" className="relative p-2 text-gray-700">
              <FiShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-gray-700 hover:text-primary-600 transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div ref={mobileSearchBoxRef} className="md:hidden pb-3 relative">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search sarees, kurtas, suits..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setSearchOpen(true);
                }}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPredictions([]);
                    setSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Clear search"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Mobile Predictive Dropdown */}
          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
              <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold px-3 bg-gray-50">
                <span>{searchLoading ? "Searching..." : "Suggestions"}</span>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchLoading ? (
                <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Searching products...
                </div>
              ) : predictions.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {predictions.map((p) => {
                    const thumb = p.images?.[0] || p.image || "/placeholder.jpg";
                    const price = effectiveUnitPrice(p);
                    return (
                      <div
                        key={p._id}
                        onClick={() => handleSelectProduct(p._id)}
                        className="flex items-center gap-2.5 p-2.5 hover:bg-primary-50/50 cursor-pointer transition-colors"
                      >
                        <img
                          src={thumb}
                          alt={p.name}
                          className="w-10 h-12 object-cover rounded-lg border border-gray-100 shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {p.category} {p.subcategory ? `· ${p.subcategory}` : ""}
                          </p>
                          <p className="font-outfit font-bold text-xs text-gray-900 mt-0.5">
                            ₹{price.toLocaleString("en-IN")}
                            {p.discount > 0 && (
                              <span className="ml-1.5 text-[10px] text-emerald-600 font-semibold">
                                {p.discount}% OFF
                              </span>
                            )}
                          </p>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      navigate(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
                    }}
                    className="w-full text-center py-2 bg-gray-50 text-xs font-semibold text-primary-700 flex items-center justify-center gap-1"
                  >
                    <span>View all for "{searchQuery}"</span>
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 text-center">
                  <p className="text-xs text-gray-500">No products found</p>
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="mt-1 text-xs text-primary-600 font-semibold"
                  >
                    Search anyway &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-down">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {/* Quick Category Highlight Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 px-1">
              <Link
                to="/category/Women?sub=Sarees"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold border border-primary-200 whitespace-nowrap"
              >
                <span>🥻</span> Sarees
              </Link>
              <Link
                to="/category/Women"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 whitespace-nowrap"
              >
                <span>👗</span> Women
              </Link>
              <Link
                to="/category/Men"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 whitespace-nowrap"
              >
                <span>👔</span> Men
              </Link>
              <Link
                to="/category/Kids"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-200 whitespace-nowrap"
              >
                <span>🧒</span> Kids
              </Link>
            </div>

            {CATEGORY_MENU.map((cat) => (
              <MobileCategoryItem key={cat.name} cat={cat} onClose={() => setMenuOpen(false)} />
            ))}
            {/* Mobile Location Button */}
            <MobileLocationButton />

            <div className="border-t border-gray-100 mt-2 pt-2">
              {userInfo ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 rounded-xl">
                    <FiUser className="w-4 h-4" /> Profile
                  </Link>
                  <Link to="/myorders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 rounded-xl">
                    <FiPackage className="w-4 h-4" /> My Orders
                  </Link>
                  <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 rounded-xl">
                    <FiHeart className="w-4 h-4" /> Wishlist
                  </Link>
                  {userInfo.isAdmin && (
                    <Link to="/admin/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 rounded-xl">
                      <FiGrid className="w-4 h-4" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl"
                  >
                    <FiLogOut className="w-4 h-4" /> Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-3 px-4 py-2">
                  <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2.5 border-2 border-primary-500 text-primary-600 rounded-xl text-sm font-semibold">Login</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold">Sign Up</Link>
                </div>
              )}
            </div>

            {/* Direct WhatsApp Customer Care */}
            <div className="pt-3 border-t border-gray-100 mt-2">
              <a
                href="https://wa.me/919708756854?text=Hi%20RK%20Saree%20Center%2C%20I%20need%20help%20with%20an%20order"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 transition-colors"
              >
                <span>💬</span> WhatsApp Support (+91 97087 56854)
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
