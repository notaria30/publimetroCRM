import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";
import logo from "../assets/logo.svg";

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
              <input className="login-input" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
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