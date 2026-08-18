import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { createClient, checkRFC, checkClientName } from "../../services/clientService";
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

const INDUSTRIAS = [
  "autos", "inmobiliaria", "restaurantes", "hoteles", "tiendas departamentales",
  "tiendas de conveniencia", "hospitales", "opticas", "farmacias", "gimnasios",
  "clinicas", "escuelas", "universidades", "clubs deportivos", "eventos o espectaculos",
  "servicios financieros", "aseguradoras", "notarias", "talleres mecanicos",
  "distribuidoras de autos", "cursos o diplomados", "laboratorios medicos",
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

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`cl-toast cl-toast--${type}`}>{msg}</div>;
}

export default function ClientCreatePage() {
  const navigate = useNavigate();
  const { isOwner, isWorker, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [rfcInfo, setRfcInfo] = useState(null);
  const [nameInfo, setNameInfo] = useState(null);
  const [razonSocialInfo, setRazonSocialInfo] = useState(null);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    nombreComercial: "", razonSocial: "", rfc: "", curp: "",
    direccion: { calleNumero: "", colonia: "", ciudad: "", estado: "", pais: "", cp: "", telefono: "" },
    regimen: "", agenciaODirecto: "", tipoCliente: "", tipoIndustria: "",
    contactos: {
      mercadotecnia: { nombre: "", email: "", celular: "" },
      diseno: { nombre: "", email: "", celular: "" },
      facturacion: { nombre: "", email: "", celular: "" },
    },
    status: "prospecto",
    assignedTo: "",
  });

  useEffect(() => {
    if (isOwner) getUsers().then((r) => setUsers(r.data)).catch(console.error);
  }, []);

  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const setDir = (f, v) => setForm((p) => ({ ...p, direccion: { ...p.direccion, [f]: v } }));
  const setCont = (area, f, v) =>
    setForm((p) => ({ ...p, contactos: { ...p.contactos, [area]: { ...p.contactos[area], [f]: v } } }));

  const handleRFCBlur = async () => {
    if (!form.rfc) return;
    try { setRfcInfo((await checkRFC(form.rfc)).data); } catch { }
  };

  const handleNameBlur = async () => {
    if (!form.nombreComercial) return;
    try { setNameInfo((await checkClientName(form.nombreComercial)).data); } catch { }
  };

  const handleRazonSocialBlur = async () => {
    if (!form.razonSocial) return;
    try { setRazonSocialInfo((await checkClientName(form.razonSocial)).data); } catch { }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.regimen || !form.agenciaODirecto || !form.tipoCliente || !form.tipoIndustria) {
      setToast({ msg: "Completa Régimen, Agencia/Directo, Tipo de Cliente e Industria", type: "error" });
      return;
    }

    try {
      // Validaciones en tiempo real al enviar
      if (form.rfc) {
        const rfcRes = await checkRFC(form.rfc);
        if (rfcRes.data.exists) {
          setRfcInfo(rfcRes.data);
          setToast({ msg: <span>Este <strong>RFC</strong> ya pertenece al cliente <strong>{rfcRes.data.clientName}</strong></span>, type: "error" });
          return;
        }
      }
      if (form.nombreComercial) {
        const nameRes = await checkClientName(form.nombreComercial);
        if (nameRes.data.exists) {
          setNameInfo(nameRes.data);
          setToast({ msg: `Este Nombre Comercial ya existe (Registrado con: ${nameRes.data.workerName})`, type: "error" });
          return;
        }
      }
      if (form.razonSocial) {
        const razonSocialRes = await checkClientName(form.razonSocial);
        if (razonSocialRes.data.exists) {
          setRazonSocialInfo(razonSocialRes.data);
          setToast({ msg: `Esta Razón Social ya existe (Registrado con: ${razonSocialRes.data.workerName})`, type: "error" });
          return;
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ msg: "Error al validar campos duplicados", type: "error" });
      return;
    }

    const payload = { ...form };
    if (isWorker) payload.assignedTo = user._id;

    try {
      await createClient(payload);
      setToast({ msg: "Cliente creado correctamente", type: "success" });
      setTimeout(() => navigate("/clients"), 1200);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Error creando cliente";
      setToast({ msg: errorMsg, type: "error" });
    }
  };

  return (
    <div className="cl-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="cl-header-row">
        <h1 className="cl-title">Nuevo Cliente</h1>
        <button className="cl-btn-secondary" onClick={() => navigate("/clients")}>
          <ArrowLeft size={14} /> Volver
        </button>
      </div>

      <form onSubmit={handleSubmit}>

        {/* DATOS GENERALES */}
        <div className="cl-card">
          <p className="cl-section-title">Datos Generales</p>
          <div className="cl-form-grid">
            <div className="cl-form-group">
              <label className="cl-label">Nombre Comercial</label>
              <input className="cl-input" value={form.nombreComercial}
                onChange={(e) => { set("nombreComercial", e.target.value); setNameInfo(null); }}
                onBlur={handleNameBlur} />
              {nameInfo?.exists && (
                <div className="cl-alert cl-alert--warning">
                  Cliente ya registrado con: <strong>{nameInfo.workerName}</strong>
                </div>
              )}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">Razón Social</label>
              <input className="cl-input" value={form.razonSocial}
                onChange={(e) => { set("razonSocial", e.target.value); setRazonSocialInfo(null); }}
                onBlur={handleRazonSocialBlur} />
              {razonSocialInfo?.exists && (
                <div className="cl-alert cl-alert--warning">
                  Razón Social ya registrada con: <strong>{razonSocialInfo.workerName}</strong>
                </div>
              )}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">RFC</label>
              <input className="cl-input" value={form.rfc}
                onChange={(e) => { set("rfc", e.target.value.toUpperCase()); setRfcInfo(null); }}
                onBlur={handleRFCBlur} />
              {rfcInfo?.exists && (
                <div className="cl-alert cl-alert--error">
                  Este <strong>RFC</strong> ya pertenece al cliente <strong>{rfcInfo.clientName}</strong>
                </div>
              )}
            </div>

            <div className="cl-form-group">
              <label className="cl-label">CURP</label>
              <input className="cl-input" value={form.curp} onChange={(e) => set("curp", e.target.value)} />
            </div>
          </div>
        </div>

        {/* DIRECCIÓN */}
        <div className="cl-card">
          <p className="cl-section-title">Dirección</p>
          <div className="cl-form-grid">
            {[["calleNumero", "Calle y Número"], ["colonia", "Colonia"], ["ciudad", "Ciudad"],
            ["estado", "Estado"], ["pais", "País"], ["cp", "CP"], ["telefono", "Teléfono"]].map(([f, l]) => (
              <div className="cl-form-group" key={f}>
                <label className="cl-label">{l}</label>
                {f === "estado" ? (
                  <select className="cl-select" value={form.direccion[f]} onChange={(e) => setDir(f, e.target.value)}>
                    <option value="">Seleccione Estado...</option>
                    {ESTADOS.map((est) => <option key={est} value={est}>{est}</option>)}
                  </select>
                ) : (
                  <input className="cl-input" value={form.direccion[f]} onChange={(e) => setDir(f, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CLASIFICACIÓN */}
        <div className="cl-card">
          <p className="cl-section-title">Clasificación del Cliente</p>
          <div className="cl-form-grid">
            <div className="cl-form-group">
              <label className="cl-label">Régimen Fiscal</label>
              <select className="cl-select" value={form.regimen} onChange={(e) => set("regimen", e.target.value)}>
                <option value="">Seleccione...</option>
                {REGIMENES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Agencia o Directo</label>
              <select className="cl-select" value={form.agenciaODirecto} onChange={(e) => set("agenciaODirecto", e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="AGENCIA">AGENCIA</option>
                <option value="DIRECTO">DIRECTO</option>
              </select>
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Tipo de Cliente</label>
              <select className="cl-select" value={form.tipoCliente} onChange={(e) => set("tipoCliente", e.target.value)}>
                <option value="">Seleccione...</option>
                <option value="iniciativa privada">Iniciativa Privada</option>
                <option value="gobierno">Gobierno</option>
                <option value="corporativo">Corporativo</option>
              </select>
            </div>
            <div className="cl-form-group">
              <label className="cl-label">Industria</label>
              <select className="cl-select" value={form.tipoIndustria} onChange={(e) => set("tipoIndustria", e.target.value)}>
                <option value="">Seleccione una opción</option>
                {INDUSTRIAS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

          </div>
        </div>

        {/* CONTACTOS */}
        <div className="cl-card">
          <p className="cl-section-title">Contactos</p>
          {["mercadotecnia", "diseno", "facturacion"].map((area) => (
            <div key={area} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 10, textTransform: "capitalize" }}>{area}</p>
              <div className="cl-form-grid">
                {["nombre", "email", "celular"].map((f) => (
                  <div className="cl-form-group" key={f}>
                    <label className="cl-label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                    <input className="cl-input" value={form.contactos[area][f]}
                      onChange={(e) => setCont(area, f, e.target.value)} />
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
            {isOwner && (
              <div className="cl-form-group">
                <label className="cl-label">Ejecutivo Asignado</label>
                <select className="cl-select" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
                  <option value="">Seleccione usuario...</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}

          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="cl-btn-primary" style={{ padding: "10px 28px", fontSize: 15 }}>
            Guardar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}