import { Navigate } from "react-router-dom";

/**
 * A redirect that behaves like <Navigate> but is a real named component.
 *
 * The original App.jsx had an inline `PrivateRoute` that rendered
 * `<Navigate to="/login" />` — but `Navigate` was never imported from
 * react-router-dom. With the automatic JSX runtime that compiles to a reference
 * to an undefined identifier, so every logged-out visitor hitting /cart,
 * /checkout, /wishlist, /profile, /myorders, /order/:id or /payment/:id got a
 * hard `ReferenceError` and a permanently white screen, with no ErrorBoundary to
 * recover from. One missing identifier, on the entire authenticated half of
 * the site.
 */
const RouteFallback = ({ to, state, replace = true }) => (
  <Navigate to={to} state={state} replace={replace} />
);

export default RouteFallback;