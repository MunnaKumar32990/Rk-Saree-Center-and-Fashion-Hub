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
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">User Management</h1>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="p-10 text-center">
                      <div className="flex items-center justify-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
                        <span className="text-gray-600">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user, index) => (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50 transition-colors duration-200 animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4 font-medium text-gray-900">{user.name}</td>
                      <td className="p-4 text-gray-600">{user.email}</td>
                      <td className="p-4 text-center">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            Customer
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-gray-500">
                      No users registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;