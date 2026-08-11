import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as authService from "../services/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // On app startup, restore auth state from localStorage
    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");
        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
                setIsAuthenticated(true);
            } catch (e) {
                localStorage.clear();
            }
        }
        setLoading(false);
    }, []);

    // Save AuthResponse from backend into state + localStorage
    const saveAuth = (authData) => {
        // Backend returns: { userId, name, email, role, accessToken, refreshToken }
        const userInfo = {
            id: authData.userId,
            name: authData.name,
            email: authData.email,
            role: authData.role,
        };
        localStorage.setItem("token", authData.accessToken);
        localStorage.setItem("refreshToken", authData.refreshToken);
        localStorage.setItem("user", JSON.stringify(userInfo));
        setUser(userInfo);
        setIsAuthenticated(true);
        return userInfo;
    };

    const login = async (data) => {
        const res = await authService.login(data);
        const authData = res.data?.data;
        if (authData && authData.accessToken) {
            localStorage.removeItem("resumeUploaded"); // Clear previous session resume state
            const userInfo = saveAuth(authData);
            const targetPath = (userInfo.role === 'ADMIN' || userInfo.role === 'TRAINER') ? "/admin" : "/dashboard";
            navigate(targetPath, { replace: true });
        } else {
            throw new Error(res.data?.message || "Login failed");
        }
    };

    const register = async (data) => {
        const res = await authService.register(data);
        const authData = res.data?.data;
        if (authData && authData.accessToken) {
            localStorage.removeItem("resumeUploaded"); // Clear previous session resume state
            const userInfo = saveAuth(authData);
            const targetPath = (userInfo.role === 'ADMIN' || userInfo.role === 'TRAINER') ? "/admin" : "/dashboard";
            navigate(targetPath, { replace: true });
        } else {
            throw new Error(res.data?.message || "Registration failed");
        }
    };

    const logout = () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
            authService.logout(refreshToken).catch(() => {});
        }
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        localStorage.removeItem("resumeUploaded");
        setUser(null);
        setIsAuthenticated(false);
        navigate("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-techwing-dark">
                <div className="w-8 h-8 border-4 border-techwing-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);