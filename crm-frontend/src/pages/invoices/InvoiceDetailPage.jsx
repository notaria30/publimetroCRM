import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoiceById } from "../../services/invoiceService";
import { ArrowLeft } from "lucide-react";
import "./invoices.css";
import "../sales/sales.css";

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="sl-info-label">{label}</p>
      <p className="sl-info-value">{value ?? "—"}</p>
    </div>
  );
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtMoney = (n) =>
  n != null ? `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getInvoiceById(id);
        setInvoice(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="sl-status">Cargando factura...</div>;
  if (!invoice) return <div className="sl-status">No se encontró la factura.</div>;

  const pagos = invoice.pagos || [];
  const totalPagado = pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);
  const saldoPendiente = Math.max(0, (invoice.importeConIVA || 0) - totalPagado);
  const pagadoCompleto = saldoPendiente === 0 && pagos.length > 0;

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Factura #{invoice.numeroFactura}</h1>
        <div className="sl-header-actions">
          <button className="sl-btn-secondary" onClick={() => navigate("/invoices")}>
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      {/* DATOS DEL CLIENTE */}
      <div className="sl-card">
        <div className="sl-card-header">Datos del Cliente</div>
        <div className="sl-card-body">
          <div className="sl-info-grid">
            <InfoItem label="Cliente"          value={invoice.client?.nombreComercial} />
            <InfoItem label="RFC"              value={invoice.client?.rfc} />
            <InfoItem label="Folio Cotización" value={invoice.quote?.folio ? `Folio ${invoice.quote.folio}` : "—"} />
          </div>
        </div>
      </div>

      {/* IMPORTES */}
      <div className="sl-card">
        <div className="sl-card-header">Importes</div>
        <div className="sl-card-body">
          <div className="sl-info-grid">
            <InfoItem label="Fecha Factura"   value={fmtDate(invoice.fechaFactura)} />
            <InfoItem label="Importe sin IVA" value={fmtMoney(invoice.importeSinIVA)} />
            <InfoItem label="Importe con IVA" value={fmtMoney(invoice.importeConIVA)} />
          </div>
        </div>
      </div>

      {/* PAGO */}
      <div className="sl-card">
        <div className="sl-card-header">Pago</div>
        <div className="sl-card-body">

          {/* Método / Forma / Estado */}
          <div className="sl-info-grid" style={{ marginBottom: 20 }}>
            <InfoItem label="Método de pago" value={invoice.metodoPago || "—"} />
            <InfoItem label="Forma de pago"  value={invoice.formaPago || "—"} />
            <div>
              <p className="sl-info-label">Estado</p>
              <span className={`sl-badge ${pagadoCompleto ? "sl-badge--success" : saldoPendiente < (invoice.importeConIVA || 0) && pagos.length > 0 ? "sl-badge--warning" : "sl-badge--error"}`}>
                {pagadoCompleto ? "Pagado" : pagos.length > 0 ? "Pago parcial" : "Pendiente"}
              </span>
            </div>
          </div>

          {/* Resumen de saldo */}
          <div style={{ display: "flex", gap: 32, padding: "14px 0", borderTop: "1px solid #e5e7eb", borderBottom: pagos.length > 0 ? "1px solid #e5e7eb" : "none", marginBottom: pagos.length > 0 ? 20 : 0 }}>
            <div>
              <p className="sl-info-label">Total factura</p>
              <p className="sl-info-value">{fmtMoney(invoice.importeConIVA)}</p>
            </div>
            <div>
              <p className="sl-info-label">Total pagado</p>
              <p className="sl-info-value" style={{ color: "#16a34a" }}>{fmtMoney(totalPagado)}</p>
            </div>
            <div>
              <p className="sl-info-label">Saldo pendiente</p>
              <p className="sl-info-value" style={{ color: saldoPendiente > 0 ? "#dc2626" : "#16a34a" }}>
                {fmtMoney(saldoPendiente)}
              </p>
            </div>
          </div>

          {/* Historial de pagos */}
          {pagos.length > 0 && (
            <div>
              <p className="sl-info-label" style={{ marginBottom: 10 }}>Historial de pagos</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#166534" }}>
                    <th style={{ padding: "8px 14px", textAlign: "left", color: "white", fontWeight: 600 }}>#</th>
                    <th style={{ padding: "8px 14px", textAlign: "left", color: "white", fontWeight: 600 }}>Fecha</th>
                    <th style={{ padding: "8px 14px", textAlign: "left", color: "white", fontWeight: 600 }}>Importe</th>
                    <th style={{ padding: "8px 14px", textAlign: "left", color: "white", fontWeight: 600 }}>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>{fmtDate(p.fecha)}</td>
                      <td style={{ padding: "10px 14px", color: "#16a34a", fontWeight: 600 }}>{fmtMoney(p.importe)}</td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{p.nota || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagos.length === 0 && (
            <p style={{ color: "#9ca3af", margin: "16px 0 0", fontSize: 13 }}>Sin pagos registrados aún.</p>
          )}
        </div>
      </div>
    </div>
  );
}