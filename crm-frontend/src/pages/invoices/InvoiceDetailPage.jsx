import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInvoiceById, updateInvoice } from "../../services/invoiceService";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, Plus } from "lucide-react";
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
  d ? new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

const fmtMoney = (n) =>
  n != null ? `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—";

const today = new Date().toISOString().slice(0, 10);

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const [invoice, setInvoice]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showAbono, setShowAbono] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [abono, setAbono]         = useState({ fecha: today, importe: "", nota: "" });
  const [toast, setToast]         = useState(null);

  const load = async () => {
    try {
      const res = await getInvoiceById(id);
      setInvoice(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAbonar = async () => {
    if (!abono.importe || Number(abono.importe) <= 0) {
      setToast({ msg: "El importe debe ser mayor a 0", type: "error" });
      return;
    }
    try {
      setSaving(true);
      const nuevosPagos = [
        ...(invoice.pagos || []),
        { fecha: abono.fecha, importe: Number(abono.importe), nota: abono.nota },
      ];
      await updateInvoice(id, { pagos: nuevosPagos });
      setToast({ msg: "Abono registrado correctamente", type: "success" });
      setShowAbono(false);
      setAbono({ fecha: today, importe: "", nota: "" });
      await load();
    } catch {
      setToast({ msg: "Error al registrar el abono", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="sl-status">Cargando factura...</div>;
  if (!invoice) return <div className="sl-status">No se encontró la factura.</div>;

  const pagos          = invoice.pagos || [];
  const totalPagado    = pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);
  const saldoPendiente = Math.max(0, (invoice.importeConIVA || 0) - totalPagado);
  const pagadoCompleto = saldoPendiente === 0 && pagos.length > 0;
  const parcial        = pagos.length > 0 && saldoPendiente > 0;

  return (
    <div className="sl-page">
      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
          zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          background: toast.type === "success" ? "#16a34a" : "#dc2626", color: "white",
        }}>
          {toast.msg}
        </div>
      )}

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
            {invoice.tieneIntercambio && (
              <InfoItem label="Descuento por Intercambio" value={`-${fmtMoney(invoice.importeIntercambio)}`} />
            )}
          </div>
        </div>
      </div>

      {/* PAGO */}
      <div className="sl-card">
        <div className="sl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Pago</span>
          {isOwner && !pagadoCompleto && (
            <button
              type="button"
              className="sl-btn-secondary"
              style={{ padding: "4px 12px", fontSize: 13 }}
              onClick={() => setShowAbono((v) => !v)}
            >
              <Plus size={13} /> {showAbono ? "Cancelar" : "Agregar abono"}
            </button>
          )}
        </div>
        <div className="sl-card-body">

          {/* Método / Forma / Estado */}
          <div className="sl-info-grid" style={{ marginBottom: 20 }}>
            <InfoItem label="Método de pago" value={invoice.metodoPago || "—"} />
            <InfoItem label="Forma de pago"  value={invoice.formaPago  || "—"} />
            <div>
              <p className="sl-info-label">Estado</p>
              <span className={`sl-badge ${pagadoCompleto ? "sl-badge--success" : parcial ? "sl-badge--warning" : "sl-badge--error"}`}>
                {pagadoCompleto ? "Pagado" : parcial ? "Pago parcial" : "Pendiente"}
              </span>
            </div>
          </div>

          {/* Resumen saldo */}
          <div style={{
            display: "flex", gap: 32,
            padding: "14px 0",
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: 20,
          }}>
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

          {/* FORMULARIO ABONO */}
          {showAbono && (
            <div className="inv-abono-form">
              <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 12px", color: "inherit" }}>Nuevo abono</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="sl-label">Fecha</label>
                  <input
                    className="sl-input"
                    type="date"
                    value={abono.fecha}
                    onChange={(e) => setAbono((p) => ({ ...p, fecha: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="sl-label">Importe</label>
                  <input
                    className="sl-input"
                    type="number"
                    placeholder={`Máx. ${fmtMoney(saldoPendiente)}`}
                    value={abono.importe}
                    onChange={(e) => setAbono((p) => ({ ...p, importe: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="sl-label">Nota (opcional)</label>
                  <input
                    className="sl-input"
                    placeholder="Ej. Segundo abono"
                    value={abono.nota}
                    onChange={(e) => setAbono((p) => ({ ...p, nota: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="sl-btn-save"
                  onClick={handleAbonar}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar abono"}
                </button>
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          {pagos.length > 0 ? (
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
          ) : (
            <p style={{ color: "#9ca3af", margin: 0, fontSize: 13 }}>Sin pagos registrados aún.</p>
          )}

        </div>
      </div>
    </div>
  );
}