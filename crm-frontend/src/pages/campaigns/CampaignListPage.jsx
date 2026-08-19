import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCampaigns } from "../../services/campaignService";
import { Plus } from "lucide-react";
import "../clients/clients.css";
import { TableSkeleton } from "../../components/skeletons/TableSkeleton";

const STATUS_CAMP = {
  planificada: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "Planificada" },
  en_curso:    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", label: "En curso"    },
  finalizada:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Finalizada"  },
  cancelada:   { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", label: "Cancelada"   },
};

export default function CampaignListPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getCampaigns()
      .then((res) => setCampaigns(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <TableSkeleton
      pageClass="cl-page" headerClass="cl-header"
      hasSearch={false} actions={1}
      tableWrapClass="cl-table-wrap" tableClass="cl-table"
      columns={6} rows={6}
    />
  );

  return (
    <div className="cl-page">

      <div className="cl-header">
        <h1 className="cl-title">Campañas</h1>
        <button className="cl-btn-primary" onClick={() => navigate("/campaigns/new")}>
          <Plus size={14} /> Crear campaña
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="cl-card">
          <p className="cl-empty" style={{ margin: 0 }}>No hay campañas registradas.</p>
        </div>
      ) : (
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const s = STATUS_CAMP[c.status] || { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb", label: c.status };
                return (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                    <td>{c.client?.nombreComercial || "—"}</td>
                    <td>
                      <span className="cl-badge"
                        style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
                        {s.label}
                      </span>
                    </td>
                    <td>{c.fechaInicio ? new Date(c.fechaInicio).toLocaleDateString("es-MX", { timeZone: "UTC" }) : "—"}</td>
                    <td>{c.fechaFin    ? new Date(c.fechaFin).toLocaleDateString("es-MX", { timeZone: "UTC" })    : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <button className="cl-btn-outline"
                        onClick={() => navigate(`/clients/${c.client?._id}/campaigns/${c._id}`)}>
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