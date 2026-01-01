import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/users/login", { email, password });
      localStorage.setItem("userInfo", JSON.stringify(data));
      data.isAdmin ? navigate("/admin/dashboard") : navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <form onSubmit={submitHandler} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transform transition-all duration-500 hover:shadow-2xl">
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-900">Welcome Back</h2>
        {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-6 text-sm">{error}</div>}
        
        <div className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email Address</label>
            <input type="email" placeholder="email@example.com" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <input type="password" placeholder="••••••••" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-3 rounded-lg font-bold transition duration-300 ease-in-out hover:from-purple-600 hover:to-violet-600 active:scale-95 shadow-md disabled:bg-gray-400">
            {loading ? "Authenticating..." : "Login"}
          </button>
        </div>
        <p className="text-sm text-center mt-6 text-gray-600">New customer? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register Here</Link></p>
      </form>
    </div>
  );
};

export default Login;