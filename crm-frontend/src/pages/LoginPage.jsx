import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";
import logo from "../assets/logo.svg";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Credenciales incorrectas.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrapper">

      {/* Lado izquierdo */}
      <div className="login-left">
        <img src={logo} alt="PubliMetro" className="login-logo" />
        <h1 className="login-title">Bienvenido<br />de nuevo</h1>
        <p className="login-subtitle">
          Accede al sistema para gestionar tus clientes y
          toda tu operación desde un solo lugar.
        </p>
      </div>

      {/* Lado derecho */}
      <div className="login-right">
        <div className="login-card">
          <h2 className="login-card-title">Iniciar sesión</h2>
          <p className="login-card-sub">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-label">Email</label>
              <input className="login-input" type="email" placeholder="correo@empresa.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="login-form-group">
              <label className="login-label">Contraseña</label>
              <div className="login-input-wrapper">
                <input
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="login-remember">
              <input type="checkbox" />
              Recuérdame
            </label>

            {error && <div className="login-error">⚠ {error}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <hr className="login-divider" />
          <p className="login-footer">PubliMetro Querétaro © {new Date().getFullYear()}</p>
        </div>
      </div>

    </div>
  );
}