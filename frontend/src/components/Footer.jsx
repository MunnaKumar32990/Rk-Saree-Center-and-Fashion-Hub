import { Link } from "react-router-dom";
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiMail, FiPhone, FiMapPin } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="bg-brand-dark text-gray-300">
      {/* Newsletter Strip */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-white mb-1">Stay in Style</h3>
              <p className="text-primary-100 text-sm">Subscribe for exclusive offers, new arrivals & style tips</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email..."
                className="flex-1 md:w-72 px-4 py-3 rounded-xl bg-white/15 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
              />
              <button className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 text-sm whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-outfit font-bold text-sm">
                RK
              </div>
              <span className="font-outfit font-bold text-lg text-white">RK Saree & Fashion</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Your destination for premium fashion. Discover exquisite sarees, trendy clothing,
              and timeless styles that make every moment memorable.
            </p>
            <div className="flex gap-3">
              {[{ icon: FiFacebook, href: "#" }, { icon: FiInstagram, href: "#" }, { icon: FiTwitter, href: "#" }, { icon: FiYoutube, href: "#" }].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} className="w-9 h-9 bg-white/5 hover:bg-primary-500 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-110">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-outfit font-bold text-white mb-5 text-base">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: "Home", to: "/" },
                { label: "New Arrivals", to: "/category/Women" },
                { label: "My Orders", to: "/myorders" },
                { label: "My Profile", to: "/profile" },
                { label: "Cart", to: "/cart" },
                { label: "Contact Us", to: "/contact" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-gray-400 hover:text-primary-400 text-sm transition-colors flex items-center gap-1.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-outfit font-bold text-white mb-5 text-base">Shop Categories</h4>
            <ul className="space-y-3">
              {["Women", "Men", "Kids", "Sarees", "Suits", "Kurtis", "Lehengas"].map((cat) => (
                <li key={cat}>
                  <Link to={`/category/${cat}`} className="text-gray-400 hover:text-primary-400 text-sm transition-colors flex items-center gap-1.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-outfit font-bold text-white mb-5 text-base">Contact Info</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm">
                <FiMapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">RK Saree Center, Main Market, Your City, India</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <FiPhone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="tel:+919999999999" className="text-gray-400 hover:text-primary-400 transition-colors">+91 99999 99999</a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <FiMail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="mailto:rksareecenter32@gmail.com" className="text-gray-400 hover:text-primary-400 transition-colors">rksareecenter32@gmail.com</a>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-400 mb-1 font-medium text-primary-400">Store Hours</p>
              <p className="text-sm text-gray-300">Mon – Sat: 10AM – 8PM</p>
              <p className="text-sm text-gray-300">Sun: 11AM – 6PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} RK Saree & Fashion Hub. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/shipping" className="hover:text-gray-300 transition-colors">Shipping Policy</Link>
            <Link to="/contact" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
