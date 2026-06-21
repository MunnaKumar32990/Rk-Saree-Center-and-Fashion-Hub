import { Link } from "react-router-dom";
import { FiInstagram, FiMail, FiPhone, FiMapPin } from "react-icons/fi";

const Footer = () => {
  return (
    <footer className="bg-brand-dark text-gray-300">
      {/* WhatsApp CTA Strip */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-white mb-1">Need Help? Chat With Us</h3>
              <p className="text-primary-100 text-sm">Questions about orders, sizing, or products? We reply within minutes on WhatsApp</p>
            </div>
            <a
              href="https://wa.me/919708756854?text=Hi%21%20I%27m%20interested%20in%20your%20products%20on%20RK%20Saree%20Fashion%20Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-green-600 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 text-sm whitespace-nowrap shadow-md"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
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
              {/* Only linking to real/active social profiles */}
              <a
                href="https://www.instagram.com/r.k_saree_center?igsh=MWpjaXhrNXN2bHRmZw=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/5 hover:bg-primary-500 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-110"
                aria-label="RK Saree on Instagram"
              >
                <FiInstagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/919708756854"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/5 hover:bg-green-600 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-all hover:scale-110"
                aria-label="Contact on WhatsApp"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
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
              {[
                { label: "👔 Men's Collection", to: "/category/Men" },
                { label: "👗 Women's Collection", to: "/category/Women" },
                { label: "🧒 Kids' Collection", to: "/category/Kids" },
                { label: "🥻 Sarees", to: "/category/Women?sub=Sarees" },
                { label: "✨ Lehengas", to: "/category/Women?sub=Lehengas" },
                { label: "👘 Kurtis", to: "/category/Women?sub=Kurtis" },
                { label: "🎽 Kurtas", to: "/category/Men?sub=Kurtas" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-gray-400 hover:text-primary-400 text-sm transition-colors flex items-center gap-1.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
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
                <span className="text-gray-400">RK Saree Center, Yogapatti Main Road, 845452, Bihar, India</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <FiPhone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="tel:+919999999999" className="text-gray-400 hover:text-primary-400 transition-colors">+91 9708756854</a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <FiMail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <a href="mailto:rksareecenter32@gmail.com" className="text-gray-400 hover:text-primary-400 transition-colors">rksareecenter32@gmail.com</a>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-400 mb-1 font-medium text-primary-400">Store Hours</p>
              <p className="text-sm text-gray-300">Mon – Sat: 10AM – 8PM</p>
              <p className="text-sm text-gray-300">Sun: 11AM – 8PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} RK Saree &amp; Fashion Hub. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/shipping" className="hover:text-gray-300 transition-colors">Shipping Policy</Link>
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
