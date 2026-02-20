import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/users/login", form);
      login(data);
      toast.success(`Welcome back, ${data.name}! 🎉`, { style: { borderRadius: "12px" } });
      navigate(data.isAdmin ? "/admin/dashboard" : "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-hero flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-16 right-16 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-16 left-8 w-80 h-80 bg-accent-500/15 rounded-full blur-3xl" />
        <div className="relative text-center">
          <div className="text-8xl mb-6">🥻</div>
          <h2 className="font-outfit text-4xl font-black text-white mb-4">Welcome Back</h2>
          <p className="text-gray-300 text-lg max-w-sm">
            Sign in to continue your fashion journey with exclusive deals and offers.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-center">
            {[["500+", "Products"], ["10K+", "Customers"], ["4.8★", "Rating"], ["7-Day", "Returns"]].map(([val, label]) => (
              <div key={label} className="bg-white/10 border border-white/15 rounded-2xl p-4">
                <p className="font-outfit text-xl font-bold text-white">{val}</p>
                <p className="text-gray-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-outfit font-bold">RK</div>
              <span className="font-outfit font-bold text-xl text-gray-900">RK Saree & Fashion</span>
            </Link>
            <h1 className="font-outfit text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p className="text-gray-500 text-sm">Enter your credentials to access your account</p>
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline font-medium">Forgot password?</Link>
                </div>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-11 pr-12 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold py-4 rounded-xl hover:shadow-brand-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary-600 font-semibold hover:underline">Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;