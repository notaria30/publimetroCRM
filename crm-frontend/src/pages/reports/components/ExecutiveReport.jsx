import { useEffect, useState } from "react";
import { getExecutiveReport, getReportClients, getReportExecutives, getSalesGoals } from "../../../services/reportService";
import ReactApexChart from "react-apexcharts";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";
import DateInput from "../../../components/DateInput";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtPct = (v) => `${(v || 0).toFixed(2)}%`;
const cumplColor = (p) => (p >= 100 ? "sl-badge--success" : p >= 80 ? "sl-badge--warning" : "sl-badge--error");
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

export default function ExecutiveReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const dark = useApexTheme();
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
  const textColor = dark ? "#94a3b8" : "#6b7280";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  const baseOpts = {
    chart: {
      toolbar: { show: false }, fontFamily: "inherit", background: "transparent",
      animations: { enabled: true, easing: "easeinout", speed: 600 }
    },
    theme: { mode: dark ? "dark" : "light" },
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    legend: {
      position: "bottom", fontSize: "12px", labels: { colors: textColor },
      markers: { radius: 4, width: 10, height: 10 }, itemMargin: { horizontal: 12 }
    },
    tooltip: { theme: dark ? "dark" : "light" },
  };

  // Gráfica 1: Barras horizontales por ejecutivo
  const barHorizOptions = {
    ...baseOpts,
    chart: { ...baseOpts.chart, type: "bar", height: 300 },
    plotOptions: { bar: { horizontal: true, borderRadius: 5, borderRadiusApplication: "end", barHeight: "55%" } },
    colors: ["#16a34a"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: execChartData.map((d) => d.nombre),
      labels: {
        style: { colors: textColor, fontSize: "11px" },
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`
      },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: textColor, fontSize: "11px" } } },
    tooltip: {
      ...baseOpts.tooltip,
      y: {
        formatter: (v) => new Intl.NumberFormat("es-MX", {
          style: "currency", currency: "MXN",
          minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(v)
      }
    },
  };

  const barHorizSeries = [
    { name: "Ventas totales", data: execChartData.map((d) => d.ventas) },
  ];

  // Gráfica 2: Evolución mensual del ejecutivo seleccionado
  const lineEvolOptions = {
    ...baseOpts,
    chart: { ...baseOpts.chart, type: "line", height: 300 },
    stroke: { curve: "smooth", width: [2.5, 2], dashArray: [0, 6] },
    colors: ["#16a34a", "#f59e0b"],
    markers: {
      size: [5, 4],
      colors: ["#16a34a", "#f59e0b"],
      strokeColors: dark ? "#1e293b" : "#ffffff",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: evolutionData.map((d) => d.mes),
      labels: { style: { colors: textColor, fontSize: "10px" } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: textColor, fontSize: "11px" },
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`
      },
    },
    tooltip: {
      ...baseOpts.tooltip,
      y: {
        formatter: (v) => new Intl.NumberFormat("es-MX", {
          style: "currency", currency: "MXN",
          minimumFractionDigits: 0, maximumFractionDigits: 0
        }).format(v)
      }
    },
  };

  const lineEvolSeries = [
    { name: "Ventas reales", data: evolutionData.map((d) => d.ventas) },
    { name: "Meta", data: evolutionData.map((d) => d.meta) },
  ];
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
                <ReactApexChart
                  key={`bar-exec-${dark}`}
                  type="bar"
                  options={barHorizOptions}
                  series={barHorizSeries}
                  height={300}
                />
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
                  <ReactApexChart
                    key={`line-evol-${dark}`}
                    type="line"
                    options={lineEvolOptions}
                    series={lineEvolSeries}
                    height={300}
                  />
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