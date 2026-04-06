import { useEffect, useState } from "react";
import { getExecutiveReport, getReportClients, getReportExecutives, getSalesGoals } from "../../../services/reportService";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(2)}%`;
const cumplColor = (p) => (p >= 100 ? "sl-badge--success" : p >= 80 ? "sl-badge--warning" : "sl-badge--error");
const ttStyle = { background: "#1e293b", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 };

export default function ExecutiveReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    clientId: "all",
    executiveId: "all",
  });

  useEffect(() => {
    Promise.all([getReportClients(), getReportExecutives()])
      .then(([cr, er]) => { setClients(cr.data); setExecutives(er.data); })
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const goalsRes = await getSalesGoals({});
      const goalsMap = {};
      goalsRes.data.forEach((g) => {
        const execId = g.assignedTo?._id || g.assignedTo;
        if (execId) goalsMap[`${g.year}-${g.month}-${execId}`] = g.goalAmount;
      });

      const res = await getExecutiveReport(filters);
      const rawData = res.data.data;
      const grouped = {};

      rawData.forEach((item) => {
        const [d, m, y] = item.fecha.split("/");
        const year = parseInt(y); const month = parseInt(m);
        const monthName = new Date(year, month - 1).toLocaleString("es-MX", { month: "long" });
        const key = `${year}-${month}-${item.ejecutivo}`;
        if (!grouped[key]) {
          const exec = executives.find((e) => e.name === item.ejecutivo);
          const meta = exec ? (goalsMap[`${year}-${month}-${exec._id}`] || 0) : 0;
          grouped[key] = { fecha: `${monthName} ${year}`, ejecutivo: item.ejecutivo, totalVentasSinIVA: 0, meta, cantidadVentas: 0 };
        }
        grouped[key].totalVentasSinIVA += item.ventasSinIVA;
        grouped[key].cantidadVentas += 1;
      });

      const result = Object.values(grouped).map((row) => {
        const pctDec = row.meta > 0 ? (row.totalVentasSinIVA / row.meta) * 100 : row.totalVentasSinIVA > 0 ? 100 : 0;
        return { ...row, pctDec, pctChart: Math.round(Math.min(pctDec, 100)) };
      }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
    } finally { setLoading(false); }
  };

  const selectedExecName = executives.find((e) => e._id === filters.executiveId)?.name;

  const execChartData = Object.values(
    data.reduce((acc, item) => {
      if (!acc[item.ejecutivo]) acc[item.ejecutivo] = { nombre: item.ejecutivo, ventas: 0, meta: 0 };
      acc[item.ejecutivo].ventas += item.totalVentasSinIVA;
      acc[item.ejecutivo].meta += item.meta;
      return acc;
    }, {})
  ).sort((a, b) => b.ventas - a.ventas);

  const evolutionData = selectedExecName && filters.executiveId !== "all"
    ? [...data.filter((d) => d.ejecutivo === selectedExecName)]
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .map((d) => ({ mes: d.fecha, ventas: d.totalVentasSinIVA, meta: d.meta, cumplimiento: d.pctChart }))
    : [];

  const totalVentas = data.reduce((s, d) => s + d.totalVentasSinIVA, 0);
  const totalMeta = data.reduce((s, d) => s + d.meta, 0);
  const promCumpl = data.length ? data.reduce((s, d) => s + d.pctDec, 0) / data.length : 0;
  const execActivos = new Set(data.map((d) => d.ejecutivo)).size;
  const handleExport = () => {
    exportToExcel(data.map((row) => ({
      "Mes": row.fecha,
      "Ejecutivo": row.ejecutivo,
      "Total Ventas": row.totalVentasSinIVA,
      "Meta Mensual": row.meta,
      "% Cumplimiento": Number(row.pctDec.toFixed(2)),
      "Número de Ventas": row.cantidadVentas,
    })), "ventas_por_ejecutivo");
  };

  return (
    <div>
      {/* FILTROS */}
      <div className="rp-filter-card">
        <p className="rp-filter-title">Filtros de búsqueda</p>
        <div className="rp-filter-row">
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha inicio</label>
            <input className="sl-input" type="date" value={filters.startDate.slice(0, 10)}
              onChange={(e) => setFilters({ ...filters, startDate: new Date(e.target.value).toISOString() })} />
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha fin</label>
            <input className="sl-input" type="date" value={filters.endDate.slice(0, 10)}
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
            <label className="sl-label">Ejecutivo</label>
            <select className="sl-select-full" value={filters.executiveId}
              onChange={(e) => setFilters({ ...filters, executiveId: e.target.value })}>
              <option value="all">Todos</option>
              {executives.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <button className="sl-btn-primary" onClick={handleSearch} disabled={loading}>
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
      {!hasSearched && !loading && <div className="rp-placeholder"><p>Selecciona los filtros y haz clic en "Generar reporte"</p></div>}
      {hasSearched && !loading && data.length === 0 && !error && <div className="rp-placeholder"><p>No hay datos para los filtros seleccionados</p></div>}

      {hasSearched && !loading && data.length > 0 && (
        <>
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
              <p className={`rp-kpi-value ${promCumpl >= 80 ? "rp-kpi-value--green" : "rp-kpi-value--orange"}`}>{fmtPct(promCumpl)}</p>
            </div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Ejecutivos activos</p>
              <p className="rp-kpi-value">{execActivos}</p>
            </div>
          </div>

          <div className="rp-charts-grid">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Ventas por ejecutivo</p>
                <p className="rp-chart-subtitle">Total de ventas en el periodo seleccionado</p>
              </div>
              <div className="rp-chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={execChartData} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="nombre" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} formatter={(v) => fmtMoney(v)} />
                    <Legend />
                    <Bar dataKey="ventas" name="Ventas totales" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">
                  {selectedExecName && filters.executiveId !== "all"
                    ? `Evolución — ${selectedExecName}`
                    : "Evolución de ventas"}
                </p>
                <p className="rp-chart-subtitle">
                  {filters.executiveId !== "all" ? "Ventas mensuales vs meta" : "Selecciona un ejecutivo para ver su evolución"}
                </p>
              </div>
              <div className="rp-chart-body">
                {evolutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={ttStyle} formatter={(v) => fmtMoney(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="ventas" name="Ventas reales" stroke="#16a34a" strokeWidth={2} dot={{ r: 4, fill: "#16a34a" }} />
                      <Line type="monotone" dataKey="meta" name="Meta" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
                    <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center" }}>
                      Selecciona un ejecutivo en los filtros para ver su evolución mensual
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead><tr>
                <th>Mes</th><th>Ejecutivo</th>
                <th style={{ textAlign: "right" }}>Total ventas</th>
                <th style={{ textAlign: "right" }}>Meta mensual</th>
                <th style={{ textAlign: "center" }}>% Cumplimiento</th>
                <th style={{ textAlign: "center" }}>N° ventas</th>
              </tr></thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.fecha}</td>
                    <td>{row.ejecutivo}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.totalVentasSinIVA)}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.meta)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`sl-badge ${cumplColor(row.pctDec)}`}>{fmtPct(row.pctDec)}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="sl-badge sl-badge--info">{row.cantidadVentas}</span>
                    </td>
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