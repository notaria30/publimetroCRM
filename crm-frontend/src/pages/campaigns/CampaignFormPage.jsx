import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createCampaign, updateCampaign, getCampaignById } from "../../services/campaignService";
import { getClients } from "../../services/clientService";
import { ArrowLeft, Save } from "lucide-react";
import "../clients/clients.css";
import { DetailSkeleton } from "../../components/skeletons/DetailSkeleton";

export default function CampaignFormPage() {
  const { clientId, campId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(campId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    nombre: "", client: "", fechaInicio: "", fechaFin: "",
    status: "planificada", descripcion: "", formatos: [], periodicidad: "", cortesias: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const clientsRes = await getClients();
        setClients(clientsRes.data);
        if (isEdit) {
          const res = await getCampaignById(campId);
          const c = res.data;
          setForm({
            nombre: c.nombre || "", client: c.client?._id || "",
            fechaInicio: c.fechaInicio?.substring(0, 10) || "",
            fechaFin: c.fechaFin?.substring(0, 10) || "",
            status: c.status || "planificada", descripcion: c.descripcion || "",
            formatos: c.formatos || [], periodicidad: c.periodicidad || "", cortesias: c.cortesias || "",
          });
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [campId, isEdit]);

  const handleSubmit = async () => {
    if (!form.nombre.trim() || !form.client)
      return setError("Completa el nombre y selecciona un cliente.");
    setSaving(true); setError("");
    try {
      let res;
      if (isEdit) {
        res = await updateCampaign(campId, form);
      } else {
        res = await createCampaign({ ...form, client: form.client || clientId });
      }
      const campaign = res?.data?.campaign ?? res?.data;
      if (!campaign?._id) return setError("La campaña se guardó pero hubo un error en la respuesta.");
      const resolvedClientId = campaign.client?._id ?? campaign.client ?? (form.client || clientId);
      navigate(`/clients/${resolvedClientId}/campaigns/${campaign._id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Error al guardar la campaña.");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <DetailSkeleton
      pageClass="cl-page" headerClass="cl-header-row" actions={2} titleWidth={190}
      cards={[
        { cardClass: "cl-card", gridClass: "cl-form-grid", lines: 8 },
      ]}
    />
  );

  return (
    <div className="cl-page">

      {/* Header */}
      <div className="cl-header-row">
        <h1 className="cl-title">{isEdit ? "Editar campaña" : "Nueva campaña"}</h1>
        <div className="cl-header-row-right">
          <button className="cl-btn-secondary"
            onClick={() => navigate(`/clients/${clientId}/campaigns`)}>
            <ArrowLeft size={14} /> Cancelar
          </button>
          <button className="cl-btn-success" onClick={handleSubmit} disabled={saving}>
            <Save size={14} /> {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear campaña"}
          </button>
        </div>
      </div>

      {error && <div className="cl-alert cl-alert--error" style={{ marginBottom: 16 }}>⚠ {error}</div>}

      {/* Datos generales */}
      <div className="cl-card">
        <p className="cl-section-title">Datos de la campaña</p>
        <div className="cl-form-grid">
          <div className="cl-form-group" style={{ gridColumn: "span 2" }}>
            <label className="cl-label">Nombre de la campaña *</label>
            <input className="cl-input" placeholder="Ej. Campaña verano 2026"
              value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Cliente *</label>
            <select className="cl-select" value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}>
              <option value="">Seleccionar cliente…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.nombreComercial}</option>
              ))}
            </select>
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Status</label>
            <select className="cl-select" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="planificada">Planificada</option>
              <option value="en_curso">En curso</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Fecha inicio</label>
            <input className="cl-input" type="date" value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Fecha fin</label>
            <input className="cl-input" type="date" value={form.fechaFin}
              onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
          </div>

          <div className="cl-form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="cl-label">Descripción</label>
            <textarea className="cl-input" rows={3} placeholder="Descripción de la campaña…"
              style={{ resize: "vertical" }}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Detalles adicionales */}
      <div className="cl-card">
        <p className="cl-section-title">Detalles adicionales</p>
        <div className="cl-form-grid">
          <div className="cl-form-group">
            <label className="cl-label">Formatos</label>
            <input className="cl-input" placeholder="Ej. 1/2 plana, cintillo"
              value={form.formatos.join(", ")}
              onChange={(e) => setForm({ ...form, formatos: e.target.value.split(",").map(f => f.trim()) })} />
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Periodicidad</label>
            <input className="cl-input" placeholder="Ej. Semanal, mensual"
              value={form.periodicidad}
              onChange={(e) => setForm({ ...form, periodicidad: e.target.value })} />
          </div>

          <div className="cl-form-group">
            <label className="cl-label">Cortesías</label>
            <input className="cl-input" placeholder="Ej. 2 cortesías"
              value={form.cortesias}
              onChange={(e) => setForm({ ...form, cortesias: e.target.value })} />
          </div>
        </div>
      </div>

    </div>
  );
}