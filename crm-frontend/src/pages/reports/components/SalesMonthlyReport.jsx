import { useState, useEffect, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import {
  getSalesMonthlyReport,
  getReportClients,
  getSalesGoals,
} from "../../../services/reportService";
import { exportToExcel } from "../../../utils/exportToExcel";
import "../reports.css";
import "../../sales/sales.css";
import DateInput from "../../../components/DateInput";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

const cumplColor = (p) =>
  p >= 100 ? "sl-badge--success" : p >= 80 ? "sl-badge--warning" : "sl-badge--error";

// Detecta modo oscuro del body
const isDark = () => document.body.classList.contains("dark");

function useApexTheme() {
  const [dark, setDark] = useState(isDark());
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function SalesMonthlyReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    clientId: "all",
    tipoCliente: "all",
    statusPago: "all",
  });

  const dark = useApexTheme();

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

  const chartData = useMemo(() =>
    [...data].reverse().map((d) => ({
      nombre: d.fecha.split(" ")[0].substring(0, 3),
      ventas: d.totalVentas,
      meta: d.meta,
      cumplimiento: d.pctChart,
    })), [data]);

  const totalVentas = data.reduce((s, d) => s + d.totalVentas, 0);
  const totalMeta = data.reduce((s, d) => s + d.meta, 0);
  const promCumpl = data.length ? data.reduce((s, d) => s + d.pctDec, 0) / data.length : 0;
  const mesesConMeta = data.filter((d) => d.meta > 0).length;
  const mesesCumplidos = data.filter((d) => d.pctDec >= 100).length;

  // ── Colores base según tema ──
  const textColor = dark ? "#94a3b8" : "#6b7280";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  // ── Opciones compartidas ──
  const baseOpts = {
    chart: {
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: true, easing: "easeinout", speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: chartData.map((d) => d.nombre),
      labels: { style: { colors: textColor, fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: textColor, fontSize: "11px" } } },
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: textColor },
      markers: { radius: 4, width: 10, height: 10 },
      itemMargin: { horizontal: 12 },
    },
    tooltip: { theme: dark ? "dark" : "light" },
  };

  // ── Gráfica de barras ──
  const barOptions = {
    ...baseOpts,
    chart: { ...baseOpts.chart, type: "bar", height: 280 },
    plotOptions: {
      bar: { columnWidth: "55%", borderRadius: 5, borderRadiusApplication: "end" },
    },
    colors: ["#16a34a", "#f59e0b"],
    dataLabels: { enabled: false },
    yaxis: {
      ...baseOpts.yaxis,
      labels: {
        ...baseOpts.yaxis.labels,
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      },
    },
    tooltip: {
      ...baseOpts.tooltip,
      y: {
        formatter: (v) => fmtMoney(v),
      },
    },
    fill: { opacity: [1, 0.75] },
  };

  const barSeries = [
    { name: "Ventas reales", data: chartData.map((d) => d.ventas) },
    { name: "Meta", data: chartData.map((d) => d.meta) },
  ];

  // ── Gráfica de línea ──
  const lineOptions = {
    ...baseOpts,
    chart: { ...baseOpts.chart, type: "area", height: 280 },
    stroke: { curve: "smooth", width: 2.5 },
    colors: ["#16a34a"],
    markers: {
      size: 5,
      colors: ["#16a34a"],
      strokeColors: dark ? "#1e293b" : "#ffffff",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    dataLabels: { enabled: false },
    annotations: {
      yaxis: [{
        y: 100,
        borderColor: "#ef4444",
        borderWidth: 1.5,
        strokeDashArray: 5,
        label: {
          text: "Meta 100%",
          position: "right",
          style: { background: "transparent", color: "#ef4444", fontSize: "11px", fontWeight: 500 },
        },
      }],
    },
    yaxis: {
      ...baseOpts.yaxis,
      min: 0,
      max: undefined,
      tickAmount: 5,
      labels: {
        ...baseOpts.yaxis.labels,
        formatter: (v) => `${Math.round(v)}%`,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: dark ? "dark" : "light",
        type: "vertical",
        shadeIntensity: 0.4,
        opacityFrom: 0.35,
        opacityTo: 0.02,
      },
    },
    tooltip: {
      ...baseOpts.tooltip,
      y: { formatter: (v) => `${v}%` },
    },
  };

  const lineSeries = [
    { name: "% Cumplimiento", data: chartData.map((d) => d.cumplimiento) },
  ];

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
      {/* ── FILTROS ── */}
      <div className="rp-filter-card">
        <p className="rp-filter-title">Filtros de búsqueda</p>
        <div className="rp-filter-row">
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha inicio</label>
            <DateInput
              value={filters.startDate.slice(0, 10)}
              onChange={(val) => setFilters({ ...filters, startDate: new Date(val).toISOString() })}
            />
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Fecha fin</label>
            <DateInput
              value={filters.endDate.slice(0, 10)}
              onChange={(val) => setFilters({ ...filters, endDate: new Date(val).toISOString() })}
            />
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
              <button className="sl-btn-secondary" onClick={handleExport}>↓ Exportar Excel</button>
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
          {/* ── KPIs ── */}
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

          {/* ── GRÁFICAS ── */}
          <div className="rp-charts-grid">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Ventas vs Meta mensual</p>
                <p className="rp-chart-subtitle">Comparación de ventas reales contra meta establecida</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`bar-${dark}`}
                  type="bar"
                  options={barOptions}
                  series={barSeries}
                  height={280}
                />
              </div>
            </div>

            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">% Cumplimiento mensual</p>
                <p className="rp-chart-subtitle">Porcentaje de meta alcanzada por mes</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`line-${dark}`}
                  type="area"
                  options={lineOptions}
                  series={lineSeries}
                  height={280}
                />
              </div>
            </div>
          </div>

          {/* ── TABLA ── */}
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