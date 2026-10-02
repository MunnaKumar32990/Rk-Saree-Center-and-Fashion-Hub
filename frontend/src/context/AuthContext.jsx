/* eslint-disable react-refresh/only-export-components -- A context module
   legitimately exports both the provider component and the hook that consumes
   it. Keeping them in one file is the standard React pattern; the only
   non-component export here is a hook, so fast refresh is unaffected. */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { readUser, writeUser, clearUser } from "../utils/storage";
import api from "../services/api";

const AuthContext = createContext(null);

/**
 * AuthContext.
 *
 * Fixes:
 *  - `logout()` used to `localStorage.removeItem("cartItems")`. Signing out
 *    silently destroyed the customer's basket, so logging in and out (or a
 *    shared device) lost the cart. The cart now survives sign-out entirely.
 *  - There was no server-side logout, so a token stayed valid for its full
 *    24 hours with no way to end it early. `logout` now calls the API.
 *  - `updateUser` captured `userInfo` in its closure, so rapid successive calls
 *    (e.g. saving a profile then enabling 2FA) could clobber each other. It now
 *    uses a functional update.
 */
export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => readUser());
  const navigate = useNavigate();

  const login = useCallback((userData) => {
    writeUser(userData);
    setUserInfo(userData);
  }, []);

  const logout = useCallback(
    async ({ redirect = true } = {}) => {
      try {
        // Best-effort: invalidate all outstanding tokens server-side.
        await api.post("/users/logout");
      } catch {
        // Offline or already-expired — clear locally regardless.
      }
      clearUser();
      setUserInfo(null);
      if (redirect) navigate("/login");
    },
    [navigate]
  );

  const updateUser = useCallback((updates) => {
    setUserInfo((prev) => {
      const merged = { ...(prev || {}), ...updates };
      writeUser(merged);
      return merged;
    });
  }, []);

  /**
   * The server may rotate the JWT (it does after a password change, because the
   * token version is bumped). Keep localStorage in step when a response carries
   * a fresh token.
   */
  const syncToken = useCallback((payload) => {
    if (!payload?.token) return;
    setUserInfo((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...payload, token: payload.token };
      writeUser(merged);
      return merged;
    });
  }, []);

  const isAdmin = Boolean(userInfo?.isAdmin);
  const isLoggedIn = Boolean(userInfo?.token);

  // Keep multiple tabs consistent.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "userInfo") setUserInfo(readUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ userInfo, isAdmin, isLoggedIn, login, logout, updateUser, syncToken }),
    [userInfo, isAdmin, isLoggedIn, login, logout, updateUser, syncToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};