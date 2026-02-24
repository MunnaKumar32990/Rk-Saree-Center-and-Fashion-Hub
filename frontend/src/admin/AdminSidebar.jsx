import { Link, useLocation } from "react-router-dom";
import {
  FiGrid, FiPackage, FiShoppingBag, FiUsers,
  FiArrowLeft, FiTag, FiBell
} from "react-icons/fi";

const navLinks = [
  { name: "Dashboard", path: "/admin/dashboard", icon: FiGrid },
  { name: "Products", path: "/admin/products", icon: FiShoppingBag },
  { name: "Orders", path: "/admin/orders", icon: FiPackage },
  { name: "Users", path: "/admin/users", icon: FiUsers },
  { name: "Coupons", path: "/admin/coupons", icon: FiTag },
  { name: "Announcements", path: "/admin/announcements", icon: FiBell },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-brand-dark text-white min-h-screen flex flex-col sticky top-0 shadow-2xl border-r border-white/5">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-outfit font-black text-sm">
            RK
          </div>
          <div>
            <p className="font-outfit font-bold text-sm leading-none">RK Admin</p>
            <p className="text-white/40 text-xs mt-0.5">Management Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1">
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest px-3 mb-3">Main Menu</p>
        {navLinks.map(({ name, path, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive
                ? "bg-primary-600 text-white shadow-brand"
                : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-6 space-y-1 border-t border-white/10 pt-4">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/8 hover:text-white transition-all"
        >
          <FiArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;