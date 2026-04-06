import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSales } from "../../services/salesService";
import { Search, Receipt } from "lucide-react";
import "./sales.css";
import { LoadingPage } from "../../components/LoadingPage";

const PIPELINE_LABELS = {
  prospeccion: "Prospección",
  presentacion: "Presentación",
  propuesta: "Propuesta",
  cierre: "Cierre",
};

const PIPELINE_BADGE = {
  prospeccion: "sl-badge--warning",
  presentacion: "sl-badge--info",
  propuesta: "sl-badge--purple",
  cierre: "sl-badge--success",
};

export default function SalesListPage() {
  const navigate = useNavigate();
  const [sales, setSales]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [facturadoFilter, setFacturado] = useState("all");
  const [search, setSearch]             = useState("");

  useEffect(() => {
    getSales()
      .then((res) => setSales(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isFacturado = (s) => Boolean(s.facturado);

  const filtered = sales.filter((s) => {
    if (facturadoFilter === "yes" && !isFacturado(s)) return false;
    if (facturadoFilter === "no"  &&  isFacturado(s)) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [
      String(s.folio || s._id),
      s.client?.nombreComercial,
      String(s.quote?.total ?? ""),
      PIPELINE_LABELS[s.pipelineStage] || s.pipelineStage,
      s.paid ? "si" : "no",
      isFacturado(s) ? "si" : "no",
    ].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

if (loading) return <LoadingPage />;

  return (
    <div className="sl-page">
      <div className="sl-header">
        <h1 className="sl-title">Ventas</h1>
        <div className="sl-header-actions">
          <div className="sl-search-wrap">
            <Search size={15} className="sl-search-icon" />
            <input
              className="sl-search"
              placeholder="Buscar (folio, cliente, total, pipeline)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="sl-select"
            value={facturadoFilter}
            onChange={(e) => setFacturado(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="yes">Facturado: Sí</option>
            <option value="no">Facturado: No</option>
          </select>
        </div>
      </div>

      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Pagada</th>
              <th>Facturado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="sl-empty">No hay ventas registradas.</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s._id}>
                  <td>{s.folio || s._id}</td>
                  <td>{s.client?.nombreComercial || "—"}</td>
                  <td>${(s.quote?.total || 0).toLocaleString("es-MX")}</td>
                  <td>
                    <span className={`sl-badge ${s.paid ? "sl-badge--success" : "sl-badge--error"}`}>
                      {s.paid ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <span className={`sl-badge ${isFacturado(s) ? "sl-badge--success" : "sl-badge--error"}`}>
                      {isFacturado(s) ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <div className="sl-actions">
                      <Link to={`/sales/${s._id}`} className="sl-btn-outline">Ver</Link>
                      <button
                        className="sl-btn-invoice"
                        onClick={() => navigate(`/invoices/new?saleId=${s._id}`)}
                        disabled={isFacturado(s)}
                      >
                        <Receipt size={12} /> Facturar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}