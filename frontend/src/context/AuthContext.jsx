import { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(() => {
        try {
            const stored = localStorage.getItem("userInfo");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const navigate = useNavigate();

    const login = useCallback((userData) => {
        localStorage.setItem("userInfo", JSON.stringify(userData));
        setUserInfo(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("userInfo");
        localStorage.removeItem("cartItems");
        setUserInfo(null);
        navigate("/login");
    }, [navigate]);

    const updateUser = useCallback((updates) => {
        const updated = { ...userInfo, ...updates };
        localStorage.setItem("userInfo", JSON.stringify(updated));
        setUserInfo(updated);
    }, [userInfo]);

    return (
        <AuthContext.Provider value={{ userInfo, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
