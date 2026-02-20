import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { userInfo } = useAuth();
  if (!userInfo || !userInfo.isAdmin) return <Navigate to="/login" replace />;
  return children;
};

export default AdminRoute;
