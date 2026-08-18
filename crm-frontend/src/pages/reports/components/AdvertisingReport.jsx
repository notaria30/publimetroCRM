import { useEffect, useState } from "react";
import { getAdvertisingReport, getReportClients } from "../../../services/reportService";
import "../reports.css";
import "../../sales/sales.css";
import { exportToExcel } from "../../../utils/exportToExcel";
import DateInput from "../../../components/DateInput";

const TIPO_LABELS = { pagada: "Pagada", intercambio: "Intercambio", cortesias: "Cortesías", desarrollo_informativo: "Desarrollo informativo" };
const TIPO_BADGE = { pagada: "sl-badge--success", intercambio: "sl-badge--warning", cortesias: "sl-badge--info", desarrollo_informativo: "sl-badge--purple" };

export default function AdvertisingReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);
  const [clients, setClients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
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
      )}
    </div>
  );
}