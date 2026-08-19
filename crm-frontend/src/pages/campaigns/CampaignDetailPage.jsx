import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCampaignById } from "../../services/campaignService";
import { ArrowLeft, Pencil } from "lucide-react";
import "../clients/clients.css";
import { DetailSkeleton } from "../../components/skeletons/DetailSkeleton";

const STATUS_CAMP = {
  planificada: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "Planificada" },
  en_curso:    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", label: "En curso"    },
  finalizada:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Finalizada"  },
  cancelada:   { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", label: "Cancelada"   },
};

export default function CampaignDetailPage() {
  const { clientId, campId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    getCampaignById(campId)
      .then((res) => setCampaign(res.data))
      .catch((err) => {
        const status = err?.response?.status;
        setError(status === 403 ? "No tienes permiso para ver esta campaña."
          : status === 404 ? "Campaña no encontrada." : "Error cargando campaña.");
      })
      .finally(() => setLoading(false));
  }, [campId]);

  if (loading) return (
    <DetailSkeleton
      pageClass="cl-page" headerClass="cl-header-row" actions={2} titleWidth={210}
      cards={[
        { cardClass: "cl-card", gridClass: "cl-form-grid", lines: 6 },
      ]}
    />
  );
  if (error || !campaign)
    return (
      <div className="cl-page">
        <div className="cl-alert cl-alert--error">{error || "Campaña no encontrada."}</div>
      </div>
    );

  const s = STATUS_CAMP[campaign.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb", label: campaign.status };

  return (
    <div className="cl-page">

      {/* Header */}
      <div className="cl-header-row">
        <h1 className="cl-title">{campaign.nombre}</h1>
        <div className="cl-header-row-right">
          <button className="cl-btn-secondary"
            onClick={() => navigate(`/clients/${clientId}/campaigns`)}>
            <ArrowLeft size={14} /> Volver
          </button>
          <button className="cl-btn-primary"
            onClick={() => navigate(`/clients/${clientId}/campaigns/${campId}/edit`)}>
            <Pencil size={14} /> Editar campaña
          </button>
        </div>
      </div>

      {/* Info principal */}
      <div className="cl-card">
        <p className="cl-section-title">Información general</p>
        <div className="cl-form-grid">
          {[
            { label: "Cliente",      value: campaign.client?.nombreComercial || "—" },
            { label: "Fecha inicio", value: campaign.fechaInicio?.substring(0, 10) || "—" },
            { label: "Fecha fin",    value: campaign.fechaFin?.substring(0, 10) || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="cl-form-group">
              <label className="cl-label">{label}</label>
              <input className="cl-input" readOnly value={value} />
            </div>
          ))}

          <div className="cl-form-group">
            <label className="cl-label">Status</label>
            <div style={{ paddingTop: 6 }}>
              <span className="cl-badge"
                style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
                {s.label}
              </span>
            </div>
          </div>

          <div className="cl-form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="cl-label">Descripción</label>
            <textarea className="cl-input" readOnly rows={3} style={{ resize: "none" }}
              value={campaign.descripcion || "Sin descripción"} />
          </div>
        </div>
      </div>

      {/* Detalles adicionales */}
      <div className="cl-card">
        <p className="cl-section-title">Detalles adicionales</p>
        <div className="cl-form-grid">
          {[
            { label: "Formatos",     value: campaign.formatos?.length ? campaign.formatos.join(", ") : "—" },
            { label: "Periodicidad", value: campaign.periodicidad || "—" },
            { label: "Cortesías",    value: campaign.cortesias || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="cl-form-group">
              <label className="cl-label">{label}</label>
              <input className="cl-input" readOnly value={value} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}