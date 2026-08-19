import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClientById, updateClient, deleteClient } from "../../services/clientService";
import { getUsers } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Pencil, Trash2, X, Check } from "lucide-react";
import { DetailSkeleton } from "../../components/skeletons/DetailSkeleton";
import "./clients.css";

const REGIMENES = [
  "REGIMEN GENERAL DE LEY PERSONAS MORALES",
  "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS MORALES",
  "PERSONAS MORALES CON FINES NO LUCRATIVOS",
  "RÉGIMEN DE PEQUEÑOS CONTRIBUYENTES",
  "RÉGIMEN DE SUELDOS Y SALARIOS E INGRESOS ASIMILADOS A SALARIOS",
  "RÉGIMEN DE ARRENDAMIENTO",
  "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS FÍSICAS",
  "RÉGIMEN DE INCORPORACIÓN FISCAL",
];

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`cl-toast cl-toast--${type}`}>{msg}</div>;
}

function Field({ label, value, editing, children }) {
  return (
    <div className="cl-form-group">
      <label className="cl-label">{label}</label>
      {editing ? children : <input className="cl-input" value={value || "—"} readOnly />}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [users, setUsers] = useState([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    try {
      const res = await getClientById(id);
      setClient(res.data);
      setAssignedToId(res.data.assignedTo?._id || "");
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (isOwner) getUsers().then((r) => setUsers(r.data)).catch(console.error);
  }, []);

  const set = (field, val) => setClient((c) => ({ ...c, [field]: val }));
  const setDir = (field, val) => setClient((c) => ({ ...c, direccion: { ...c.direccion, [field]: val } }));
  const setCont = (area, field, val) =>
    setClient((c) => ({ ...c, contactos: { ...c.contactos, [area]: { ...c.contactos[area], [field]: val } } }));

  const handleSave = async () => {
    try {
      const payload = { ...client };
      if (isOwner && assignedToId) payload.assignedTo = assignedToId;
      await updateClient(id, payload);
      setToast({ msg: "Cliente actualizado correctamente", type: "success" });
      setEditing(false);
      await load();
    } catch { setToast({ msg: "Error al actualizar el cliente", type: "error" }); }
  };

  const handleDelete = async () => {
    try {
      await deleteClient(id);
      setToast({ msg: "Cliente eliminado", type: "success" });
      setTimeout(() => navigate("/clients"), 1000);
    } catch { setToast({ msg: "Error al eliminar el cliente", type: "error" }); }
  };

  if (loading || !client) return (
    <DetailSkeleton
      pageClass="cl-page" headerClass="cl-header-row" actions={3} titleWidth={200}
      cards={[
        { cardClass: "cl-card", gridClass: "cl-form-grid", lines: 6 },
        { cardClass: "cl-card", gridClass: "cl-form-grid", lines: 4 },
      ]}
    />
  );

  return (
    <div className="cl-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="cl-header-row">
        <h1 className="cl-title">Detalles del Cliente</h1>
        <div className="cl-header-row-right">
          <button className="cl-btn-secondary" onClick={() => navigate("/clients")}>
            <ArrowLeft size={14} /> Volver
          </button>
          {!editing ? (
            <>
              <button className="cl-btn-primary" onClick={() => setEditing(true)}>
                <Pencil size={14} /> Editar
              </button>
              {isOwner && (
                <button className="cl-btn-danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
            </>
          ) : (
            <>
              <button className="cl-btn-secondary" onClick={async () => { await load(); setEditing(false); }}>
                <X size={14} /> Cancelar
              </button>
              <button className="cl-btn-success" onClick={handleSave}>
                <Check size={14} /> Guardar cambios
              </button>
            </>
          )}
        </div>
      </div>

      {/* DATOS GENERALES */}
      <div className="cl-card">
        <p className="cl-section-title">Datos Generales</p>
        <div className="cl-form-grid">
          {[["nombreComercial","Nombre Comercial"],["razonSocial","Razón Social"],["rfc","RFC"],["curp","CURP"]].map(([f,l]) => (
            <Field key={f} label={l} value={client[f]} editing={editing}>
              <input className="cl-input" value={client[f] || ""} onChange={(e) => set(f, e.target.value)} />
            </Field>
          ))}

          <Field label="Status" value={client.status?.charAt(0).toUpperCase() + client.status?.slice(1)} editing={false}>
          </Field>

          <Field label="Tipo de Cliente" value={client.tipoCliente} editing={editing}>
            <select className="cl-select" value={client.tipoCliente || ""} onChange={(e) => set("tipoCliente", e.target.value)}>
              <option value="iniciativa privada">Iniciativa Privada</option>
              <option value="gobierno">Gobierno</option>
              <option value="corporativo">Corporativo</option>
            </select>
          </Field>

          <Field label="Industria" value={client.tipoIndustria} editing={editing}>
            <select className="cl-select" value={client.tipoIndustria || ""} onChange={(e) => set("tipoIndustria", e.target.value)}>
              {["alimentaria","hotelera","automotriz","construccion","servicios financieros"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="Régimen Fiscal" value={client.regimen} editing={editing}>
            <select className="cl-select" value={client.regimen || ""} onChange={(e) => set("regimen", e.target.value)}>
              {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Agencia / Directo" value={client.agenciaODirecto} editing={editing}>
            <select className="cl-select" value={client.agenciaODirecto || ""} onChange={(e) => set("agenciaODirecto", e.target.value)}>
              <option value="AGENCIA">AGENCIA</option>
              <option value="DIRECTO">DIRECTO</option>
            </select>
          </Field>
        </div>
      </div>

      {/* DIRECCIÓN */}
      <div className="cl-card">
        <p className="cl-section-title">Dirección</p>
        <div className="cl-form-grid">
          {[["calleNumero","Calle y Número"],["colonia","Colonia"],["ciudad","Ciudad"],
            ["estado","Estado"],["pais","País"],["cp","CP"],["telefono","Teléfono"]].map(([f,l]) => (
            <Field key={f} label={l} value={client.direccion?.[f]} editing={editing}>
              <input className="cl-input" value={client.direccion?.[f] || ""} onChange={(e) => setDir(f, e.target.value)} />
            </Field>
          ))}
        </div>
      </div>

      {/* CONTACTOS */}
      <div className="cl-card">
        <p className="cl-section-title">Contactos</p>
        {["mercadotecnia","diseno","facturacion"].map((area) => (
          <div key={area} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 10, textTransform: "capitalize" }}>{area}</p>
            <div className="cl-form-grid">
              {["nombre","email","celular"].map((f) => (
                <Field key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} value={client.contactos?.[area]?.[f]} editing={editing}>
                  <input className="cl-input" value={client.contactos?.[area]?.[f] || ""} onChange={(e) => setCont(area, f, e.target.value)} />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ASIGNACIÓN */}
      <div className="cl-card">
        <p className="cl-section-title">Asignación</p>
        <div className="cl-form-grid">
          <Field label="Ejecutivo Asignado" value={client.assignedTo?.name || "N/A"} editing={editing && isOwner}>
            <select className="cl-select" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
            </select>
          </Field>


        </div>
      </div>

      {/* HISTORIAL */}
      <div className="cl-card">
        <p className="cl-section-title">Historial</p>
        <div className="cl-form-grid">
          <Field label="Creado el" value={client.createdAt ? new Date(client.createdAt).toLocaleString() : "—"} editing={false}>
          </Field>
          <Field label="Actualizado el" value={client.updatedAt ? new Date(client.updatedAt).toLocaleString() : "—"} editing={false}>
          </Field>
        </div>
      </div>

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="cl-dialog-overlay">
          <div className="cl-dialog">
            <p className="cl-dialog-title">Eliminar cliente</p>
            <p className="cl-dialog-body">¿Seguro que quieres eliminar este cliente? Esta acción no se puede deshacer.</p>
            <div className="cl-dialog-actions">
              <button className="cl-btn-secondary" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="cl-btn-danger" style={{ background: "#dc2626", color: "white", borderColor: "#dc2626" }} onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}