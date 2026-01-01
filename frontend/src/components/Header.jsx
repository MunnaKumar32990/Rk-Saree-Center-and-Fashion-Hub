import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";

const Header = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartItems } = useCart();
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("cartItems");
    navigate("/login");
    setMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('header')) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-violet-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link 
            to="/" 
            className="text-xl sm:text-2xl font-bold tracking-tight hover:text-gray-300 transition-colors duration-300"
          >
            RK Saree Center & Fashion Store
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden md:flex gap-6 lg:gap-8 text-sm items-center">
            <Link 
              to="/category/Women" 
              className="hover:text-gray-300 transition-colors duration-200 font-medium"
            >
              Women
            </Link>
            <Link 
              to="/category/Men" 
              className="hover:text-gray-300 transition-colors duration-200 font-medium"
            >
              Men
            </Link>
            <Link 
              to="/category/Kids" 
              className="hover:text-gray-300 transition-colors duration-200 font-medium"
            >
              Kids
            </Link>
            <Link 
              to="/cart" 
              className="relative hover:text-gray-300 transition-colors duration-200 font-medium"
            >
              <span className="flex items-center gap-1">
                Cart
                {cartItemCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-scale-in">
                    {cartItemCount}
                  </span>
                )}
              </span>
            </Link>

            {userInfo ? (
              <>
                <Link 
                  to="/myorders" 
                  className="hover:text-gray-300 transition-colors duration-200 font-medium"
                >
                  My Orders
                </Link>
                {userInfo.isAdmin && (
                  <Link 
                    to="/admin/dashboard" 
                    className="hover:text-gray-300 transition-colors duration-200 font-medium"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={logoutHandler}
                  className="bg-white text-purple-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="hover:text-gray-300 transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-white text-purple-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Register
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Button */}
          <button
            className="md:hidden text-2xl focus:outline-none transition-transform duration-300 hover:scale-110"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col gap-3 py-4 text-sm animate-slide-down">
            <Link 
              to="/category/Women" 
              onClick={() => setMenuOpen(false)}
              className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              Women
            </Link>
            <Link 
              to="/category/Men" 
              onClick={() => setMenuOpen(false)}
              className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              Men
            </Link>
            <Link 
              to="/category/Kids" 
              onClick={() => setMenuOpen(false)}
              className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              Kids
            </Link>
            <Link 
              to="/cart" 
              onClick={() => setMenuOpen(false)}
              className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center gap-2"
            >
              Cart
              {cartItemCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {userInfo ? (
              <>
                <Link 
                  to="/myorders" 
                  onClick={() => setMenuOpen(false)}
                  className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  My Orders
                </Link>
                {userInfo.isAdmin && (
                  <Link 
                    to="/admin/dashboard" 
                    onClick={() => setMenuOpen(false)}
                    className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={logoutHandler}
                  className="text-left py-2 px-4 rounded-lg text-red-400 hover:bg-gray-800 transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  onClick={() => setMenuOpen(false)}
                  className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setMenuOpen(false)}
                  className="py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
