import { useEffect, useState } from "react";
import { getSalesGoals, createOrUpdateGoal, getReportExecutives } from "../../../services/reportService";
import { Pencil } from "lucide-react";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const YEARS = [2023, 2024, 2025, 2026];

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(v || 0);

export default function GoalsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tab, setTab] = useState(0); // 0: general, 1: por ejecutivo
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, goalAmount: 0, assignedTo: "" });

  const loadGoals = async () => {
    setLoading(true);
    try { const r = await getSalesGoals({}); setGoals(r.data); }
    catch { setError("Error al cargar las metas"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadGoals();
    getReportExecutives().then((r) => setExecutives(r.data)).catch(console.error);
  }, []);

  const openNew = (year, month, assignedTo) => {
    setEditing(null);
    setForm({ year: year || new Date().getFullYear(), month: month || new Date().getMonth() + 1, goalAmount: 0, assignedTo: assignedTo || "" });
    setModal(true);
  };

  const openEdit = (goal) => {
    setEditing(goal);
    setForm({ year: goal.year, month: goal.month, goalAmount: goal.goalAmount, assignedTo: goal.assignedTo?._id || goal.assignedTo || "" });
    setModal(true);
  };

  const handleSave = async () => {
    setLoading(true); setError(null);
    try {
      const payload = { year: form.year, month: form.month, goalAmount: Number(form.goalAmount) || 0 };
      if (tab === 1 && form.assignedTo) payload.assignedTo = form.assignedTo;
      await createOrUpdateGoal(payload);
      setSuccess("Meta guardada correctamente");
      setTimeout(() => setSuccess(null), 3000);
      setModal(false);
      loadGoals();
    } catch (err) { setError(err.response?.data?.message || "Error al guardar la meta"); }
    finally { setLoading(false); }
  };

  const generalGoals = goals.filter((g) => !g.assignedTo);
  const execGoals = goals.filter((g) => g.assignedTo);

  const generalByYear = generalGoals.reduce((acc, g) => { if (!acc[g.year]) acc[g.year] = []; acc[g.year].push(g); return acc; }, {});
  const execByExec = execGoals.reduce((acc, g) => {
    const name = g.assignedTo?.name || "No asignado";
    if (!acc[name]) acc[name] = [];
    acc[name].push(g);
    return acc;
  }, {});

  const generalYears = Object.keys(generalByYear).sort((a, b) => b - a);

  const handleExport = () => {
    const rows = goals.map((g) => ({
      "Año": g.year,
      "Mes": MONTH_NAMES[g.month - 1],
      "Ejecutivo": g.assignedTo?.name || "General",
      "Meta (MXN)": g.goalAmount,
    }));
    exportToExcel(rows, "metas_de_ventas");
  };

  return (
    <div>
      {/* HEADER */}
      <div className="sl-header" style={{ marginBottom: 20 }}>
        <h2 className="sl-section-title" style={{ margin: 0 }}>Administración de Metas de Ventas</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {goals.length > 0 && (
            <button className="sl-btn-secondary" onClick={handleExport}>
              ↓ Exportar Excel
            </button>
          )}
          <button className="sl-btn-primary" onClick={() => openNew()}>+ Nueva meta</button>
        </div>
      </div>

      {error && <div className="rp-error">⚠ {error}</div>}
      {success && (
        <div className="rp-alert--success">
          ✓ {success}
          <button className="rp-alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* TABS */}
      <div className="rp-goals-tabs-wrap">
        <button className={`rp-goals-tab${tab === 0 ? " rp-goals-tab--active" : ""}`} onClick={() => setTab(0)}>Metas generales</button>
        <button className={`rp-goals-tab${tab === 1 ? " rp-goals-tab--active" : ""}`} onClick={() => setTab(1)}>Metas por ejecutivo</button>
      </div>

      {/* METAS GENERALES */}
      {tab === 0 && (
        generalYears.length === 0 && !loading
          ? <div className="rp-placeholder"><p>No hay metas generales. Haz clic en "+ Nueva meta" para comenzar.</p></div>
          : generalYears.map((year) => (
            <div key={year} className="rp-year-card">
              <div className="rp-year-header">{year}</div>
              <div className="sl-table-wrap" style={{ borderRadius: 0, border: "none", boxShadow: "none" }}>
                <table className="sl-table">
                  <thead><tr><th>Mes</th><th style={{ textAlign: "right" }}>Meta mensual</th><th style={{ textAlign: "center" }}>Acción</th></tr></thead>
                  <tbody>
                    {MONTH_NAMES.map((m, idx) => {
                      const monthNum = idx + 1;
                      const goal = generalByYear[year]?.find((g) => g.month === monthNum);
                      return (
                        <tr key={monthNum} style={{ opacity: goal ? 1 : 0.5 }}>
                          <td>{m}</td>
                          <td style={{ textAlign: "right" }}>{goal ? fmtMoney(goal.goalAmount) : "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className={`rp-icon-btn${goal ? " rp-icon-btn--set" : ""}`}
                              onClick={() => goal ? openEdit(goal) : openNew(parseInt(year), monthNum)}
                              title={goal ? "Editar" : "Agregar"}
                            >
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
      )}

      {/* METAS POR EJECUTIVO */}
      {tab === 1 && (
        Object.keys(execByExec).length === 0 && !loading
          ? <div className="rp-placeholder"><p>No hay metas por ejecutivo. Haz clic en "+ Nueva meta" para asignar metas.</p></div>
          : Object.entries(execByExec).map(([execName, execGoalsList]) => {
            const byYear = execGoalsList.reduce((acc, g) => { if (!acc[g.year]) acc[g.year] = []; acc[g.year].push(g); return acc; }, {});
            const years = Object.keys(byYear).sort((a, b) => b - a);
            return (
              <div key={execName} className="rp-year-card">
                <div className="rp-exec-header">
                  <span className="rp-exec-name">{execName}</span>
                  <span className="sl-badge sl-badge--info">Ejecutivo</span>
                </div>
                {years.map((year) => (
                  <div key={year}>
                    <div style={{ padding: "10px 20px 4px", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{year}</div>
                    <div className="sl-table-wrap" style={{ borderRadius: 0, border: "none", boxShadow: "none" }}>
                      <table className="sl-table">
                        <thead><tr><th>Mes</th><th style={{ textAlign: "right" }}>Meta mensual</th><th style={{ textAlign: "center" }}>Acción</th></tr></thead>
                        <tbody>
                          {MONTH_NAMES.map((m, idx) => {
                            const monthNum = idx + 1;
                            const goal = byYear[year]?.find((g) => g.month === monthNum);
                            const execId = execGoalsList[0]?.assignedTo?._id || execGoalsList[0]?.assignedTo || "";
                            return (
                              <tr key={monthNum} style={{ opacity: goal ? 1 : 0.5 }}>
                                <td>{m}</td>
                                <td style={{ textAlign: "right" }}>{goal ? fmtMoney(goal.goalAmount) : "—"}</td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    className={`rp-icon-btn${goal ? " rp-icon-btn--set" : ""}`}
                                    onClick={() => goal ? openEdit(goal) : openNew(parseInt(year), monthNum, execId)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
      )}

      {/* MODAL */}
      {modal && (
        <div className="rp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="rp-modal">
            <div className="rp-modal-header">
              <p className="rp-modal-title">{editing ? "Editar meta" : "Nueva meta"}</p>
              {tab === 1 && <p className="rp-modal-subtitle">Meta por ejecutivo</p>}
            </div>
            <div className="rp-modal-body">
              {error && <div className="rp-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div className="sl-form-group">
                  <label className="sl-label">Año</label>
                  <select className="sl-select-full" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="sl-form-group">
                  <label className="sl-label">Mes</label>
                  <select className="sl-select-full" value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
              {tab === 1 && (
                <div className="sl-form-group" style={{ marginBottom: 14 }}>
                  <label className="sl-label">Ejecutivo *</label>
                  <select className="sl-select-full" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} required>
                    <option value="">Seleccionar ejecutivo…</option>
                    {executives.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="sl-form-group">
                <label className="sl-label">Meta mensual (MXN)</label>
                <div className="rp-input-wrap">
                  <span className="rp-input-prefix">$</span>
                  <input className="sl-input rp-input-prefixed" type="number" min={0}
                    value={form.goalAmount}
                    onChange={(e) => setForm({ ...form, goalAmount: e.target.value === "" ? "" : Number(e.target.value) })}
                    onBlur={() => { if (form.goalAmount === "") setForm({ ...form, goalAmount: 0 }); }}
                  />
                </div>
                <p className="rp-modal-hint">Ingresa el monto en pesos mexicanos (sin IVA)</p>
              </div>
            </div>
            <div className="rp-modal-footer">
              <button className="sl-btn-secondary" onClick={() => setModal(false)} disabled={loading}>Cancelar</button>
              <button className="sl-btn-save" onClick={handleSave}
                disabled={loading || (tab === 1 && !form.assignedTo)}>
                {loading ? "Guardando…" : "Guardar meta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}