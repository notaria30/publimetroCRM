import { useState, useEffect } from "react";
import { getActiveClientsReport } from "../../../services/reportService";
import ReactApexChart from "react-apexcharts";
import { Search } from "lucide-react";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(v || 0);
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

export default function ActiveClientsReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [search, setSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const dark = useApexTheme();

  const handleSearch = async () => {
    setLoading(true); setHasSearched(true);
    try {
      const res = await getActiveClientsReport();
      setData(res.data.data);
      setResumen(res.data.resumen);
    } catch (err) { setError(err.response?.data?.message || "Error al cargar el reporte"); }
    finally { setLoading(false); }
  };

  const filtered = data.filter((c) =>
    c.cliente.toLowerCase().includes(search.toLowerCase()) ||
    (c.rfc || "").toLowerCase().includes(search.toLowerCase())
  );

  const pieData = [
    { name: "Activos", value: resumen?.activos || 0, color: "#16a34a" },
    { name: "Inactivos", value: resumen?.inactivos || 0, color: "#ef4444" },
  ];

  const topClients = [...data].sort((a, b) => b.totalVentas - a.totalVentas).slice(0, 10).map((c) => ({
    nombre: c.cliente.length > 20 ? c.cliente.slice(0, 20) + "…" : c.cliente,
    ventas: c.totalVentas, estado: c.estado,
  }));

  const totalVentasActivos = data.filter((c) => c.estado === "Activo").reduce((s, c) => s + c.totalVentas, 0);
  const pctActivos = resumen?.totalClientes > 0 ? (resumen.activos / resumen.totalClientes) * 100 : 0;
  const promedio = resumen?.activos > 0 ? totalVentasActivos / resumen.activos : 0;
  const textColor = dark ? "#94a3b8" : "#6b7280";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  // ── Gráfica 1: Donut activos vs inactivos ──
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
    colors: pieData.map((d) => d.color),
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: textColor },
      markers: { radius: 4, width: 10, height: 10 },
    },
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
              formatter: () => String(resumen?.totalClientes || 0),
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
      y: { formatter: (v) => `${v} clientes` },
    },
  };

  const donutSeries = pieData.map((d) => d.value);

  // ── Gráfica 2: Barras horizontales top 10 clientes ──
  const barTopOptions = {
    chart: {
      type: "bar",
      height: 280,
      toolbar: { show: false },
      fontFamily: "inherit",
      background: "transparent",
      animations: { enabled: true, easing: "easeinout", speed: 600 },
    },
    theme: { mode: dark ? "dark" : "light" },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        borderRadiusApplication: "end",
        barHeight: "55%",
        distributed: true,   // cada barra toma su color individual
      },
    },
    colors: topClients.map((c) => c.estado === "Activo" ? "#16a34a" : "#ef4444"),
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories: topClients.map((c) => c.nombre),
      labels: {
        style: { colors: textColor, fontSize: "10px" },
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: textColor, fontSize: "10px" } },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: {
        formatter: (v) =>
          new Intl.NumberFormat("es-MX", {
            style: "currency", currency: "MXN",
            minimumFractionDigits: 2,
          }).format(v),
        title: { formatter: () => "Ventas totales:" },
      },
    },
  };

  const barTopSeries = [
    { name: "Ventas totales", data: topClients.map((c) => c.ventas) },
  ];
  const handleExport = () => {
    exportToExcel(filtered.map((row) => ({
      "Cliente": row.cliente,
      "RFC": row.rfc || "—",
      "Tipo Cliente": row.tipoCliente,
      "Estado": row.estado,
      "Última Venta": row.ultimaVenta,
      "Total Ventas (90d)": row.totalVentas,
      "N° Ventas": row.cantidadVentas,
    })), "clientes_activos");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        {data.length > 0 && (
          <button className="sl-btn-secondary" onClick={handleExport}>
            ↓ Exportar Excel
          </button>
        )}
        <button className="sl-btn-primary" onClick={handleSearch} disabled={loading}>
          {loading ? "Cargando…" : "Generar reporte"}
        </button>
      </div>

      {error && <div className="rp-error">⚠ {error}</div>}
      {!hasSearched && !loading && <div className="rp-placeholder"><p>Haz clic en "Generar reporte" para ver el análisis de clientes activos</p></div>}
      {hasSearched && !loading && data.length === 0 && !error && <div className="rp-placeholder"><p>No hay clientes registrados</p></div>}

      {hasSearched && !loading && resumen && data.length > 0 && (
        <>
          <div className="rp-kpi-grid">
            <div className="rp-kpi rp-kpi--green">
              <p className="rp-kpi-label">Total clientes</p>
              <p className="rp-kpi-value">{resumen.totalClientes}</p>
            </div>
            <div className="rp-kpi rp-kpi--green">
              <p className="rp-kpi-label">Clientes activos</p>
              <p className="rp-kpi-value rp-kpi-value--green">{resumen.activos}</p>
              <p className="rp-kpi-sub">{pctActivos.toFixed(1)}% del total</p>
            </div>
            <div className="rp-kpi rp-kpi--red">
              <p className="rp-kpi-label">Clientes inactivos</p>
              <p className="rp-kpi-value rp-kpi-value--red">{resumen.inactivos}</p>
              <p className="rp-kpi-sub">Sin ventas en últimos {resumen.periodoDias} días</p>
            </div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Promedio por activo</p>
              <p className="rp-kpi-value" style={{ fontSize: 16 }}>{fmtMoney(promedio)}</p>
            </div>
          </div>

          <div className="rp-charts-grid">
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Distribución de clientes</p>
                <p className="rp-chart-subtitle">Activos vs Inactivos en últimos {resumen.periodoDias} días</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`donut-clients-${dark}`}
                  type="donut"
                  options={donutOptions}
                  series={donutSeries}
                  height={260}
                />
              </div>
              <p className="rp-chart-foot">{resumen.activos} activos generaron {fmtMoney(totalVentasActivos)} en ventas</p>
            </div>

            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Top 10 clientes por ventas</p>
                <p className="rp-chart-subtitle">Mayor facturación en últimos {resumen.periodoDias} días</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart
                  key={`bar-top-${dark}`}
                  type="bar"
                  options={barTopOptions}
                  series={barTopSeries}
                  height={280}
                />
              </div>
              {topClients[0] && <p className="rp-chart-foot">🏆 Cliente líder: <strong>{topClients[0].nombre}</strong> con {fmtMoney(topClients[0].ventas)}</p>}
            </div>
          </div>

          {/* BUSCADOR */}
          <div style={{ marginBottom: 14 }}>
            <div className="sl-search-wrap">
              <Search size={15} className="sl-search-icon" />
              <input className="sl-search" placeholder="Buscar cliente por nombre o RFC…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead><tr>
                <th>Cliente</th><th>RFC</th><th>Tipo</th>
                <th style={{ textAlign: "center" }}>Estado</th>
                <th>Última venta</th>
                <th style={{ textAlign: "right" }}>Total ventas (90d)</th>
                <th style={{ textAlign: "center" }}>N° ventas</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7} className="sl-empty">No se encontraron clientes con ese criterio</td></tr>
                  : filtered.map((c, i) => (
                    <tr key={i}>
                      <td>{c.cliente}</td>
                      <td>{c.rfc || "—"}</td>
                      <td><span className="sl-badge sl-badge--gray">{c.tipoCliente}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`sl-badge ${c.estado === "Activo" ? "sl-badge--success" : "sl-badge--error"}`}>{c.estado}</span>
                      </td>
                      <td>{c.ultimaVenta}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(c.totalVentas)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`sl-badge ${c.cantidadVentas > 0 ? "sl-badge--info" : "sl-badge--gray"}`}>{c.cantidadVentas}</span>
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