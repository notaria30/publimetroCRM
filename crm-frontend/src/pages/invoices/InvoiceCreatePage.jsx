import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createInvoice } from "../../services/invoiceService";
import { getClients } from "../../services/clientService";
import { getQuotes } from "../../services/quoteService";
import { getSaleById } from "../../services/salesService";
import { ArrowLeft } from "lucide-react";
import "./invoices.css";
import "../sales/sales.css";

export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get("saleId");

  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const [saleError, setSaleError] = useState(null);
  const [paymentManuallyEdited, setPaymentManuallyEdited] = useState(false);
  const [invoiceNumberError, setInvoiceNumberError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    client: "",
    quote: "",
    numeroFactura: "",
    fechaFactura: new Date().toISOString(),
    metodoPago: "PUE",
    formaPago: "",
    importeSinIVA: "",
    importeConIVA: "",
    pagos: [],
  });

  /* CARGAR CLIENTES */
  useEffect(() => {
    getClients().then((res) => setClients(res.data)).catch(console.error);
  }, []);

  /* CARGAR VENTA SI VIENE saleId */
  useEffect(() => {
    if (!saleId) return;
    setLoadingSale(true);
    setSaleError(null);
    getSaleById(saleId)
      .then((res) => {
        const sale = res.data;
        setForm((prev) => ({
          ...prev,
          client: sale.client?._id || sale.client || "",
          quote: sale.quote?._id || sale.quote || "",
          metodoPago: sale.metodoPago || prev.metodoPago,
          formaPago: sale.formaPago || prev.formaPago,
        }));
      })
      .catch(() => setSaleError("No se pudo cargar la venta. Selecciona los datos manualmente."))
      .finally(() => setLoadingSale(false));
  }, [saleId]);

  /* CARGAR COTIZACIONES SEGÚN CLIENTE */
  useEffect(() => {
    if (!form.client) return;
    setSelectedClient(clients.find((c) => c._id === form.client) || null);
    getQuotes()
      .then((res) => {
        setQuotes(res.data.filter((q) => (q.client?._id || q.client) === form.client));
      })
      .catch(console.error);
  }, [form.client, clients]);

  /* AUTOCOMPLETAR DATOS DE COTIZACIÓN */
  useEffect(() => {
    if (!form.quote) {
      setForm((prev) => ({ ...prev, formaPago: "", metodoPago: "PUE", importeSinIVA: "", importeConIVA: "" }));
      return;
    }
    const q = quotes.find((q) => q._id === form.quote);
    if (!q) return;
    const importe = q.total || 0;
    setForm((prev) => ({
      ...prev,
      importeSinIVA: importe,
      importeConIVA: Number((importe * 1.16).toFixed(2)),
      formaPago: paymentManuallyEdited ? prev.formaPago : (q.formaPago || prev.formaPago),
      metodoPago: paymentManuallyEdited ? prev.metodoPago : (q.metodoPago || prev.metodoPago),
    }));
  }, [form.quote, quotes, paymentManuallyEdited]);

  /* RECALCULAR IVA AL CAMBIAR IMPORTE SIN IVA */
  useEffect(() => {
    if (!form.importeSinIVA) return;
    setForm((prev) => ({ ...prev, importeConIVA: Number((Number(prev.importeSinIVA) * 1.16).toFixed(2)) }));
  }, [form.importeSinIVA]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "formaPago" || name === "metodoPago") setPaymentManuallyEdited(true);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInvoiceNumberError("");
    if (!form.numeroFactura) return alert("El número de factura es obligatorio");
    if (!form.fechaFactura) return alert("La fecha de factura es obligatoria");
    try {
      await createInvoice({ ...form, sale: saleId });
      navigate("/invoices");
    } catch (error) {
      const msg = error.response?.data?.message || "Error al crear factura";
      if (msg.includes("Ya existe")) {
        setInvoiceNumberError(msg);
      } else {
        alert(msg);
      }
    }
  };

  const fromSale = !!saleId && !saleError;

  if (loadingSale) {
    return (
      <div className="inv-loading">
        <div className="inv-spinner" />
        Cargando datos de la venta...
      </div>
    );
  }

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Crear Factura</h1>
        <div className="sl-header-actions">
          <button className="sl-btn-secondary" onClick={() => navigate("/invoices")}>
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {saleError && (
        <div className="inv-alert inv-alert--warning">⚠ {saleError}</div>
      )}
      {fromSale && (
        <div className="inv-alert inv-alert--info">
          ℹ Creando factura a partir de la venta #{saleId.slice(-6)}. Cliente y cotización ya están precargados.
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* CLIENTE */}
        <div className="sl-card">
          <div className="sl-card-header">Cliente</div>
          <div className="sl-card-body">
            <div className="inv-grid-3">
              <div className="sl-form-group">
                <label className="sl-label">Cliente</label>
                <select
                  className="sl-select-full"
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  required
                  disabled={fromSale}
                >
                  <option value="">Seleccionar cliente…</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>{c.nombreComercial}</option>
                  ))}
                </select>
              </div>
              {selectedClient && (
                <div className="sl-form-group">
                  <label className="sl-label">RFC</label>
                  <input className="sl-input" value={selectedClient.rfc || "—"} disabled />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COTIZACIÓN */}
        <div className="sl-card">
          <div className="sl-card-header">Cotización Ligada</div>
          <div className="sl-card-body">
            <div className="inv-grid-3">
              <div className="sl-form-group">
                <label className="sl-label">Cotización</label>
                <select
                  className="sl-select-full"
                  name="quote"
                  value={form.quote}
                  onChange={handleChange}
                  disabled={fromSale}
                >
                  <option value="">Sin cotización</option>
                  {quotes.length === 0 && <option disabled>No hay cotizaciones para este cliente</option>}
                  {quotes.map((q) => (
                    <option key={q._id} value={q._id}>Folio {q.folio} – ${q.total}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DE FACTURA */}
        <div className="sl-card">
          <div className="sl-card-header">Datos de Factura</div>
          <div className="sl-card-body">
            <div className="inv-grid-3">
              <div className="sl-form-group">
                <label className="sl-label">Número de factura *</label>
                <input
                  className="sl-input"
                  name="numeroFactura"
                  value={form.numeroFactura}
                  onChange={(e) => {
                    setInvoiceNumberError("");
                    handleChange(e);
                  }}
                  placeholder="Ej. F-0001"
                  style={invoiceNumberError ? { borderColor: "#ef4444", boxShadow: "0 0 0 1px #ef4444" } : {}}
                  required
                />
                {invoiceNumberError && (
                  <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block", fontWeight: 500 }}>
                    {invoiceNumberError}
                  </span>
                )}
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Fecha factura *</label>
                <input
                  className="sl-input"
                  type="date"
                  name="fechaFactura"
                  value={form.fechaFactura?.slice(0, 10) || today}
                  onChange={(e) => setForm((prev) => ({ ...prev, fechaFactura: new Date(e.target.value).toISOString() }))}
                  required
                />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Método de pago *</label>
                <select className="sl-select-full" name="metodoPago" value={form.metodoPago} onChange={handleChange} required>
                  <option value="PUE">PUE – Pago en una sola exhibición</option>
                  <option value="PPD">PPD – Pago en parcialidades o diferido</option>
                </select>
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Forma de pago *</label>
                <select className="sl-select-full" name="formaPago" value={form.formaPago} onChange={handleChange} required>
                  <option value="">Seleccionar…</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Importe sin IVA</label>
                <input
                  className="sl-input"
                  type="number"
                  name="importeSinIVA"
                  value={form.importeSinIVA}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={fromSale}
                />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Importe con IVA (Valor Final)</label>
                <input
                  className="sl-input"
                  type="number"
                  name="importeConIVA"
                  value={form.importeConIVA}
                  onChange={handleChange}
                  placeholder="Ej. 3480.00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PAGO */}
        {/* PAGO */}
        <div className="sl-card">
          <div className="sl-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Pagos</span>
            <button
              type="button"
              className="sl-btn-secondary"
              style={{ padding: "4px 12px", fontSize: 13 }}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  pagos: [...prev.pagos, { fecha: today, importe: "", nota: "" }],
                }))
              }
            >
              + Agregar pago
            </button>
          </div>
          <div className="sl-card-body">
            {form.pagos.length === 0 && (
              <p style={{ color: "#9ca3af", margin: 0, fontSize: 13 }}>Sin pagos registrados aún.</p>
            )}
            {form.pagos.map((pago, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 12, marginBottom: 12, alignItems: "end" }}>
                <div className="sl-form-group">
                  <label className="sl-label">Fecha</label>
                  <input
                    className="sl-input"
                    type="date"
                    value={pago.fecha}
                    onChange={(e) => {
                      const pagos = [...form.pagos];
                      pagos[i] = { ...pagos[i], fecha: e.target.value };
                      setForm((prev) => ({ ...prev, pagos }));
                    }}
                  />
                </div>
                <div className="sl-form-group">
                  <label className="sl-label">Importe</label>
                  <input
                    className="sl-input"
                    type="number"
                    placeholder="0.00"
                    value={pago.importe}
                    onChange={(e) => {
                      const pagos = [...form.pagos];
                      pagos[i] = { ...pagos[i], importe: e.target.value };
                      setForm((prev) => ({ ...prev, pagos }));
                    }}
                  />
                </div>
                <div className="sl-form-group">
                  <label className="sl-label">Nota (opcional)</label>
                  <input
                    className="sl-input"
                    placeholder="Ej. Primer abono"
                    value={pago.nota}
                    onChange={(e) => {
                      const pagos = [...form.pagos];
                      pagos[i] = { ...pagos[i], nota: e.target.value };
                      setForm((prev) => ({ ...prev, pagos }));
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, pagos: prev.pagos.filter((_, j) => j !== i) }))}
                  style={{ background: "#dc2626", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", marginBottom: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}

            {/* RESUMEN SALDO */}
            {form.importeConIVA > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb", display: "flex", gap: 32 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Total factura</p>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>${Number(form.importeConIVA).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Pagado</p>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#16a34a" }}>
                    ${form.pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 2px", textTransform: "uppercase", fontWeight: 600 }}>Saldo pendiente</p>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#dc2626" }}>
                    ${Math.max(0, Number(form.importeConIVA) - form.pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0)).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="inv-form-actions">
          <button type="button" className="sl-btn-secondary" onClick={() => navigate("/invoices")}>
            Cancelar
          </button>
          <button type="submit" className="sl-btn-save">
            Guardar Factura
          </button>
        </div>

      </form>
    </div>
  );
}