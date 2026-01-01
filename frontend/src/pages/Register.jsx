import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post("/users/register", {
        name,
        email,
        password,
      });

      // Auto-login after register
      localStorage.setItem("userInfo", JSON.stringify(data));

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={submitHandler}
        className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 transform transition-all duration-500 hover:shadow-2xl animate-fade-in"
      >
        <h2 className="text-3xl font-extrabold mb-8 text-center text-gray-900">
          Create Account
        </h2>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-6 text-sm animate-slide-down">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Email Address
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-semibold mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-600 outline-none transition-all"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-700 to-violet-700 text-white py-3 rounded-lg font-bold transition duration-300 ease-in-out hover:from-purple-600 hover:to-violet-600 active:scale-95 shadow-md disabled:bg-gray-400"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </div>

        <p className="text-sm text-center mt-6 text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Login Here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
