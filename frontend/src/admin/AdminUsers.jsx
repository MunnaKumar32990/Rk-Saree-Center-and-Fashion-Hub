import { useEffect, useState } from "react";
import api from "../services/api";
import AdminLayout from "./AdminLayout";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get("/users", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setUsers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [userInfo.token]);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
              <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
              <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
               <tr><td colSpan="3" className="p-10 text-center animate-pulse">Loading users...</td></tr>
            ) : users.length > 0 ? (
              users.map(user => (
                <tr key={user._id} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{user.name}</td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4 text-center">{user.isAdmin ? "✅" : "❌"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="3" className="p-10 text-center text-gray-400 italic">No users registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;