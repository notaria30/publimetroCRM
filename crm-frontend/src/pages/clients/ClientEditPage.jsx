import { useState, useEffect } from "react";
import { getClientById, updateClient } from "../../services/clientService";
import { getUsers } from "../../services/userService";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

const ESTADOS = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Coahuila",
  "Colima",
  "Ciudad de México",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Estado de México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas"
];

export default function ClientEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  useEffect(() => {
    Promise.all([getClientById(id), getUsers()])
      .then(([clientRes, usersRes]) => {
        setForm(clientRes.data);
        setUsers(usersRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setDir = (field, val) => setForm((f) => ({ ...f, direccion: { ...f.direccion, [field]: val } }));
  const setCont = (area, field, val) =>
    setForm((f) => ({ ...f, contactos: { ...f.contactos, [area]: { ...f.contactos[area], [field]: val } } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateClient(id, form);
      navigate(`/clients/${id}`);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Error guardando cambios";
      alert(errorMsg);
    }
  };

  if (loading || !form) return <div className="cl-status">Cargando datos...</div>;

  return (
    <div className="cl-page">
      <div className="cl-header-row">
        <h1 className="cl-title">Editar Cliente</h1>
        <button className="cl-btn-secondary" onClick={() => navigate(`/clients/${id}`)}>
          <ArrowLeft size={14} /> Volver
        </button>
      </div>

      <form onSubmit={handleSubmit}>

        {/* DATOS GENERALES */}
        <div className="cl-card">
          <p className="cl-section-title">Datos Generales</p>
          <div className="cl-form-grid">
            {[["nombreComercial","Nombre Comercial"],["razonSocial","Razón Social"],["rfc","RFC"],["curp","CURP"]].map(([f,l]) => (
              <div className="cl-form-group" key={f}>
                <label className="cl-label">{l}</label>
                <input className="cl-input" value={form[f] || ""} onChange={(e) => set(f, e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        {/* DIRECCIÓN */}
        <div className="cl-card">
          <p className="cl-section-title">Dirección</p>
          <div className="cl-form-grid">
            {[["calleNumero","Calle y Número"],["colonia","Colonia"],["ciudad","Ciudad"],["estado","Estado"],["pais","País"],["cp","CP"],["telefono","Teléfono"]].map(([f,l]) => (
              <div className="cl-form-group" key={f}>
                <label className="cl-label">{l}</label>
                {f === "estado" ? (
                  <select className="cl-select" value={form.direccion?.[f] || ""} onChange={(e) => setDir(f, e.target.value)}>
                    <option value="">Seleccione Estado...</option>
                    {ESTADOS.map((est) => <option key={est} value={est}>{est}</option>)}
                  </select>
                ) : (
                  <input className="cl-input" value={form.direccion?.[f] || ""} onChange={(e) => setDir(f, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CLASIFICACIÓN */}
        <div className="cl-card">
          <p className="cl-section-title">Clasificación</p>
          <div className="cl-form-grid">
            <div className="cl-form-group">
              <label className="cl-label">Régimen Fiscal</label>
              <select className="cl-select" value={form.regimen || ""} onChange={(e) => set("regimen", e.target.value)}>
                <option value="">Seleccione...</option>
                {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Agencia o Directo</label>
              <select className="cl-select" value={form.agenciaODirecto || ""} onChange={(e) => set("agenciaODirecto", e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="AGENCIA">AGENCIA</option>
                <option value="DIRECTO">DIRECTO</option>
              </select>
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Tipo de Cliente</label>
              <select className="cl-select" value={form.tipoCliente || ""} onChange={(e) => set("tipoCliente", e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="iniciativa privada">Iniciativa Privada</option>
                <option value="gobierno">Gobierno</option>
                <option value="corporativo">Corporativo</option>
              </select>
            </div>

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
                  <div className="cl-form-group" key={f}>
                    <label className="cl-label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <input className="cl-input" value={form.contactos?.[area]?.[f] || ""} onChange={(e) => setCont(area, f, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ASIGNACIÓN */}
        <div className="cl-card">
          <p className="cl-section-title">Asignación</p>
          <div className="cl-form-grid">
            <div className="cl-form-group">
              <label className="cl-label">Ejecutivo Asignado</label>
              <select className="cl-select" value={form.assignedTo?._id || form.assignedTo || ""} onChange={(e) => set("assignedTo", e.target.value)}>
                <option value="">Seleccione usuario...</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
            </div>

          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="cl-btn-primary" style={{ padding: "10px 28px", fontSize: 15 }}>
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}