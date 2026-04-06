import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getUsers, createWorker, updateUser, deleteUser } from "../../services/userService";
import { UserPlus, X } from "lucide-react";
import "../../pages/sales/sales.css";
import { LoadingPage } from "../../components/LoadingPage";
import { Navigate } from "react-router-dom";

const EMPTY_FORM = { name: "", email: "", password: "", role: "WORKER" };

export default function UsersPage() {
  const { isOwner } = useAuth();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);   // "create" | "edit" | false
  const [selected, setSelected] = useState(null);    // usuario a editar
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  if (!isOwner) return <Navigate to="/dashboard" replace />;

  const load = () => {
    setLoading(true);
    getUsers()
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
    setError("");
    setModal("create");
  };

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setSelected(user);
    setError("");
    setModal("edit");
  };

  const closeModal = () => { setModal(false); setSelected(null); setError(""); };

  const handleSave = async () => {
    if (!form.name || !form.email) return setError("Nombre y email son obligatorios.");
    if (modal === "create" && !form.password) return setError("La contraseña es obligatoria.");
    setSaving(true); setError("");
    try {
      if (modal === "create") {
        await createWorker(form);
      } else {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUser(selected._id, payload);
      }
      closeModal();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteUser(user._id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Error al eliminar.");
    }
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="sl-page">

      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Usuarios del sistema</h1>
        <button className="sl-btn-primary" onClick={openCreate}>
          <UserPlus size={15} /> Nuevo usuario
        </button>
      </div>

      {/* STATS */}
      <div className="sl-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Total usuarios",   val: users.length,                                  cls: "sl-stat-box--blue"   },
          { label: "Administradores",  val: users.filter(u => u.role === "OWNER").length,  cls: "sl-stat-box--green"  },
          { label: "Trabajadores",     val: users.filter(u => u.role === "WORKER").length, cls: "sl-stat-box--yellow" },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`sl-stat-box ${cls}`}>
            <p className="sl-stat-num sl-stat-num--blue" style={{ fontSize: 28 }}>{val}</p>
            <p className="sl-stat-label">{label}</p>
          </div>
        ))}
        <div className="sl-stat-box sl-stat-box--red" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p className="sl-stat-label" style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            Solo el administrador puede gestionar usuarios
          </p>
        </div>
      </div>

      {/* TABLA */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`sl-badge ${u.role === "OWNER" ? "sl-badge--success" : "sl-badge--info"}`}>
                    {u.role === "OWNER" ? "Administrador" : "Trabajador"}
                  </span>
                </td>
                <td>
                  <div className="sl-actions">
                    <button className="sl-btn-outline" onClick={() => openEdit(u)}>Editar</button>
                    <button
                      className="sl-btn-outline"
                      style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                      onClick={() => handleDelete(u)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="sl-empty">No hay usuarios registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>
                {modal === "create" ? "Nuevo usuario" : "Editar usuario"}
              </h2>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="sl-form-group">
                <label className="sl-label">Nombre completo</label>
                <input className="sl-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Juan Pérez" />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Email</label>
                <input className="sl-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@empresa.com" />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">{modal === "edit" ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}</label>
                <input className="sl-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Rol</label>
                <select className="sl-select-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="WORKER">Trabajador</option>
                  <option value="OWNER">Administrador</option>
                </select>
              </div>

              {error && <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>⚠ {error}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="sl-btn-secondary" onClick={closeModal}>Cancelar</button>
                <button className="sl-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando…" : modal === "create" ? "Crear usuario" : "Guardar cambios"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}