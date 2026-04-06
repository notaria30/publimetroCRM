// ============================================================
// ComparativeReport.jsx
// ============================================================
import { useEffect, useState } from "react";
import { getComparativeReport, getReportClients, getReportExecutives } from "../../../services/reportService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";

const fmtMoney = (v) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const ttStyle = { background: "#1e293b", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 12 };
const sign = (v) => (v > 0 ? "+" : "");

export function ComparativeReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const anioActual = new Date().getFullYear();
  const aniosDisponibles = [anioActual - 2, anioActual - 1, anioActual];

  const [filters, setFilters] = useState({
    modo: "anual",           // "anual" | "mensual" | "mes-libre"
    mesBase: String(new Date().getMonth() + 1),
    anioBase: String(anioActual - 1),
    mesComp: String(new Date().getMonth() + 1),
    anioComp: String(anioActual),
    tipoCliente: "all",
    ejecutivoId: "all",
  });

  useEffect(() => {
    Promise.all([getReportClients(), getReportExecutives()])
      .then(([, er]) => setExecutives(er.data))
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    setLoading(true); setError(null); setHasSearched(true);
    try {
      // Armar params según modo
      const params = {
        tipoCliente: filters.tipoCliente,
        ejecutivoId: filters.ejecutivoId,
      };

      if (filters.modo === "mes-libre") {
        params.periodoBase = "mes-libre";
        params.periodoComparativo = "mes-libre";
        params.mesBase = filters.mesBase;
        params.anioBase = filters.anioBase;
        params.mesComp = filters.mesComp;
        params.anioComp = filters.anioComp;
      } else {
        params.periodoBase = filters.modo;
        params.periodoComparativo = filters.modo;
      }

      const res = await getComparativeReport(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data.reduce((acc, item) => {
    const ex = acc.find((d) => d.fecha === item.fecha);
    if (ex) { ex.periodoBase += item.periodoBase; ex.periodoComparativo += item.periodoComparativo; }
    else acc.push({ fecha: item.fecha, periodoBase: item.periodoBase, periodoComparativo: item.periodoComparativo });
    return acc;
  }, []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const totalBase = data.reduce((s, d) => s + d.periodoBase, 0);
  const totalComp = data.reduce((s, d) => s + d.periodoComparativo, 0);
  const varTotal = totalComp - totalBase;
  const varPct = totalBase > 0 ? (varTotal / totalBase) * 100 : totalComp > 0 ? 100 : 0;
  const crecimiento = data.filter((d) => d.variacionMonto > 0).length;
  const decrecimiento = data.filter((d) => d.variacionMonto < 0).length;
  const nuevos = data.filter((d) => d.periodoBase === 0 && d.periodoComparativo > 0).length;
  const perdidos = data.filter((d) => d.periodoBase > 0 && d.periodoComparativo === 0).length;

  const varBadge = (v) => (v > 0 ? "sl-badge--success" : v < 0 ? "sl-badge--error" : "sl-badge--gray");

  const handleExport = () => {
    exportToExcel(data.map((row) => ({
      "Período": row.fecha,
      "Cliente": row.cliente,
      "Periodo Base": row.periodoBase,
      "Comparativo": row.periodoComparativo,
      "Variación $": row.variacionMonto,
      "Variación %": Number(((row.variacionPorcentaje || 0) * 100).toFixed(2)),
      "Ejecutivo": row.ejecutivo,
    })), "reporte_comparativo");
  };

  return (
    <div>
      <div className="rp-filter-card">
        <p className="rp-filter-title">Filtros del reporte</p>
        <div className="rp-filter-row">

          {/* Modo de comparación */}
          <div className="rp-filter-group">
            <label className="sl-label">Tipo de comparación</label>
            <select className="sl-select-full" value={filters.modo}
              onChange={(e) => setFilters({ ...filters, modo: e.target.value })}>
              <option value="anual">Anual (año completo vs año anterior)</option>
              <option value="mensual">Mensual (mismo mes, año anterior vs actual)</option>
              <option value="mes-libre">Mes libre (elige dos meses)</option>
            </select>
          </div>

          {/* Selectores de mes libre */}
          {filters.modo === "mes-libre" && (
            <>
              <div className="rp-filter-group">
                <label className="sl-label">Mes base</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="sl-select-full" value={filters.mesBase}
                    onChange={(e) => setFilters({ ...filters, mesBase: e.target.value })}>
                    {MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                  <select className="sl-select-full" value={filters.anioBase}
                    onChange={(e) => setFilters({ ...filters, anioBase: e.target.value })}>
                    {aniosDisponibles.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="rp-filter-group">
                <label className="sl-label">Mes comparativo</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="sl-select-full" value={filters.mesComp}
                    onChange={(e) => setFilters({ ...filters, mesComp: e.target.value })}>
                    {MESES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                  <select className="sl-select-full" value={filters.anioComp}
                    onChange={(e) => setFilters({ ...filters, anioComp: e.target.value })}>
                    {aniosDisponibles.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Tipo cliente */}
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

          {/* Ejecutivo */}
          <div className="rp-filter-group rp-filter-group--sm">
            <label className="sl-label">Ejecutivo</label>
            <select className="sl-select-full" value={filters.ejecutivoId}
              onChange={(e) => setFilters({ ...filters, ejecutivoId: e.target.value })}>
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
            <div className="rp-kpi rp-kpi--blue"><p className="rp-kpi-label">Ventas periodo base</p><p className="rp-kpi-value">{fmtMoney(totalBase)}</p></div>
            <div className="rp-kpi rp-kpi--purple"><p className="rp-kpi-label">Ventas comparativo</p><p className="rp-kpi-value">{fmtMoney(totalComp)}</p></div>
            <div className="rp-kpi rp-kpi--green">
              <p className="rp-kpi-label">Variación total</p>
              <p className={`rp-kpi-value ${varTotal >= 0 ? "rp-kpi-value--green" : "rp-kpi-value--red"}`}>{sign(varTotal)}{fmtMoney(varTotal)}</p>
            </div>
            <div className="rp-kpi rp-kpi--orange">
              <p className="rp-kpi-label">Variación %</p>
              <p className={`rp-kpi-value ${varPct >= 0 ? "rp-kpi-value--green" : "rp-kpi-value--red"}`}>{sign(varPct)}{Math.round(varPct)}%</p>
            </div>
          </div>

          <div className="rp-kpi-grid" style={{ marginBottom: 20 }}>
            <div className="rp-kpi rp-kpi--green"><p className="rp-kpi-label">En crecimiento</p><p className="rp-kpi-value rp-kpi-value--green">{crecimiento}</p></div>
            <div className="rp-kpi rp-kpi--red"><p className="rp-kpi-label">En decrecimiento</p><p className="rp-kpi-value rp-kpi-value--red">{decrecimiento}</p></div>
            <div className="rp-kpi rp-kpi--blue"><p className="rp-kpi-label">Clientes nuevos</p><p className="rp-kpi-value">{nuevos}</p></div>
            <div className="rp-kpi rp-kpi--orange"><p className="rp-kpi-label">Clientes perdidos</p><p className="rp-kpi-value rp-kpi-value--orange">{perdidos}</p></div>
          </div>

          <div className="rp-charts-grid rp-charts-grid--full" style={{ marginBottom: 20 }}>
            <div className="rp-chart-card">
              <div className="rp-chart-header">
                <p className="rp-chart-title">Comparación de ventas por período</p>
                <p className="rp-chart-subtitle">Ingresos entre períodos seleccionados</p>
              </div>
              <div className="rp-chart-body">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, left: 60, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} formatter={(v, n) => [fmtMoney(v), n]} labelFormatter={(l) => `Período: ${l}`} />
                    <Legend />
                    <Bar dataKey="periodoBase" name="Periodo base" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="periodoComparativo" name="Periodo comparativo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead><tr>
                <th>Fecha</th><th>Cliente</th>
                <th style={{ textAlign: "right" }}>Periodo base</th>
                <th style={{ textAlign: "right" }}>Comparativo</th>
                <th style={{ textAlign: "right" }}>Variación $</th>
                <th style={{ textAlign: "center" }}>Variación %</th>
                <th>Ejecutivo</th>
              </tr></thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    <td>{row.fecha}</td>
                    <td>{row.cliente}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.periodoBase)}</td>
                    <td style={{ textAlign: "right" }}>{fmtMoney(row.periodoComparativo)}</td>
                    <td style={{ textAlign: "right", color: row.variacionMonto > 0 ? "#16a34a" : row.variacionMonto < 0 ? "#ef4444" : "inherit", fontWeight: row.variacionMonto !== 0 ? 600 : 400 }}>
                      {sign(row.variacionMonto)}{fmtMoney(row.variacionMonto)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`sl-badge ${varBadge(row.variacionMonto)}`}>{sign(row.variacionPorcentaje)}{Math.round((row.variacionPorcentaje || 0) * 100)}%</span>
                    </td>
                    <td>{row.ejecutivo}</td>
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

export default ComparativeReport;