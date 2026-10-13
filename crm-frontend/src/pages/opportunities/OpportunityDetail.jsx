import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import {
  getOpportunityById, updateOpportunityStage, convertOpportunityToSale, deleteOpportunity,
} from "../../services/opportunityService";
import { useAuth } from "../../context/AuthContext";
import { DetailSkeleton } from "../../components/skeletons/DetailSkeleton";
import { STAGES, STAGE_LABEL, isClosedStage } from "../../constants/opportunity";
import LostReasonModal from "./LostReasonModal";
import "../sales/sales.css"; // Reuse sales css for detail page styles
import "./opportunities.css";

const money = (n) => (n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="sl-info-label">{label}</p>
      <p className="sl-info-value">{value ?? "—"}</p>
    </div>
  );
}

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canConvert } = useAuth();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState("");
  const [showLostModal, setShowLostModal] = useState(false);

  const hasApprovedQuote = opp?.quotes?.some(q => q.status === "aprobada" || q.status === "aprobado");

  useEffect(() => {
    loadOpp();
  }, [id]);

  const loadOpp = () => {
    setLoading(true);
    getOpportunityById(id)
      .then(res => setOpp(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleStageChange = async (stage, extra) => {
    if (stage === "cerrado_perdido" && !extra) {
      setShowLostModal(true);
      return;
    }
    try {
      await updateOpportunityStage(id, stage, extra);
      setShowLostModal(false);
      loadOpp();
    } catch (err) {
      setShowLostModal(false);
      setShowErrorModal(err.response?.data?.message || "Error cambiando etapa");
    }
  };

  const handleConvert = () => {
    if (!hasApprovedQuote) {
      setShowErrorModal("No puedes convertir a Venta. Primero el administrador debe Aprobar alguna de las cotizaciones ligadas.");
      return;
    }
    setShowConvertModal(true);
  };

  const executeConvert = async () => {
    setShowConvertModal(false);
    try {
      const res = await convertOpportunityToSale(id);
      navigate(`/sales/${res.data.sale._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Error al convertir");
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    setShowDeleteModal(false);
    try {
      await deleteOpportunity(id);
      navigate("/opportunities");
    } catch (err) {
      alert("Error eliminando oportunidad");
    }
  };

  if (loading) return (
    <DetailSkeleton
      pageClass="sl-page" headerClass="sl-header" actions={3} titleWidth={230}
      cards={[
        { cardClass: "sl-card", headerClass: "sl-card-header", bodyClass: "sl-card-body", cols: 2, lines: 4 },
      ]}
    />
  );
  if (!opp) return <div>Oportunidad no encontrada</div>;

  const cerrada = isClosedStage(opp.stage) || opp.convertedToSale;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <h1 className="sl-title">Oportunidad: {opp.title}</h1>
        <div className="sl-header-actions">
          <Link to="/opportunities" className="sl-btn-secondary"><ArrowLeft size={14} /> Volver</Link>
          <button className="sl-btn-save" onClick={handleDelete} style={{ background: "#ef4444", border: "none" }}>
            <Trash2 size={14} /> Eliminar
          </button>
          {opp.convertedToSale ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                background: "#16a34a22",
                color: "#16a34a",
                border: "1px solid #16a34a55",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 600,
              }}>
                ✓ Venta ya generada
              </span>
              {opp.saleId && (
                <Link
                  to={`/sales/${opp.saleId}`}
                  className="sl-btn-secondary"
                  style={{ fontSize: "13px" }}
                >
                  Ver Venta →
                </Link>
              )}
            </div>
          ) : (
            opp.stage !== "cerrado_ganado" && canConvert && (
              <button
                className="sl-btn-save"
                onClick={handleConvert}
                style={{ background: hasApprovedQuote ? "#8b5cf6" : "#9ca3af", cursor: hasApprovedQuote ? "pointer" : "not-allowed" }}
                title={hasApprovedQuote ? "" : "Requiere cotización aprobada"}
              >
                Convertir a Venta
              </button>
            )
          )}
        </div>
      </div>

      <div className="sl-card">
        <div className="sl-card-header">Detalles Generales</div>
        <div className="sl-card-body">
          <div className="sl-info-grid">
            <InfoItem label="Cliente" value={opp.client?.nombreComercial} />
            <InfoItem label="Propietario" value={opp.vendedorId?.name} />
            <InfoItem label="Etapa actual" value={STAGE_LABEL[opp.stage]} />
            <InfoItem label="Valor (última cotización)" value={money(opp.estimatedValue)} />
            <InfoItem label="Creación" value={new Date(opp.createdAt).toLocaleDateString("es-MX")} />
          </div>
          {opp.convertedToSale && (
            <div style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "#16a34a18",
              border: "1px solid #16a34a44",
              borderRadius: "8px",
              color: "#16a34a",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              ✓ Esta oportunidad ya fue <strong style={{ marginLeft: 4 }}>convertida a venta</strong>. No se puede convertir nuevamente.
              {opp.saleId && (
                <Link to={`/sales/${opp.saleId}`} style={{ color: "#16a34a", marginLeft: "auto", fontWeight: 600 }}>
                  Ver Venta →
                </Link>
              )}
            </div>
          )}

          {opp.stage === "cerrado_perdido" && (
            <div className="opp-lost-box">
              <strong>Perdida:</strong> {opp.motivoPerdida || "Sin motivo registrado"}
              {opp.comentarioPerdida && <> — {opp.comentarioPerdida}</>}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <label className="sl-label">Cambiar etapa</label>
            <select className="sl-select-full" value={opp.stage} onChange={e => handleStageChange(e.target.value)} disabled={cerrada}>
              {STAGES
                // Cerrado Ganado solo se alcanza al pagarse la venta
                .filter(s => s.id !== "cerrado_ganado" || opp.stage === "cerrado_ganado")
                .map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="sl-card">
        <div className="sl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Cotizaciones de la oportunidad</span>
          {!cerrada && (
            <button
              className="sl-btn-save"
              onClick={() => navigate(`/quotes/new?opportunityId=${opp._id}`)}
            >
              <Plus size={14} /> Crear cotización
            </button>
          )}
        </div>
        <div className="sl-card-body">
          {!opp.quotes?.length ? (
            <p style={{ color: "var(--txt-muted)", margin: 0 }}>No hay cotizaciones para esta oportunidad.</p>
          ) : (
            <table className="sl-inner-table">
              <thead><tr><th>Folio</th><th>Versión</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {opp.quotes.map(q => (
                  <tr key={q._id}>
                    <td><Link to={`/quotes/${q._id}`}>{q.folio}</Link></td>
                    <td>V{q.version}</td>
                    <td>{(q.total || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</td>
                    <td>
                      <span className={`sl-badge ${q.status === 'aprobada' ? 'sl-badge--success' : ''}`}>{q.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showConvertModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal">
            <h2 className="opp-modal-header" style={{ marginBottom: "12px", fontSize: "18px" }}>Convertir a Venta</h2>
            <p style={{ color: "var(--txt-muted)", fontSize: "14px", marginBottom: "24px" }}>
              ¿Estás seguro de convertir esta oportunidad a <strong>VENTA</strong>? <br /><br />
              Asegúrate de tener cotizaciones aprobadas antes de proceder.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="sl-btn-secondary"
                onClick={() => setShowConvertModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sl-btn-save"
                style={{ background: "#8b5cf6" }}
                onClick={executeConvert}
              >
                Sí, convertir
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal">
            <h2 className="opp-modal-header" style={{ marginBottom: "12px", fontSize: "18px" }}>Eliminar Oportunidad</h2>
            <p style={{ color: "var(--txt-muted)", fontSize: "14px", marginBottom: "24px" }}>
              ¿Estás seguro de eliminar esta oportunidad? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="sl-btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="sl-btn-save"
                style={{ background: "#ef4444", border: "none" }}
                onClick={executeDelete}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showLostModal && (
        <LostReasonModal
          opportunityTitle={opp.title}
          onCancel={() => setShowLostModal(false)}
          onConfirm={(extra) => handleStageChange("cerrado_perdido", extra)}
        />
      )}

      {showErrorModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal" style={{ maxWidth: 400 }}>
            <h2 className="opp-modal-header" style={{ color: "#ef4444" }}>Acción Inválida</h2>
            <p style={{ color: "var(--txt-muted)", fontSize: "14px", marginTop: "10px", marginBottom: "20px" }}>
              {showErrorModal}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="sl-btn-secondary"
                onClick={() => setShowErrorModal("")}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
