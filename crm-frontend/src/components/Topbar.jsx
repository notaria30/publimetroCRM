import { useState, useRef, useEffect } from "react";
import { LogOut, Sun, Moon, Settings, KeyRound, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

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

export default function Topbar() {
  const { user, logout } = useAuth();
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
      <header className="topbar">
        <div className="topbar-right">
          
          <button className="topbar-icon-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>

          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div className="topbar-user" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <div className="topbar-avatar">
                {user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <p className="topbar-user-name">{user?.name}</p>
              <Settings size={14} strokeWidth={1.5} style={{ color: "#9ca3af", flexShrink: 0 }} />
            </div>

            {dropdownOpen && (
              <div className="topbar-dropdown">
                <div className="topbar-dropdown-header">
                  <p className="topbar-dropdown-name">{user?.name}</p>
                  <p className="topbar-dropdown-role">
                    {user?.role === "OWNER" ? "Administrador" : "Trabajador"}
                  </p>
                </div>
                <button className="topbar-dropdown-btn" onClick={openModal}>
                  <KeyRound size={15} strokeWidth={1.5} />
                  Cambiar contraseña
                </button>
                <button className="topbar-dropdown-btn logout-btn" onClick={logout}>
                  <LogOut size={15} strokeWidth={1.5} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {modal && (
        <div className="cp-overlay">
          <div className="cp-modal">
            <div className="cp-modal-header">
              <h2 className="cp-modal-title">Cambiar contraseña</h2>
              <button className="cp-close-btn" onClick={() => setModal(false)}>
                <X size={20} strokeWidth={1.5} />
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
