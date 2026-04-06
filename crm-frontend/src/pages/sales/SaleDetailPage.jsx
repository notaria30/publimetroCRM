import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getSaleById, updateSale, addSaleNote, addSaleTask, completeSaleTask } from "../../services/salesService";
import { ArrowLeft } from "lucide-react";
import "./sales.css";

const STAGES = ["prospeccion", "presentacion", "propuesta", "cierre"];

const STAGE_BADGE = {
  prospeccion: "sl-badge--warning",
  presentacion: "sl-badge--info",
  propuesta: "sl-badge--purple",
  cierre: "sl-badge--success",
};

const STAGE_PROB = {
  prospeccion: 20, presentacion: 40, propuesta: 70, cierre: 100,
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const daysBetween = (from) => {
  if (!from) return "—";
  const diff = Math.floor((new Date() - new Date(from)) / 86400000);
  return diff < 0 ? 0 : diff;
};

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="sl-info-label">{label}</p>
      <p className="sl-info-value">{value ?? "—"}</p>
    </div>
  );
}

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue]   = useState("");

  useEffect(() => {
    getSaleById(id)
      .then((res) => setSale(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleChangeStage = async (stage) => {
    try {
      const res = await updateSale(id, stage);
      setSale(res.data.updatedSale);
    } catch { alert("Error al actualizar la etapa"); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return alert("La nota no puede estar vacía");
    try {
      const res = await addSaleNote(id, noteText.trim());
      setNoteText("");
      setSale((p) => ({ ...p, followUpNotes: res.data.notes }));
    } catch { alert("Error al agregar nota"); }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return alert("El título es obligatorio");
    try {
      const res = await addSaleTask(id, taskTitle, taskDue || null);
      setTaskTitle(""); setTaskDue("");
      setSale((p) => ({ ...p, tasks: res.data.tasks }));
    } catch { alert("Error al agregar tarea"); }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await completeSaleTask(id, taskId);
      setSale((p) => ({ ...p, tasks: res.data.tasks }));
    } catch { alert("Error al completar tarea"); }
  };

  if (loading) return <div className="sl-status">Cargando venta...</div>;
  if (!sale)   return <div className="sl-status">No se encontró la venta.</div>;

  const currentIdx = STAGES.indexOf(sale.pipelineStage);
  const probability = STAGE_PROB[sale.pipelineStage] ?? 20;

  const tasks = sale.tasks || [];
  const overdue  = tasks.filter((t) => t.dueDate && !t.completed && new Date(t.dueDate) < new Date()).length;
  const upcoming = tasks.filter((t) => { if (!t.dueDate || t.completed) return false; const d = (new Date(t.dueDate) - new Date()) / 86400000; return d >= 0 && d <= 7; }).length;
  const done     = tasks.filter((t) => t.completed).length;
  const nextTask = tasks.filter((t) => t.dueDate && !t.completed && new Date(t.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  return (
    <div className="sl-page">

      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Venta #{sale.folio || sale._id}</h1>
        <div className="sl-header-actions">
          <Link to="/sales" className="sl-btn-secondary"><ArrowLeft size={14} /> Volver</Link>
          <button className="sl-btn-secondary" onClick={() => navigate(`/clients/${sale.client._id}/campaigns`)}>
            Ver campañas
          </button>
        </div>
      </div>

      {/* RESUMEN */}
      <div className="sl-card">
        <div className="sl-card-header">Resumen de la Venta</div>
        <div className="sl-card-body">
          <div className="sl-info-grid">
            <InfoItem label="Cliente"            value={sale.client?.nombreComercial} />
            <InfoItem label="Total cotización"   value={sale.quote ? `$${sale.quote.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "Sin cotización"} />
            <InfoItem label="Vendedor asignado"  value={sale.assignedTo?.name} />
            <InfoItem label="Etapa actual"       value={
              <span className={`sl-badge ${STAGE_BADGE[sale.pipelineStage] || "sl-badge--gray"}`}>
                {sale.pipelineStage?.replace(/_/g, " ")}
              </span>
            } />
            <InfoItem label="Probabilidad cierre" value={`${probability}%`} />
            <InfoItem label="Días desde creación" value={daysBetween(sale.createdAt)} />
            <InfoItem label="Creada"              value={fmtDate(sale.createdAt)} />
            <InfoItem label="Actualizada"         value={fmtDate(sale.updatedAt)} />
          </div>
        </div>
      </div>

      {/* PIPELINE VISUAL */}
      <div className="sl-card">
        <div className="sl-card-header">Pipeline de Venta</div>
        <div className="sl-card-body">
          <div className="sl-pipeline">
            {STAGES.map((stage, idx) => {
              const done   = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={stage} className="sl-pipeline-step" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    className={`sl-pipeline-circle ${done ? "sl-pipeline-circle--done" : active ? "sl-pipeline-circle--active" : "sl-pipeline-circle--future"}`}
                    onClick={() => handleChangeStage(stage)}
                  >
                    {idx + 1}
                  </div>
                  <span className={`sl-pipeline-label${active ? " sl-pipeline-label--active" : ""}`}>
                    {stage.replace(/_/g, " ")}
                  </span>
                  {idx < STAGES.length - 1 && (
                    <div className={`sl-pipeline-connector${done ? " sl-pipeline-connector--done" : ""}`} />
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <label className="sl-label">Cambiar etapa manualmente</label>
            <select className="sl-select-full" value={sale.pipelineStage} onChange={(e) => handleChangeStage(e.target.value)}>
              {STAGES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* HISTORIAL PIPELINE */}
      <div className="sl-card">
        <div className="sl-card-header">Historial del Pipeline</div>
        <div className="sl-card-body">
          {!sale.history?.length ? (
            <p style={{ color: "#9ca3af", margin: 0 }}>No hay movimientos registrados.</p>
          ) : (
            <table className="sl-inner-table">
              <thead><tr><th>De</th><th>A</th><th>Fecha</th></tr></thead>
              <tbody>
                {sale.history.map((h, i) => (
                  <tr key={i}>
                    <td style={{ textTransform: "capitalize" }}>{h.fromStage?.replace(/_/g, " ") || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{h.toStage?.replace(/_/g, " ") || "—"}</td>
                    <td>{h.changedAt ? new Date(h.changedAt).toLocaleDateString("es-MX") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MINI DASHBOARD */}
      <h2 className="sl-section-title">Actividad de Seguimiento</h2>
      <div className="sl-stats-grid">
        <div className="sl-stat-box sl-stat-box--red">
          <p className="sl-stat-num sl-stat-num--red">{overdue}</p>
          <p className="sl-stat-label">Tareas vencidas</p>
        </div>
        <div className="sl-stat-box sl-stat-box--yellow">
          <p className="sl-stat-num sl-stat-num--yellow">{upcoming}</p>
          <p className="sl-stat-label">Próximos 7 días</p>
        </div>
        <div className="sl-stat-box sl-stat-box--green">
          <p className="sl-stat-num sl-stat-num--green">{done}</p>
          <p className="sl-stat-label">Tareas completadas</p>
        </div>
        <div className="sl-stat-box sl-stat-box--blue">
          <p className="sl-stat-num sl-stat-num--blue" style={{ fontSize: 16 }}>
            {nextTask ? new Date(nextTask.dueDate).toLocaleDateString("es-MX") : "Sin actividad"}
          </p>
          <p className="sl-stat-label">Próxima actividad</p>
        </div>
      </div>

      {/* NOTAS */}
      <h2 className="sl-section-title">Notas de seguimiento</h2>
      <div className="sl-note-form">
        <p className="sl-form-title">Agregar nota</p>
        <div className="sl-form-row">
          <div className="sl-form-group" style={{ flex: 1 }}>
            <textarea className="sl-textarea" placeholder="Escribe una nota…" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          </div>
          <button className="sl-btn-save" onClick={handleAddNote}>Guardar</button>
        </div>
      </div>
      {!sale.followUpNotes?.length ? (
        <p style={{ color: "#9ca3af" }}>Aún no hay notas registradas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {sale.followUpNotes.map((n, i) => (
            <div key={i} className="sl-note-card">
              <p className="sl-note-text">{n.text}</p>
              <div className="sl-note-meta">
                <span className="sl-note-date">{n.createdAt ? new Date(n.createdAt).toLocaleString("es-MX") : "—"}</span>
                <span className="sl-note-author">{n.createdBy?.name || "Usuario desconocido"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAREAS */}
      <h2 className="sl-section-title">Tareas / Próximos pasos</h2>
      <div className="sl-task-form">
        <p className="sl-form-title">Agregar nueva tarea</p>
        <div className="sl-form-row">
          <div className="sl-form-group">
            <label className="sl-label">Título</label>
            <input className="sl-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título de la tarea" />
          </div>
          <div className="sl-form-group">
            <label className="sl-label">Fecha límite</label>
            <input className="sl-input" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          </div>
          <button className="sl-btn-save" onClick={handleAddTask}>Crear</button>
        </div>
      </div>
      {!tasks.length ? (
        <p style={{ color: "#9ca3af" }}>No hay tareas aún.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {tasks.map((t) => (
            <div key={t._id} className={`sl-task-card${t.completed ? " sl-task-card--done" : ""}`}>
              <input
                type="checkbox" className="sl-checkbox" checked={t.completed}
                onChange={() => { if (!t.completed) handleCompleteTask(t._id); }}
              />
              <div>
                <p className="sl-task-title">{t.title}</p>
                <p className="sl-task-due">Fecha límite: {t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-MX") : "No asignada"}</p>
                <p className="sl-task-by">Creada por: {t.createdBy?.name || "Usuario desconocido"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INFO COTIZACIÓN */}
      <div className="sl-card">
        <div className="sl-card-header">Información de Cotización</div>
        <div className="sl-card-body">
          <div className="sl-info-grid">
            <InfoItem label="Folio"  value={sale.quote?.folio} />
            <InfoItem label="Total"  value={sale.quote ? `$${sale.quote.total?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"} />
            <InfoItem label="Status" value={
              sale.quote?.status
                ? <span className={`sl-badge ${sale.quote.status === "aprobado" ? "sl-badge--success" : sale.quote.status === "pendiente" ? "sl-badge--warning" : "sl-badge--error"}`}>
                    {sale.quote.status}
                  </span>
                : "—"
            } />
          </div>
        </div>
      </div>

    </div>
  );
}