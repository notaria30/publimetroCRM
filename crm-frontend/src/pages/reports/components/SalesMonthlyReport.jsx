import { useState } from "react";
import { getSalesMonthlyReport, getReportClients, getSalesGoals } from "../../../services/reportService";
import { useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

const cumplColor = (p) => (p >= 100 ? "sl-badge--success" : p >= 80 ? "sl-badge--warning" : "sl-badge--error");

export default function SalesMonthlyReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    clientId: "all", tipoCliente: "all", statusPago: "all",
  });

  useEffect(() => {
    getReportClients().then((r) => setClients(r.data)).catch(console.error);
  }, []);

  const loadGoals = async () => {
    try {
      const res = await getSalesGoals({});
      const map = {};
      res.data.forEach((g) => { map[`${g.year}-${g.month}`] = g.goalAmount; });
      return map;
    } catch { return {}; }
  };

  const handleSearch = async () => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const goals = await loadGoals();
      const res = await getSalesMonthlyReport(filters);
      const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      const enriched = res.data.data.map((item) => {
        const [m, y] = item.fecha.split(" ");
        const year = parseInt(y);
        const monthIdx = MONTHS.indexOf(m.toLowerCase()) + 1;
        const meta = goals[`${year}-${monthIdx}`] || 0;
        const pctDec = meta > 0 ? (item.totalVentas / meta) * 100 : item.totalVentas > 0 ? 100 : 0;
        return { ...item, meta, diferencia: item.totalVentas - meta, pctDec, pctChart: Math.round(Math.min(pctDec, 100)) };
      });
      setData(enriched);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
    } finally { setLoading(false); }
  };

  const chartData = [...data].reverse().map((d) => ({
    nombre: d.fecha.split(" ")[0].substring(0, 3),
    mesCompleto: d.fecha, ventas: d.totalVentas, meta: d.meta, cumplimiento: d.pctChart,
  }));

  const totalVentas = data.reduce((s, d) => s + d.totalVentas, 0);
  const totalMeta = data.reduce((s, d) => s + d.meta, 0);
  const promCumpl = data.length ? data.reduce((s, d) => s + d.pctDec, 0) / data.length : 0;
  const mesesConMeta = data.filter((d) => d.meta > 0).length;
  const mesesCumplidos = data.filter((d) => d.pctDec >= 100).length;

  const ttStyle = { background: "#1e293b", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 };

  const handleExport = () => {
    exportToExcel(data.map((row) => ({
      "Fecha": row.fecha,
      "Monto con IVA": row.totalVentas,
      "Meta": row.meta,
      "Diferencia": row.diferencia,
      "% Cumplimiento": Number(row.pctDec.toFixed(2)),
      "Total Pagado": row.totalPagado,
    })), "ventas_mensuales");
  };

  return (
    <div>
      {/* FILTROS */}
      <div className="rp-filter-card">
        <p className="rp-filter-title">Filtros de búsqueda</p>
        <div className="rp-filter-row">
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha inicio</label>
            <input className="sl-input" type="date"
              value={filters.startDate.slice(0, 10)}
              onChange={(e) => setFilters({ ...filters, startDate: new Date(e.target.value).toISOString() })} />
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha fin</label>
            <input className="sl-input" type="date"
              value={filters.endDate.slice(0, 10)}
              onChange={(e) => setFilters({ ...filters, endDate: new Date(e.target.value).toISOString() })} />
          </div>
          <div className="rp-filter-group">
            <label className="sl-label">Cliente</label>
            <select className="sl-select-full" value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}>
              <option value="all">Todos</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.nombreComercial}</option>)}
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Tipo cliente</label>
            <select className="sl-select-full" value={filters.tipoCliente}
              onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}>
              <option value="all">Todas</option>
              <option value="iniciativa privada">IP</option>
              <option value="gobierno">Gobierno</option>
              <option value="corporativo">Corporativo</option>
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Status pago</label>
            <select className="sl-select-full" value={filters.statusPago}
              onChange={(e) => setFilters({ ...filters, statusPago: e.target.value })}>
              <option value="all">Todos</option>
              <option value="pagadas">Pagadas</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <button className="sl-btn-primary" onClick={handleSearch} disabled={loading} style={{ whiteSpace: "nowrap" }}>
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            {data.length > 0 && (
              <button className="sl-btn-secondary" onClick={handleExport}>
                ↓ Exportar Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="rp-error">⚠ {error}</div>}

      {!hasSearched && !loading && (
        <div className="rp-placeholder"><p>Selecciona los filtros y haz clic en "Generar reporte"</p></div>
      )}

      {hasSearched && !loading && data.length === 0 && !error && (
        <div className="rp-placeholder"><p>No hay datos para los filtros seleccionados</p></div>
      )}

      {hasSearched && !loading && data.length > 0 && (
        <>
          {/* KPIs */}
          <div className="rp-kpi-grid">
            <div className="rp-kpi rp-kpi--blue">
              <p className="rp-kpi-label">Total Ventas</p>
              <p className="rp-kpi-value">{fmtMoney(totalVentas)}</p>
            </div>
            <div className="rp-kpi rp-kpi--purple">
              <p className="rp-kpi-label">Total Meta</p>
              <p className="rp-kpi-value">{fmtMoney(totalMeta)}</p>
            </div>
            <div className="rp-kpi rp-kpi--green">
              <p className="rp-kpi-label">Promedio Cumplimiento</p>
              <p className={`rp-kpi-value ${promCumpl >= 80 ? "rp-kpi-value--green" : "rp-kpi-value--orange"}`}>
                {fmtPct(promCumpl)}
              </p>
            </div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Meses meta cumplida</p>
              <p className="rp-kpi-value">{mesesCumplidos} / {mesesConMeta}</p>
            </div>
          </div>

          {/* GRÁFICAS */}
          <div className="rp-charts-grid">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Ventas vs Meta mensual</p>
                <p className="rp-chart-subtitle">Comparación de ventas reales contra meta establecida</p>
              </div>
              <div className="rp-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} formatter={(v) => fmtMoney(v)} labelFormatter={(l) => `Mes: ${l}`} />
                    <Legend />
                    <Bar dataKey="ventas" name="Ventas reales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meta" name="Meta" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">% Cumplimiento mensual</p>
                <p className="rp-chart-subtitle">Porcentaje de meta alcanzada por mes</p>
              </div>
              <div className="rp-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} formatter={(v) => `${v}%`} />
                    <Legend />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "100%", position: "right", fontSize: 10, fill: "#ef4444" }} />
                    <Line type="monotone" dataKey="cumplimiento" name="% Cumplimiento"
                      stroke="#16a34a" strokeWidth={2} dot={{ fill: "#16a34a", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TABLA */}
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th style={{ textAlign: "right" }}>Monto (c/IVA)</th>
                  <th style={{ textAlign: "right" }}>Meta</th>
                  <th style={{ textAlign: "right" }}>Diferencia</th>
                  <th style={{ textAlign: "center" }}>% Cumplimiento</th>
                  <th style={{ textAlign: "right" }}>Pagado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.fecha}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.totalVentas)}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.meta)}</td>
                    <td style={{ textAlign: "right", color: row.diferencia >= 0 ? "#16a34a" : "#ef4444", fontWeight: 600 }}>
                      {fmtMoney(row.diferencia)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`sl-badge ${cumplColor(row.pctDec)}`}>{fmtPct(row.pctDec)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.totalPagado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}