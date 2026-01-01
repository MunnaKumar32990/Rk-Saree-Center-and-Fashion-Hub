import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const Profile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data: profileData } = await api.get("/users/profile", {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setUserProfile(profileData);
        setAddress(profileData.address || "");

        // Fetch orders
        const { data: ordersData } = await api.get("/orders/myorders", {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        });
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userInfo && userInfo.token) {
      fetchProfile();
    }
  }, [userInfo?.token]);

  const handleEditAddress = () => {
    setIsEditingAddress(true);
    setAddressError("");
    setSuccessMessage("");
  };

  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    setAddress(userProfile?.address || "");
    setAddressError("");
    setSuccessMessage("");
  };

  const handleSaveAddress = async () => {
    // Basic validation
    if (address.trim().length < 5) {
      setAddressError("Address must be at least 5 characters long");
      return;
    }

    try {
      setAddressLoading(true);
      setAddressError("");
      const { data } = await api.put(
        "/users/profile/address",
        { address: address.trim() },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );
      setUserProfile(data);
      setSuccessMessage("Address updated successfully!");
      setIsEditingAddress(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setAddressError(
        error.response?.data?.message || "Failed to update address. Please try again."
      );
    } finally {
      setAddressLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Failed to load profile</p>
          <Link
            to="/"
            className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 animate-fade-in">My Profile</h2>

        {/* Profile Information Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
            Profile Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Name</p>
              <p className="font-semibold text-gray-900 text-lg">{userProfile.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-gray-900 text-lg">{userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Address Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6 animate-fade-in">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Saved Address</h3>
            {!isEditingAddress && (
              <button
                onClick={handleEditAddress}
                className="bg-gradient-to-r from-purple-700 to-violet-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {userProfile.address ? "Edit Address" : "Add Address"}
              </button>
            )}
          </div>

          {isEditingAddress ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setAddressError("");
                  }}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your full address"
                />
                {addressError && (
                  <p className="mt-2 text-sm text-red-600">{addressError}</p>
                )}
              </div>
              {successMessage && (
                <p className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  {successMessage}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAddress}
                  disabled={addressLoading}
                  className="bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addressLoading ? "Saving..." : "Save Address"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={addressLoading}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {userProfile.address ? (
                <p className="text-gray-700 whitespace-pre-line">{userProfile.address}</p>
              ) : (
                <p className="text-gray-500 italic">No address saved yet. Click "Add Address" to add one.</p>
              )}
            </div>
          )}
        </div>

        {/* Order History Section */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Order History</h3>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-20 w-20 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
              <Link
                to="/"
                className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 transition-colors duration-200 animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td className="p-4">
                        <Link
                          to={`/order/${order._id}`}
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          {order._id.substring(0, 8)}...
                        </Link>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-600">
                        {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center font-semibold text-gray-900">
                        ₹{order.totalPrice.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {order.isDelivered ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            ✓ Delivered
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          to={`/order/${order._id}`}
                          className="inline-block bg-gradient-to-r from-purple-700 to-violet-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-violet-600 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

