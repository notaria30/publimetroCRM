import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPostSaleById, updatePostSale } from "../../services/postSaleService";
import { ArrowLeft } from "lucide-react";
import { DetailSkeleton } from "../../components/skeletons/DetailSkeleton";
import "./postsale.css";
import "../sales/sales.css";

const STAGES = [
  "servicio_post_venta",
  "medicion_resultados",
  "encuesta_satisfaccion",
  "renovacion",
  "reportes"
];

const STAGE_LABELS = {
  servicio_post_venta:   "Servicio Post-Venta",
  medicion_resultados:   "Medición de resultados",
  encuesta_satisfaccion: "Encuesta de satisfacción",
  renovacion:            "Renovación",
  reportes:              "Reportes",
};

export default function PostSaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPostSaleById(id)
      .then((res) => setRecord(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DetailSkeleton
      pageClass="sl-page" headerClass="sl-header" actions={1} titleWidth={220}
      cards={[
        { cardClass: "sl-card", headerClass: "sl-card-header", bodyClass: "sl-card-body", cols: 2, lines: 3 },
        { cardClass: "sl-card", headerClass: "sl-card-header", bodyClass: "sl-card-body", cols: 1, lines: 1 },
      ]}
    />
  );
  if (!record)  return <div className="sl-status">No se encontró el registro.</div>;

  const updateField = async (field, value) => {
    try {
      const res = await updatePostSale(id, { [field]: value });
      setRecord(res.data.updated);
    } catch { alert("Error al guardar"); }
  };

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Seguimiento Post-Venta</h1>
        <div className="sl-header-actions">
          <button className="sl-btn-secondary" onClick={() => navigate("/postsale")}>
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="sl-card">
        <div className="sl-card-header">Información General</div>
        <div className="sl-card-body">
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div className="ps-detail-meta" style={{ flex: 1 }}>
              <p className="ps-detail-client">{record.sale?.client?.nombreComercial || "—"}</p>
              <p className="ps-detail-sub">Venta: <strong>{record.sale?._id || "—"}</strong></p>
              <p className="ps-detail-sub">Ejecutivo: <strong>{record.sale?.assignedTo?.name || "—"}</strong></p>
            </div>
            <div className="sl-form-group" style={{ minWidth: 240 }}>
              <label className="sl-label">Etapa actual</label>
              <select
                className="sl-select-full"
                value={record.postSaleStage || ""}
                onChange={(e) => updateField("postSaleStage", e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s] || s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* MEDICIÓN DE RESULTADOS */}
      <div className="sl-card">
        <div className="sl-card-header">📊 Medición de Resultados</div>
        <div className="sl-card-body">
          <textarea
            className="sl-textarea"
            rows={4}
            placeholder="Describe KPIs, métricas, desempeño…"
            value={record.medicionResultados || ""}
            onChange={(e) => updateField("medicionResultados", e.target.value)}
          />
        </div>
      </div>

      {/* ENCUESTA DE SATISFACCIÓN */}
      <div className="sl-card">
        <div className="sl-card-header">😊 Encuesta de Satisfacción</div>
        <div className="sl-card-body">
          <div className="ps-form-grid-rating">
            <div className="sl-form-group">
              <label className="sl-label">Calificación (1–10)</label>
              <input
                className="sl-input"
                type="number"
                min={1} max={10}
                value={record.encuestaSatisfaccion?.calificacion || ""}
                onChange={(e) =>
                  updateField("encuestaSatisfaccion", {
                    ...record.encuestaSatisfaccion,
                    calificacion: e.target.value,
                  })
                }
              />
            </div>
            <div className="sl-form-group">
              <label className="sl-label">Comentarios</label>
              <textarea
                className="sl-textarea"
                rows={3}
                value={record.encuestaSatisfaccion?.comentarios || ""}
                onChange={(e) =>
                  updateField("encuestaSatisfaccion", {
                    ...record.encuestaSatisfaccion,
                    comentarios: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* RENOVACIÓN */}
      <div className="sl-card">
        <div className="sl-card-header">🔄 Renovación</div>
        <div className="sl-card-body">
          <div className="ps-form-grid-2">
            <div className="sl-form-group">
              <label className="sl-label">¿Requiere renovación?</label>
              <select
                className="sl-select-full"
                value={record.renovacion?.requiereRenovacion ? "yes" : "no"}
                onChange={(e) =>
                  updateField("renovacion", {
                    ...record.renovacion,
                    requiereRenovacion: e.target.value === "yes",
                  })
                }
              >
                <option value="no">No</option>
                <option value="yes">Sí</option>
              </select>
            </div>
            <div className="sl-form-group">
              <label className="sl-label">Fecha posible de renovación</label>
              <input
                className="sl-input"
                type="date"
                value={record.renovacion?.fechaPosibleRenovacion?.slice(0, 10) || ""}
                onChange={(e) =>
                  updateField("renovacion", {
                    ...record.renovacion,
                    fechaPosibleRenovacion: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* NOTAS */}
      <div className="sl-card">
        <div className="sl-card-header">📝 Notas</div>
        <div className="sl-card-body">
          <textarea
            className="sl-textarea"
            rows={4}
            placeholder="Notas adicionales del ejecutivo…"
            value={record.notas || ""}
            onChange={(e) => updateField("notas", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}