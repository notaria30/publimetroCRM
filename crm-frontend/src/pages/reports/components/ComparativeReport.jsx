// ============================================================
// ComparativeReport.jsx — Comparativo: cotizado vs facturado
// ============================================================
import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getComparativeReport, getReportClients } from "../../../services/reportService";
import { exportToExcel } from "../../../utils/exportToExcel";
import "../reports.css";
import "../../sales/sales.css";
import DateInput from "../../../components/DateInput";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const fmtMoney2 = (v) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0);

const fmtPct = (v) => `${(v || 0).toFixed(2)}%`;
const sign = (v) => (v > 0 ? "+" : "");

const fmtFecha = (v) =>
  v ? new Date(v).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const TIPO_CLIENTE_ABBR = {
  "iniciativa privada": "IP",
  "gobierno": "GOB",
  "corporativo": "COR",
};
const tipoClienteAbbr = (t) => TIPO_CLIENTE_ABBR[t] || "—";

const varColor = (v) => (v > 0 ? "#16a34a" : v < 0 ? "#ef4444" : "inherit");
const varBadge = (v) => (v > 0 ? "sl-badge--success" : v < 0 ? "sl-badge--error" : "sl-badge--gray");

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

export function ComparativeReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [totales, setTotales] = useState({ importeBase: 0, importeFinal: 0, variacionMonto: 0, variacionPorcentaje: 0, importePago: 0, registros: 0 });
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const dark = useApexTheme();

  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    endDate: new Date().toISOString(),
    clientId: "all",
    tipoCliente: "all",
    tipoVenta: "all",
    pagado: "all",
  });

  useEffect(() => {
    getReportClients().then((r) => setClients(r.data)).catch(console.error);
  }, []);

  const handleSearch = async () => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      const res = await getComparativeReport(filters);
      setData(res.data.data || []);
      setTotales(res.data.totales || { importeBase: 0, importeFinal: 0, variacionMonto: 0, variacionPorcentaje: 0, importePago: 0, registros: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  };

  // ── Gráfica: cotizado vs facturado por cliente (top 10 por importe final) ──
  const chartData = useMemo(() => {
    const byClient = new Map();
    data.forEach((r) => {
      if (!byClient.has(r.cliente)) byClient.set(r.cliente, { cliente: r.cliente, base: 0, final: 0 });
      const c = byClient.get(r.cliente);
      c.base += r.importeBase || 0;
      c.final += r.importeFinal || 0;
    });
    return [...byClient.values()]
      .sort((a, b) => b.final - a.final)
      .slice(0, 10);
  }, [data]);

  const textColor = dark ? "#94a3b8" : "#6b7280";
  const gridColor = dark ? "#1e293b" : "#f1f5f9";

  const barOptions = {
    chart: { type: "bar", height: 380, toolbar: { show: false }, fontFamily: "inherit", background: "transparent", animations: { enabled: true, easing: "easeinout", speed: 600 } },
    theme: { mode: dark ? "dark" : "light" },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 5, borderRadiusApplication: "end" } },
    colors: ["#f59e0b", "#16a34a"],
    dataLabels: { enabled: false },
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: chartData.map((d) => d.cliente),
      labels: { style: { colors: textColor, fontSize: "11px" }, rotate: -30, trim: true, maxHeight: 90 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: textColor, fontSize: "11px" }, formatter: (v) => `$${(v / 1000).toFixed(0)}k` } },
    legend: { position: "bottom", fontSize: "12px", labels: { colors: textColor }, markers: { radius: 4, width: 10, height: 10 }, itemMargin: { horizontal: 12 } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v) => fmtMoney(v) } },
    fill: { opacity: [0.85, 1] },
  };
  const barSeries = [
    { name: "Importe base (cotizado)", data: chartData.map((d) => d.base) },
    { name: "Importe final (vendido)", data: chartData.map((d) => d.final) },
  ];

  const handleExport = () => {
    exportToExcel(data.map((row) => ({
      "Tipo de venta": cap(row.tipoVenta),
      "Tipo de cliente": tipoClienteAbbr(row.tipoCliente),
      "Cliente": row.cliente,
      "Cotización": row.cotizacion ?? "",
      "Factura": row.factura ?? "",
      "Fecha": fmtFecha(row.fecha),
      "Importe base": Number((row.importeBase || 0).toFixed(2)),
      "Importe final": Number((row.importeFinal || 0).toFixed(2)),
      "Variación $": Number((row.variacionMonto || 0).toFixed(2)),
      "Variación %": Number((row.variacionPorcentaje || 0).toFixed(2)),
      "Importe pago": row.importePago == null ? "" : Number(row.importePago.toFixed(2)),
      "Fecha pago": row.fechaPago ? fmtFecha(row.fechaPago) : "",
    })), "comparativo_ventas");
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
            <label className="sl-label">Cliente (Razón social)</label>
            <select className="sl-select-full" value={filters.clientId}
              onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}>
              <option value="all">Todos</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.razonSocial || c.nombreComercial}</option>
              ))}
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Tipo de cliente</label>
            <select className="sl-select-full" value={filters.tipoCliente}
              onChange={(e) => setFilters({ ...filters, tipoCliente: e.target.value })}>
              <option value="all">Todos</option>
              <option value="corporativo">COR</option>
              <option value="iniciativa privada">IP</option>
              <option value="gobierno">GOB</option>
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Tipo de venta</label>
            <select className="sl-select-full" value={filters.tipoVenta}
              onChange={(e) => setFilters({ ...filters, tipoVenta: e.target.value })}>
              <option value="all">Todas</option>
              <option value="facturada">Facturada</option>
              <option value="intercambio">Intercambio</option>
            </select>
          </div>
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Pagado</label>
            <select className="sl-select-full" value={filters.pagado}
              onChange={(e) => setFilters({ ...filters, pagado: e.target.value })}>
              <option value="all">Todos</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
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
              <p className="rp-kpi-label">Total Importe base</p>
              <p className="rp-kpi-value">{fmtMoney(totales.importeBase)}</p>
            </div>
            <div className="rp-kpi rp-kpi--purple">
              <p className="rp-kpi-label">Total Importe final</p>
              <p className="rp-kpi-value">{fmtMoney(totales.importeFinal)}</p>
            </div>
            <div className="rp-kpi rp-kpi--green">
              <p className="rp-kpi-label">Variación total</p>
              <p className={`rp-kpi-value ${totales.variacionMonto >= 0 ? "rp-kpi-value--green" : "rp-kpi-value--red"}`}>
                {sign(totales.variacionMonto)}{fmtMoney(totales.variacionMonto)}
              </p>
            </div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Variación %</p>
              <p className={`rp-kpi-value ${totales.variacionPorcentaje >= 0 ? "rp-kpi-value--green" : "rp-kpi-value--red"}`}>
                {sign(totales.variacionPorcentaje)}{fmtPct(totales.variacionPorcentaje)}
              </p>
            </div>
          </div>

          {/* ── GRÁFICA ── */}
          <div className="rp-charts-grid rp-charts-grid--full" style={{ marginBottom: 20 }}>
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Cotizado vs vendido por cliente</p>
                <p className="rp-chart-subtitle">Top 10 clientes por importe final</p>
              </div>
              <div className="rp-chart-body">
                <ReactApexChart key={`bar-comp-${dark}`} type="bar" options={barOptions} series={barSeries} height={380} />
              </div>
            </div>
          </div>

          {/* ── TABLA DETALLE ── */}
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Tipo de venta</th>
                  <th>Tipo de cliente</th>
                  <th>Cliente</th>
                  <th style={{ textAlign: "center" }}>Cotización</th>
                  <th style={{ textAlign: "center" }}>Factura</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: "right" }}>Importe base</th>
                  <th style={{ textAlign: "right" }}>Importe final</th>
                  <th style={{ textAlign: "right" }}>Variación $</th>
                  <th style={{ textAlign: "center" }}>Variación %</th>
                  <th style={{ textAlign: "right" }}>Importe pago</th>
                  <th>Fecha pago</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`sl-badge ${r.tipoVenta === "facturada" ? "sl-badge--success" : "sl-badge--purple"}`}>
                        {cap(r.tipoVenta)}
                      </span>
                    </td>
                    <td>{tipoClienteAbbr(r.tipoCliente)}</td>
                    <td>{r.cliente}</td>
                    <td style={{ textAlign: "center" }}>{r.cotizacion ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{r.factura ?? "—"}</td>
                    <td>{fmtFecha(r.fecha)}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney2(r.importeBase)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney2(r.importeFinal)}</td>
                    <td style={{ textAlign: "right", color: varColor(r.variacionMonto), fontWeight: 600 }}>
                      {sign(r.variacionMonto)}{fmtMoney2(r.variacionMonto)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`sl-badge ${varBadge(r.variacionMonto)}`}>
                        {sign(r.variacionPorcentaje)}{fmtPct(r.variacionPorcentaje)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: r.importePago ? "#15803d" : "#9ca3af" }}>
                      {r.importePago == null ? "—" : fmtMoney2(r.importePago)}
                    </td>
                    <td>{r.fechaPago ? fmtFecha(r.fechaPago) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={6} style={{ textAlign: "right", padding: "12px 16px" }}>Totales</td>
                  <td style={{ textAlign: "right", padding: "12px 16px" }}>{fmtMoney2(totales.importeBase)}</td>
                  <td style={{ textAlign: "right", padding: "12px 16px" }}>{fmtMoney2(totales.importeFinal)}</td>
                  <td style={{ textAlign: "right", padding: "12px 16px", color: varColor(totales.variacionMonto) }}>
                    {sign(totales.variacionMonto)}{fmtMoney2(totales.variacionMonto)}
                  </td>
                  <td style={{ textAlign: "center", padding: "12px 16px" }}>
                    {sign(totales.variacionPorcentaje)}{fmtPct(totales.variacionPorcentaje)}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px 16px", color: "#15803d" }}>{fmtMoney2(totales.importePago)}</td>
                  <td style={{ padding: "12px 16px" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ComparativeReport;
