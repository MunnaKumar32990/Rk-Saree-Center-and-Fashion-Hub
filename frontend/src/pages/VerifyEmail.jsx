import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const { data } = await api.get(`/users/verify-email/${token}`);
        setStatus("success");
        toast.success(data.message);
        setTimeout(() => navigate("/login"), 3000);
      } catch (error) {
        setStatus("error");
        toast.error(error.response?.data?.message || "Verification failed");
      }
    };
    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800">Verifying Email...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <FiCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-4">Your account has been verified successfully.</p>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </>
        )}
        {status === "error" && (
          <>
            <FiXCircle className="text-red-500 text-6xl mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">The verification link is invalid or expired.</p>
            <Link to="/login" className="text-purple-600 hover:underline">Go to Login</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
