// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // info del usuario
  const [token, setToken] = useState(null); // token JWT
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar desde localStorage al entrar
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });

    const { token: newToken, user: userData } = res.data;

    setToken(newToken);
    setUser(userData);

    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));

    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isOwner: user?.role === "OWNER",
    isWorker: user?.role === "WORKER",
    isDirector: user?.role === "DIRECTOR",
    // Puede convertir una cotización aprobada a venta
    canConvert: user?.role === "OWNER" || user?.role === "DIRECTOR",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
