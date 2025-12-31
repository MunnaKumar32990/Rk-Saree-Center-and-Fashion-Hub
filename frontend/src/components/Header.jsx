import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const Header = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const [menuOpen, setMenuOpen] = useState(false);

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("cartItems");
    navigate("/login");
    setMenuOpen(false);
  };

  return (
    <header className="bg-black text-white px-6 py-4">
      <div className="flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          RK Saree Center & Fashion
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex gap-6 text-sm items-center">
          <Link to="/category/Women">Women</Link>
          <Link to="/category/Men">Men</Link>
          <Link to="/category/Kids">Kids</Link>
          <Link to="/cart">Cart</Link>

          {userInfo ? (
            <>
              <Link to="/myorders">My Orders</Link>
              <button
                onClick={logoutHandler}
                className="bg-white text-black px-3 py-1 rounded"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>

        {/* Mobile Button */}
        <button
          className="md:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 flex flex-col gap-4 text-sm">
          <Link to="/category/Women" onClick={() => setMenuOpen(false)}>
            Women
          </Link>
          <Link to="/category/Men" onClick={() => setMenuOpen(false)}>
            Men
          </Link>
          <Link to="/category/Kids" onClick={() => setMenuOpen(false)}>
            Kids
          </Link>
          <Link to="/cart" onClick={() => setMenuOpen(false)}>
            Cart
          </Link>

          {userInfo ? (
            <>
              <Link to="/myorders" onClick={() => setMenuOpen(false)}>
                My Orders
              </Link>
              <button
                onClick={logoutHandler}
                className="text-left text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
