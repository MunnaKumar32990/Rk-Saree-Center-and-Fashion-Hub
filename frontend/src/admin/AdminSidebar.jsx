import { Link, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const location = useLocation();
  const links = [
    { name: "Dashboard", path: "/admin/dashboard", icon: "📊" },
    { name: "Products", path: "/admin/products", icon: "👕" },
    { name: "Orders", path: "/admin/orders", icon: "📦" },
    { name: "Users", path: "/admin/users", icon: "👥" },
    { name: "Back to Store", path: "/", icon: "🏪" },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-purple-900 via-purple-800 to-violet-900 text-white min-h-screen p-6 shadow-2xl flex flex-col sticky top-0">
      <div className="mb-10 pb-6 border-b border-gray-800">
        <h2 className="text-2xl font-black tracking-tighter mb-2">RK ADMIN</h2>
        <p className="text-xs text-gray-400">Management Portal</p>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 ${
              location.pathname === link.path 
              ? "bg-white text-purple-900 font-bold shadow-lg transform scale-105" 
              : "hover:bg-gray-800 hover:translate-x-1"
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-400 text-center">
          © {new Date().getFullYear()} RK Admin
        </p>
      </div>
    </aside>
  );
};

export default AdminSidebar;