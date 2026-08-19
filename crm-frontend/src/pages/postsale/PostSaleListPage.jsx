import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPostSales } from "../../services/postSaleService";
import { Search, Plus } from "lucide-react";
import "./postsale.css";
import "../sales/sales.css";
import { PostSaleListSkeleton } from "../../components/skeletons/PostSaleListSkeleton";

const STAGE_META = {
  servicio_post_venta:   { label: "Servicio Post-Venta",       cls: "ps-badge--info" },
  medicion_resultados:   { label: "Medición de resultados",    cls: "ps-badge--primary" },
  encuesta_satisfaccion: { label: "Encuesta de satisfacción",  cls: "ps-badge--secondary" },
  renovacion:            { label: "Renovación",                cls: "ps-badge--warning" },
  reportes:              { label: "Reportes",                  cls: "sl-badge--success" },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function PostSaleListPage() {
  const navigate = useNavigate();
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    getPostSales()
      .then((res) => setList(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) =>
      [
        item.sale?.client?.nombreComercial,
        item.sale?.assignedTo?.name,
        item.sale?.folio || item.sale?._id,
        (item.postSaleStage || "").replace(/_/g, " "),
        String(item.encuestaSatisfaccion?.calificacion ?? ""),
        item.renovacion?.requiereRenovacion ? "si" : "no",
        item.notas,
        item.updatedAt?.slice(0, 10),
      ].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [list, search]);

if (loading) return <PostSaleListSkeleton />;

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Post-Venta</h1>
        <div className="sl-header-actions">
          <div className="sl-search-wrap">
            <Search size={15} className="sl-search-icon" />
            <input
              className="sl-search"
              placeholder="Buscar (cliente, ejecutivo, venta, etapa, notas)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="sl-btn-primary" onClick={() => navigate("/postsale/create")}>
            <Plus size={14} /> Nueva Post-Venta
          </button>
        </div>
      </div>

      {/* GRID DE CARDS */}
      {filtered.length === 0 ? (
        <div className="ps-empty">No hay registros post-venta.</div>
      ) : (
        <div className="ps-grid">
          {filtered.map((item) => {
            const stage    = item.postSaleStage || "";
            const meta     = STAGE_META[stage] || { label: stage.replace(/_/g, " ") || "Sin etapa", cls: "ps-badge--default" };
            const rating   = item.encuestaSatisfaccion?.calificacion ?? null;
            const renewal  = item.renovacion?.requiereRenovacion ?? false;
            const renewDate = item.renovacion?.fechaPosibleRenovacion ?? null;
            const saleFolio = item.sale?.folio || item.sale?._id || "—";

            return (
              <div key={item._id} className="ps-card">
                <div className="ps-card-body">
                  {/* HEADER ROW */}
                  <div className="ps-card-header-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="ps-card-client" title={item.sale?.client?.nombreComercial || "—"}>
                        {item.sale?.client?.nombreComercial || "—"}
                      </div>
                      <div className="ps-card-exec">
                        Ejecutivo: <strong>{item.sale?.assignedTo?.name || "—"}</strong>
                      </div>
                    </div>
                    <span className={`sl-badge ${meta.cls}`}>{meta.label}</span>
                  </div>

                  <hr className="ps-card-divider" />

                  {/* INFO GRID */}
                  <div className="ps-card-info">
                    <div className="ps-card-info-item">
                      <div className="ps-info-caption">Actualizado</div>
                      <div className="ps-info-value">{fmtDate(item.updatedAt)}</div>
                    </div>
                    <div className="ps-card-info-item">
                      <div className="ps-info-caption">Venta</div>
                      <div className="ps-info-value">{String(saleFolio)}</div>
                    </div>
                    <div className="ps-card-info-item">
                      <div className="ps-info-caption">Calificación</div>
                      <div className="ps-info-value">{rating !== null ? rating : "—"}</div>
                    </div>
                    <div className="ps-card-info-item">
                      <div className="ps-info-caption">Renovación</div>
                      <div className="ps-info-value">{renewal ? "Sí" : "No"}</div>
                    </div>
                    {renewal && (
                      <div className="ps-card-info-item" style={{ gridColumn: "span 2" }}>
                        <div className="ps-info-caption">Fecha posible de renovación</div>
                        <div className="ps-info-value">{fmtDate(renewDate)}</div>
                      </div>
                    )}
                  </div>

                  {/* NOTAS PREVIEW */}
                  {item.notas?.trim() && (
                    <>
                      <hr className="ps-card-divider" />
                      <p className="ps-notes-preview">{item.notas}</p>
                    </>
                  )}
                </div>

                {/* FOOTER */}
                <div className="ps-card-footer">
                  <Link to={`/postsale/${item._id}`} className="sl-btn-outline" style={{ flex: 1, justifyContent: "center" }}>
                    Ver detalles
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}