import { useEffect, useState } from "react";
import { getAdvertisingReport, getReportClients } from "../../../services/reportService";
import ReactApexChart from "react-apexcharts";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";
import DateInput from "../../../components/DateInput";

const TIPO_LABELS = { pagada: "Pagada", intercambio: "Intercambio", cortesias: "Cortesías", desarrollo_informativo: "Desarrollo informativo" };
const TIPO_COLORS = { pagada: "#16a34a", intercambio: "#f59e0b", cortesias: "#3b82f6", desarrollo_informativo: "#8b5cf6" };
const TIPO_BADGE = { pagada: "sl-badge--success", intercambio: "sl-badge--warning", cortesias: "sl-badge--info", desarrollo_informativo: "sl-badge--purple" };
function useApexTheme() {
  const [dark, setDark] = useState(() => document.body.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.body.classList.contains("dark"))
    );
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function AdvertisingReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const dark = useApexTheme();
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    clientId: "all", tipoPublicidad: "all", formato: "all",
  });

  useEffect(() => { getReportClients().then((r) => setClients(r.data)).catch(console.error); }, []);

  const handleSearch = async () => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const res = await getAdvertisingReport(filters);
      setData(res.data.data);
    } catch (err) { setError(err.response?.data?.message || "Error al cargar el reporte"); }
    finally { setLoading(false); }
  };

  const tipoCount = data.reduce((acc, d) => { acc[d.tipoPublicidad] = (acc[d.tipoPublicidad] || 0) + 1; return acc; }, {});
  const pieData = Object.entries(tipoCount).map(([tipo, value]) => ({ name: TIPO_LABELS[tipo] || tipo, value, tipo }));
  const fmtCount = Object.entries(data.reduce((acc, d) => { acc[d.formato] = (acc[d.formato] || 0) + 1; return acc; }, {}))
    .map(([name, cantidad]) => ({ name, cantidad })).sort((a, b) => b.cantidad - a.cantidad);

  const total = data.length;
  const clienteCount = data.reduce((acc, d) => { acc[d.cliente] = (acc[d.cliente] || 0) + 1; return acc; }, {});
  const topCliente = Object.entries(clienteCount).sort((a, b) => b[1] - a[1])[0];
  const textColor = dark ? "#94a3b8" : "#6b7280";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  // ── Gráfica 1: Donut por tipo de publicidad ──
  const donutOptions = {
    chart: {
      type: "donut",
      height: 260,
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: true, easing: "easeinout", speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    labels: pieData.map((d) => d.name),
    colors: pieData.map((d) => TIPO_COLORS[d.tipo] || "#94a3b8"),
    legend: { show: false },   // usamos tu leyenda custom de abajo
    dataLabels: {
      enabled: true,
      style: { fontSize: "12px", fontFamily: "inherit", fontWeight: 500 },
      formatter: (val) => `${Math.round(val)}%`,
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "13px",
              fontFamily: "inherit",
              color: textColor,
              formatter: () => String(total),
            },
            value: {
              fontSize: "22px",
              fontFamily: "inherit",
              fontWeight: 500,
              color: dark ? "#f1f5f9" : "#111827",
            },
          },
        },
      },
    },
    stroke: { width: 2, colors: [dark ? "#0f172a" : "#ffffff"] },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: { formatter: (v) => `${v} publicaciones` },
    },
  };

  const donutSeries = pieData.map((d) => d.value);

  // ── Gráfica 2: Barras por formato ──
  const barFmtOptions = {
    chart: {
      type: "bar",
      height: 300,
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: true, easing: "easeinout", speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    plotOptions: {
      bar: { columnWidth: "50%", borderRadius: 5, borderRadiusApplication: "end" },
    },
    colors: ["#16a34a"],
    dataLabels: {
      enabled: true,
      style: { fontSize: "11px", fontFamily: "inherit", colors: [dark ? "#f1f5f9" : "#111827"] },
      offsetY: -6,
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: fmtCount.map((d) => d.name),
      labels: { style: { colors: textColor, fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: textColor, fontSize: "11px" },
        formatter: (v) => Math.round(v),
      },
    },
    legend: { show: false },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: { formatter: (v) => `${v} publicaciones` },
    },
  };

  const barFmtSeries = [
    { name: "Publicaciones", data: fmtCount.map((d) => d.cantidad) },
  ];
  const handleExport = () => {
    exportToExcel(data.map((row) => ({
      "Fecha": row.fecha,
      "Cliente": row.cliente,
      "Tipo Publicidad": TIPO_LABELS[row.tipoPublicidad] || row.tipoPublicidad,
      "Formato": row.formato,
    })), "reporte_publicidad");
  };

  return (
    <div>
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
            <select className="sl-select-full" value={filters.clientId} onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}>
              <option value="all">Todos</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.nombreComercial}</option>)}
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Tipo publicidad</label>
            <select className="sl-select-full" value={filters.tipoPublicidad} onChange={(e) => setFilters({ ...filters, tipoPublicidad: e.target.value })}>
              <option value="all">Todas</option>
              <option value="pagada">Pagada</option>
              <option value="intercambio">Intercambio</option>
              <option value="cortesias">Cortesías</option>
              <option value="desarrollo_informativo">Desarrollo informativo</option>
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Formato</label>
            <select className="sl-select-full" value={filters.formato} onChange={(e) => setFilters({ ...filters, formato: e.target.value })}>
              <option value="all">Todos</option>
              <option value="1/2 plana">1/2 plana</option>
              <option value="cintillo">Cintillo</option>
              <option value="1/4 plana">1/4 plana</option>
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
            <div className="rp-kpi rp-kpi--blue"><p className="rp-kpi-label">Total publicaciones</p><p className="rp-kpi-value">{total}</p></div>
            <div className="rp-kpi rp-kpi--purple"><p className="rp-kpi-label">Tipos de publicidad</p><p className="rp-kpi-value">{Object.keys(tipoCount).length}</p></div>
            <div className="rp-kpi rp-kpi--green"><p className="rp-kpi-label">Formatos utilizados</p><p className="rp-kpi-value">{fmtCount.length}</p></div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Cliente más activo</p>
              <p className="rp-kpi-value" style={{ fontSize: 15 }} title={topCliente?.[0]}>
                {topCliente ? (topCliente[0].length > 18 ? topCliente[0].slice(0, 18) + "…" : topCliente[0]) : "N/A"}
              </p>
              {topCliente && <p className="rp-kpi-sub">{topCliente[1]} publicaciones</p>}
            </div>
          </div>

          <div className="rp-charts-grid">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Distribución por tipo de publicidad</p>
                <p className="rp-chart-subtitle">Porcentaje de cada tipo sobre el total</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`donut-${dark}`}
                  type="donut"
                  options={donutOptions}
                  series={donutSeries}
                  height={260}
                />
              </div>
              <div className="rp-pie-legend">
                {pieData.map((item, i) => (
                  <div key={i} className="rp-pie-legend-row">
                    <span>
                      <span className="rp-pie-legend-dot" style={{ background: TIPO_COLORS[item.tipo] || "#94a3b8" }} />
                      <span className="rp-pie-legend-name">{item.name}</span>
                    </span>
                    <span className="rp-pie-legend-val">{((item.value / total) * 100).toFixed(1)}% ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Distribución por formato</p>
                <p className="rp-chart-subtitle">Cantidad de publicaciones por formato</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`bar-fmt-${dark}`}
                  type="bar"
                  options={barFmtOptions}
                  series={barFmtSeries}
                  height={300}
                />
              </div>
              <p className="rp-chart-foot">Total de publicaciones: {total}</p>
            </div>
          </div>

          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead><tr><th>Fecha</th><th>Cliente</th><th>Tipo publicidad</th><th>Formato</th></tr></thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.fecha}</td>
                    <td>{row.cliente}</td>
                    <td><span className={`sl-badge ${TIPO_BADGE[row.tipoPublicidad] || "sl-badge--gray"}`}>{TIPO_LABELS[row.tipoPublicidad] || row.tipoPublicidad}</span></td>
                    <td><span className="sl-badge sl-badge--gray">{row.formato}</span></td>
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