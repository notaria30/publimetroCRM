import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInvoices } from "../../services/invoiceService";
import { useAuth } from "../../context/AuthContext";
import { Search, Plus } from "lucide-react";
import "./invoices.css";
import "../sales/sales.css";
import { TableSkeleton } from "../../components/skeletons/TableSkeleton";

const fmtMoney = (n) =>
  n != null ? `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—";

function getPagoInfo(inv) {
  const pagos = inv.pagos || [];
  const totalPagado = pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);
  const saldo = Math.max(0, (inv.importeConIVA || 0) - totalPagado);
  const completo = saldo === 0 && pagos.length > 0;
  const parcial  = pagos.length > 0 && saldo > 0;
  return { totalPagado, saldo, completo, parcial };
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getInvoices();
        setInvoices(res.data);
      } catch (error) {
        console.error("Error cargando facturas:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return (
    <TableSkeleton
      pageClass="sl-page" headerClass="sl-header"
      hasSearch actions={1}
      tableWrapClass="sl-table-wrap" tableClass="sl-table"
      columns={8} rows={7}
    />
  );

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [
      inv.client?.nombreComercial,
      String(inv.quote?.folio || ""),
      String(inv.numeroFactura || ""),
      inv.fechaFactura?.slice(0, 10),
      String(inv.importeConIVA ?? ""),
      inv.pagado ? "si" : "no",
    ].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Facturación</h1>
        <div className="sl-header-actions">
          <div className="sl-search-wrap">
            <Search size={15} className="sl-search-icon" />
            <input
              className="sl-search"
              placeholder="Buscar (cliente, folio, factura, fecha, importe)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isOwner && (
            <button className="sl-btn-primary" onClick={() => navigate("/invoices/new")}>
              <Plus size={14} /> Crear factura
            </button>
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="sl-table-wrap">
        <table className="sl-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Folio Cotización</th>
              <th>Número Factura</th>
              <th>Fecha</th>
              <th>Importe (c/IVA)</th>
              <th>Pagado</th>
              <th>Saldo pendiente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="sl-empty">No hay facturas registradas.</td></tr>
            ) : (
              filtered.map((inv) => {
                const { totalPagado, saldo, completo, parcial } = getPagoInfo(inv);
                return (
                  <tr key={inv._id}>
                    <td>{inv.client?.nombreComercial || "—"}</td>
                    <td>{inv.quote?.folio || "—"}</td>
                    <td>{inv.numeroFactura || "—"}</td>
                    <td>{inv.fechaFactura?.slice(0, 10) || "—"}</td>
                    <td>{fmtMoney(inv.importeConIVA)}</td>
                    <td>
                      <span className={`sl-badge ${completo ? "sl-badge--success" : parcial ? "sl-badge--warning" : "sl-badge--error"}`}>
                        {completo ? "Pagado" : parcial ? "Parcial" : "Pendiente"}
                      </span>
                    </td>
                    <td style={{ color: saldo > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                      {fmtMoney(saldo)}
                    </td>
                    <td>
                      <div className="sl-actions">
                        <Link to={`/invoices/${inv._id}`} className="sl-btn-outline">Ver</Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}