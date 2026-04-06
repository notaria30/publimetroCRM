import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCampaignsByClient } from "../../services/campaignService";
import { ArrowLeft, Plus } from "lucide-react";
import "./clients.css";

const STATUS_CAMP = {
  planificada: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  en_curso:    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  finalizada:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  cancelada:   { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
};

export default function ClientCampaignsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaignsByClient(id)
      .then((res) => setCampaigns(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="cl-status">Cargando campañas...</div>;

  return (
    <div className="cl-page">
      <div className="cl-header" style={{ marginBottom: 20 }}>
        <h1 className="cl-title">Campañas del cliente</h1>
        <div className="cl-header-actions">
          <button className="cl-btn-secondary" onClick={() => navigate("/clients")}>
            <ArrowLeft size={14} /> Volver
          </button>
          <button className="cl-btn-primary" onClick={() => navigate(`/clients/${id}/campaigns/new`)}>
            <Plus size={14} /> Nueva campaña
          </button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="cl-card">
          <p className="cl-empty" style={{ margin: 0 }}>No hay campañas. Crea una arriba.</p>
        </div>
      ) : (
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Status</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const s = STATUS_CAMP[c.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
                return (
                  <tr key={c._id}>
                    <td>{c.nombre}</td>
                    <td>
                      <span className="cl-badge" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.fechaInicio?.substring(0, 10)}</td>
                    <td>{c.fechaFin?.substring(0, 10)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button className="cl-btn-outline" onClick={() => navigate(`/clients/${id}/campaigns/${c._id}`)}>
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}