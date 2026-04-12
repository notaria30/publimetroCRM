import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText,
  TrendingUp, Receipt, ClipboardCheck, UserCog,
  BarChart2, LogOut, Sun, Moon, Settings, KeyRound, X, Target
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import logo from "../assets/logo.svg";
import "./ProtectedLayout.css";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { to: "/clients", label: "Clientes", icon: <Users size={16} /> },
  { to: "/opportunities", label: "Oportunidades", icon: <Target size={16} /> },
  { to: "/quotes", label: "Cotizaciones", icon: <FileText size={16} /> },
  { to: "/sales", label: "Ventas", icon: <TrendingUp size={16} /> },
  { to: "/invoices", label: "Facturación", icon: <Receipt size={16} /> },
  { to: "/postsale", label: "Post-Venta", icon: <ClipboardCheck size={16} /> },
  { to: "/reports", label: "Reportes", icon: <BarChart2 size={16} /> },
];

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Navbar() {
  const { user, logout, isOwner } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleShow = (key) =>
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));

  const openModal = () => {
    setDropdownOpen(false);
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
    setError(""); setSuccess("");
    setModal(true);
  };

  const handleChangePassword = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword)
      return setError("Todos los campos son obligatorios.");
    if (form.newPassword !== form.confirmPassword)
      return setError("Las contraseñas nuevas no coinciden.");
    if (form.newPassword.length < 6)
      return setError("La nueva contraseña debe tener al menos 6 caracteres.");

    setSaving(true); setError("");
    try {
      await api.put("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess("Contraseña actualizada correctamente.");
      setTimeout(() => { setModal(false); setSuccess(""); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cambiar la contraseña.");
    } finally { setSaving(false); }
  };

  const fields = [
    { label: "Contraseña actual", key: "currentPassword" },
    { label: "Nueva contraseña", key: "newPassword" },
    { label: "Confirmar nueva contraseña", key: "confirmPassword" },
  ];

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="logo" style={{ height: 38 }} />
        </div>

        <nav className="sidebar-nav">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link--active" : "")}>
              {l.icon}{l.label}
            </NavLink>
          ))}
          {isOwner && (
            <NavLink to="/users"
              className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link--active" : "")}>
              <UserCog size={16} />Usuarios
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode
              ? <><Sun size={14} style={{ marginRight: 6 }} />Modo claro</>
              : <><Moon size={14} style={{ marginRight: 6 }} />Modo oscuro</>}
          </button>

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div className="sidebar-user" onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                cursor: "pointer", borderRadius: 8, transition: "background 0.15s",
                background: dropdownOpen ? (darkMode ? "#252836" : "#f3f4f6") : "transparent"
              }}>
              <div className="sidebar-avatar">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="sidebar-user-name"
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {user?.name}
                </p>
              </div>
              <Settings size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
            </div>

            {dropdownOpen && (
              <div className="sidebar-dropdown">
                <div className="sidebar-dropdown-header">
                  <p className="sidebar-dropdown-name">{user?.name}</p>
                  <p className="sidebar-dropdown-role">
                    {user?.role === "OWNER" ? "Administrador" : "Trabajador"}
                  </p>
                </div>
                <button className="sidebar-dropdown-btn" onClick={openModal}>
                  <KeyRound size={14} />
                  Cambiar contraseña
                </button>
              </div>
            )}
          </div>

          <button className="sidebar-logout" onClick={logout}>
            <LogOut size={14} style={{ marginRight: 6 }} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {modal && (
        <div className="cp-overlay">
          <div className="cp-modal">
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Cambiar contraseña</h2>
              <button className="cp-close-btn" onClick={() => setModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cp-form">
              {fields.map(({ label, key }) => (
                <div key={key} className="cp-form-group">
                  <label className="cp-label">{label}</label>
                  <div className="cp-input-wrap">
                    <input
                      className="cp-input"
                      type={showPasswords[key] ? "text" : "password"}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button type="button" className="cp-eye-btn" tabIndex={-1}
                      onClick={() => toggleShow(key)}>
                      {showPasswords[key] ? <EyeOpen /> : <EyeOff />}
                    </button>
                  </div>
                </div>
              ))}

              {error && <p className="cp-error">⚠ {error}</p>}
              {success && <p className="cp-success">✓ {success}</p>}

              <div className="cp-modal-footer">
                <button className="cl-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button className="cl-btn-success" onClick={handleChangePassword} disabled={saving}>
                  {saving ? "Guardando…" : "Cambiar contraseña"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}