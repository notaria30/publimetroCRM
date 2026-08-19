import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, History } from "lucide-react";
import { getOpportunities, updateOpportunityStage, createOpportunity } from "../../services/opportunityService";
import { getClients } from "../../services/clientService"; // I guess this exists
import { OpportunityBoardSkeleton } from "../../components/skeletons/OpportunityBoardSkeleton";
import "../sales/sales.css";
import "./opportunities.css";

const STAGES = [
  { id: "prospeccion", label: "Prospección" },
  { id: "calificacion", label: "Calificación" },
  { id: "propuesta", label: "Propuesta" },
  { id: "negociacion", label: "Negociación" },
  { id: "cerrado_ganado", label: "Cerrado Ganado" },
  { id: "cerrado_perdido", label: "Cerrado Perdido" }
];

export default function OpportunityList() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ title: "", clientId: "", estimatedValue: "" });
  const [errorModal, setErrorModal] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await getOpportunities();
      setOpportunities(res.data);

      const cRes = await getClients(); // Assuming standard getClient
      setClients(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, opp) => {
    setDraggedItem(opp);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      e.target.classList.add("dragging");
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove("dragging");
    setDraggedItem(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, stageId) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (draggedItem.stage === stageId) return;

    if (draggedItem.stage === "cerrado_ganado" || draggedItem.stage === "cerrado_perdido") {
      setErrorModal("Esta oportunidad ya ha sido finalizada y no puede reabrirse.");
      return;
    }

    if (stageId === "cerrado_ganado") {
      setErrorModal("No puedes mover a Cerrado Ganado manualmente. La oportunidad avanzará automáticamente cuando su Venta esté 100% facturada y pagada.");
      return;
    }

    if (stageId === "propuesta" || stageId === "negociacion") {
      if (!draggedItem.quotes || draggedItem.quotes.length === 0) {
        setErrorModal("Para pasar a Propuesta o Negociación debes generar primero una Cotización desde el detalle de la Oportunidad.");
        return;
      }
    }

    // Optimistic UI Update
    setOpportunities(prev =>
      prev.map(o => o._id === draggedItem._id ? { ...o, stage: stageId } : o)
    );

    try {
      await updateOpportunityStage(draggedItem._id, stageId);
    } catch (err) {
      alert("Error al mover la tarjeta");
      // Revert 
      loadData();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.clientId) return alert("Completa los campos obligatorios");
    try {
      await createOpportunity(form);
      setIsModalOpen(false);
      setForm({ title: "", clientId: "", estimatedValue: "" });
      loadData();
    } catch (err) {
      alert("Error al crear la oportunidad");
    }
  };

  if (loading) return <OpportunityBoardSkeleton />;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <h1 className="sl-title">Oportunidades (Pipeline)</h1>
        <div className="sl-header-actions" style={{ gap: "12px" }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="sl-btn-secondary"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              backgroundColor: showHistory ? "#e0f2fe" : "white",
              color: showHistory ? "#0369a1" : "#4b5563",
              borderColor: showHistory ? "#bae6fd" : "#e5e7eb",
              transition: "all 0.2s ease"
            }}
            title="Alternar visibilidad de oportunidades cerradas con más de 30 días"
          >
            <History size={14} />
            {showHistory ? "Ocultar archivadas" : "Ver archivadas"}
          </button>
          <button className="sl-btn-save" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Nueva Oportunidad
          </button>
        </div>
      </div>

      <div className="opp-kanban-board">
        {STAGES.map(stage => {
          let colOpps = opportunities.filter(o => o.stage === stage.id);

          if (!showHistory && (stage.id === "cerrado_ganado" || stage.id === "cerrado_perdido")) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            colOpps = colOpps.filter(o => {
              const dateToCompare = new Date(o.updatedAt || o.createdAt);
              return dateToCompare >= thirtyDaysAgo;
            });
          }

          const getEffectiveValue = (opp) => {
            if (opp.stage === "cerrado_ganado" && opp.quotes?.length > 0) {
              const accepted = opp.quotes.find(q => q.status === "aprobada" || q.status === "aprobado");
              const targetQuote = accepted || opp.quotes[opp.quotes.length - 1];
              return targetQuote.total || opp.estimatedValue || 0;
            }
            return opp.estimatedValue || 0;
          };

          const totalVal = colOpps.reduce((acc, curr) => acc + getEffectiveValue(curr), 0);

          return (
            <div
              key={stage.id}
              className="opp-kanban-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="opp-col-header">
                <span>{stage.label} ({colOpps.length})</span>
                <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                  {totalVal.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 })}
                </span>
              </div>
              <div className="opp-col-body">
                {colOpps.map(opp => (
                  <div
                    key={opp._id}
                    className="opp-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/opportunities/${opp._id}`)}
                  >
                    <p className="opp-card-title">{opp.title}</p>
                    <p className="opp-card-client">{opp.client?.nombreComercial || "Sin cliente"}</p>
                    <div className="opp-card-footer">
                      <span className="opp-card-val">{getEffectiveValue(opp).toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 })}</span>
                      <span>Cotizaciones: {opp.quotes?.length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {errorModal && (
        <div className="opp-modal-overlay">
          <div className="opp-modal" style={{ maxWidth: 400 }}>
            <h2 className="opp-modal-header" style={{ color: "#ef4444" }}>Acción Inválida</h2>
            <p style={{ color: "var(--txt-muted)", fontSize: "14px", marginTop: "10px", marginBottom: "20px" }}>
              {errorModal}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="sl-btn-secondary"
                onClick={() => setErrorModal("")}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="opp-modal-overlay">
          <div className="opp-modal">
            <h2 className="opp-modal-header">Nueva Oportunidad</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="sl-label">Título</label>
                <input className="sl-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="sl-label">Cliente</label>
                <select className="sl-select-full" value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
                  <option value="">Seleccione un cliente</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.nombreComercial}</option>)}
                </select>
              </div>
              <div>
                <label className="sl-label">Valor Estimado ($)</label>
                <input className="sl-input" type="number" value={form.estimatedValue} onChange={e => setForm({ ...form, estimatedValue: e.target.value === "" ? "" : Number(e.target.value) })} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button type="button" className="sl-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="sl-btn-save">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
