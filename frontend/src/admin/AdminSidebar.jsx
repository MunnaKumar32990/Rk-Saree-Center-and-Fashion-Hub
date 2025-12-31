import { Link, useLocation } from "react-router-dom";

const AdminSidebar = () => {
  const location = useLocation();
  const links = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Products", path: "/admin/products" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Users", path: "/admin/users" },
    { name: "Back to Store", path: "/" },
  ];

  return (
    <aside className="w-64 bg-black text-white min-h-screen p-6 shadow-2xl flex flex-col">
      <h2 className="text-2xl font-black mb-10 tracking-tighter border-b border-gray-800 pb-4">RK ADMIN</h2>
      <nav className="flex flex-col gap-3">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`block py-3 px-4 rounded-lg transition-all duration-300 ${
              location.pathname === link.path 
              ? "bg-white text-black font-bold" 
              : "hover:bg-gray-800 hover:pl-8"
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;