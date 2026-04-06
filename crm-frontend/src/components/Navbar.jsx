import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText,
  TrendingUp, Receipt, HeadphonesIcon, BarChart2,
  LogOut, Sun, Moon, ClipboardCheck, UserCog, Settings, KeyRound, X
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";
import logo from "../assets/logo.svg";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard",    icon: <LayoutDashboard size={16} /> },
  { to: "/clients",   label: "Clientes",     icon: <Users size={16} /> },
  { to: "/quotes",    label: "Cotizaciones", icon: <FileText size={16} /> },
  { to: "/sales",     label: "Ventas",       icon: <TrendingUp size={16} /> },
  { to: "/invoices",  label: "Facturación",  icon: <Receipt size={16} /> },
  { to: "/postsale",  label: "Post-Venta",   icon: <ClipboardCheck size={16} /> },
  { to: "/reports",   label: "Reportes",     icon: <BarChart2 size={16} /> },
];

export default function Navbar() {
  const { user, logout, isOwner } = useAuth();
  const { darkMode, setDarkMode } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modal, setModal]               = useState(false);
  const [form, setForm]                 = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const dropdownRef = useRef(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openModal = () => {
    setDropdownOpen(false);
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
        newPassword:     form.newPassword,
      });
      setSuccess("Contraseña actualizada correctamente.");
      setTimeout(() => { setModal(false); setSuccess(""); }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cambiar la contraseña.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img src={logo} alt="logo" style={{ height: 38 }} />
        </div>

        {/* Links */}
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

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode
              ? <><Sun size={14} style={{ marginRight: 6 }} />Modo claro</>
              : <><Moon size={14} style={{ marginRight: 6 }} />Modo oscuro</>}
          </button>

          {/* Usuario con dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              className="sidebar-user"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ cursor: "pointer", borderRadius: 8, transition: "background 0.15s",
                background: dropdownOpen ? (darkMode ? "#252836" : "#f3f4f6") : "transparent" }}
            >
              <div className="sidebar-avatar">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
                <p className="sidebar-user-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name}
                </p>
              </div>
              <Settings size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
                background: darkMode ? "#1e293b" : "white",
                border: `1px solid ${darkMode ? "#334155" : "#e5e7eb"}`,
                borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                overflow: "hidden", zIndex: 200,
              }}>
                <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${darkMode ? "#334155" : "#f0f0f0"}` }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: darkMode ? "#f1f5f9" : "#111827" }}>
                    {user?.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                    {user?.role === "OWNER" ? "Administrador" : "Trabajador"}
                  </p>
                </div>
                <button
                  onClick={openModal}
                  style={{
                    width: "100%", padding: "10px 14px", background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, color: darkMode ? "#cbd5e1" : "#374151",
                    fontFamily: "inherit", transition: "background 0.12s", textAlign: "left",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "#253347" : "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
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

      {/* MODAL cambiar contraseña */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: darkMode ? "#1e293b" : "white",
            borderRadius: 14, padding: 28, width: "100%", maxWidth: 420,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: darkMode ? "#f1f5f9" : "#111827" }}>
                Cambiar contraseña
              </h2>
              <button onClick={() => setModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Contraseña actual",       key: "currentPassword" },
                { label: "Nueva contraseña",         key: "newPassword" },
                { label: "Confirmar nueva contraseña", key: "confirmPassword" },
              ].map(({ label, key }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{label}</label>
                  <input
                    className="sl-input"
                    type="password"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              ))}

              {error   && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>⚠ {error}</p>}
              {success && <p style={{ color: "#16a34a", fontSize: 13, margin: 0 }}>✓ {success}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="sl-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button className="sl-btn-save" onClick={handleChangePassword} disabled={saving}>
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