import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getQuotes, approveQuote, rejectQuote } from "../../services/quoteService";
import { useAuth } from "../../context/AuthContext";
import { Search, Plus } from "lucide-react";
import { LoadingPage } from "../../components/LoadingPage";
import "./quotes.css";

const STATUS = {
  aprobado:  { label: "Aprobada",  cls: "qt-badge--success" },
  pendiente: { label: "Pendiente", cls: "qt-badge--warning" },
  rechazado: { label: "Rechazada", cls: "qt-badge--error"   },
};

const normalize = (s = "") =>
  String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function QuotesPage() {
  const { isOwner } = useAuth();
  const [quotes, setQuotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("todas");
  const [search, setSearch]   = useState("");

  const load = async () => {
    try {
      const res = await getQuotes();
      setQuotes(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try { await approveQuote(id); load(); }
    catch { alert("Error al aprobar"); }
  };

  const handleReject = async (id) => {
    try { await rejectQuote(id); load(); }
    catch { alert("Error al rechazar"); }
  };

  const tabFiltered = useMemo(
    () => tab === "todas" ? quotes : quotes.filter((q) => q.status === tab),
    [quotes, tab]
  );

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return tabFiltered;
    return tabFiltered.filter((item) => {
      const haystack = [
        item.folio,
        item.client?.nombreComercial,
        item.client?.razonSocial,
        item.total != null ? Number(item.total).toFixed(2) : "",
        STATUS[item.status]?.label || item.status,
        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
      ].filter(Boolean).map(normalize).join(" ");
      return haystack.includes(q);
    });
  }, [tabFiltered, search]);

  const count = (s) => quotes.filter((q) => q.status === s).length;

  if (loading) return <LoadingPage />;

  return (
    <div className="qt-page">

      {/* HEADER */}
      <div className="qt-header">
        <h1 className="qt-title">Cotizaciones</h1>
        <div className="qt-header-actions">
          <div className="qt-search-wrap">
            <Search size={15} className="qt-search-icon" />
            <input
              className="qt-search"
              placeholder="Buscar (folio, cliente, total, status, fecha)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link to="/quotes/new" className="qt-btn-primary">
            <Plus size={14} /> Nueva cotización
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="qt-tabs">
        {[
          { key: "todas",    label: `Todas (${quotes.length})` },
          { key: "pendiente",label: `Pendientes (${count("pendiente")})` },
          { key: "aprobado", label: `Aprobadas (${count("aprobado")})` },
          { key: "rechazado",label: `Rechazadas (${count("rechazado")})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            className={`qt-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="qt-table-wrap">
        <table className="qt-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Status</th>
              <th>Creada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const s = STATUS[q.status] || { label: q.status, cls: "" };
              return (
                <tr key={q._id}>
                  <td>{q.folio}</td>
                  <td>{q.client?.nombreComercial || "—"}</td>
                  <td>${q.total?.toFixed(2)}</td>
                  <td><span className={`qt-badge ${s.cls}`}>{s.label}</span></td>
                  <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="qt-actions">
                      <Link to={`/quotes/${q._id}`} className="qt-btn-outline">Ver</Link>
                      {isOwner && q.status === "pendiente" && (
                        <>
                          <button type="button" className="qt-btn-approve" onClick={() => handleApprove(q._id)}>Aprobar</button>
                          <button type="button" className="qt-btn-reject"  onClick={() => handleReject(q._id)}>Rechazar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="qt-empty">No se encontraron cotizaciones con ese criterio.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}