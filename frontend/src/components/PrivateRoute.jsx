import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * PrivateRoute guard.
 *
 * The previous version of this file was dead code that was never imported, and
 * it read `JSON.parse(localStorage.getItem("userInfo"))` directly — which throws
 * on corrupt storage and would have produced another white screen. It also
 * duplicated the guard that lived inline in App.jsx, giving the app two sources
 * of truth for "is this route private".
 *
 * This is now the single implementation, driven by AuthContext.
 */
const PrivateRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;