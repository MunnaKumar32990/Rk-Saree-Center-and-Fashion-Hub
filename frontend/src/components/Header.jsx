import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { FiShoppingCart, FiHeart, FiUser, FiSearch, FiMenu, FiX, FiChevronDown, FiLogOut, FiPackage, FiGrid, FiChevronRight } from "react-icons/fi";
import useDebounce from "../hooks/useDebounce";

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

const Header = () => {
  const navigate = useNavigate();
  const { userInfo, logout } = useAuth();
  const { cartItemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [catDropdown, setCatDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const userRef = useRef(null);
  const catRef = useRef(null);

  // Handle scroll for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Navigate on debounced search
  useEffect(() => {
    if (debouncedSearch.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(debouncedSearch.trim())}`);
    }
  }, [debouncedSearch, navigate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    }
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
            <span className="font-outfit font-bold text-lg text-brand-dark hidden sm:block group-hover:text-primary-600 transition-colors">
              RK Saree & Fashion
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md items-center"
          >
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Categories Mega-Dropdown */}
            <div ref={catRef} className="relative">
              <button
                onClick={() => setCatDropdown(!catDropdown)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-all"
              >
                Categories <FiChevronDown className={`transition-transform ${catDropdown ? "rotate-180" : ""}`} />
              </button>
              {catDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 py-5 animate-slide-down z-50 flex gap-0" style={{ minWidth: '600px' }}>
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
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-slide-down">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {CATEGORY_MENU.map((cat) => (
              <MobileCategoryItem key={cat.name} cat={cat} onClose={() => setMenuOpen(false)} />
            ))}
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
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
