import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getQuoteById, deleteQuote } from "../../services/quoteService";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { ArrowLeft, Printer, Pencil, Trash2, ShoppingCart } from "lucide-react";
import "./quotes.css";

const STATUS = {
  aprobado: { label: "Aprobada", cls: "qt-badge--success" },
  pendiente: { label: "Pendiente", cls: "qt-badge--warning" },
  rechazado: { label: "Rechazada", cls: "qt-badge--error" },
};

const fmt = (n) =>
  "$" + (Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" }) : "—";

function InfoItem({ label, value }) {
  return (
    <div className="qt-info-item">
      <p className="qt-info-label">{label}</p>
      <p className="qt-info-value">{value ?? "—"}</p>
    </div>
  );
}

function SectionCard({ title, children, empty, emptyMsg }) {
  return (
    <div className="qt-card">
      <div className="qt-card-header">{title}</div>
      {empty
        ? <div className="qt-card-body"><p style={{ color: "#9ca3af", margin: 0 }}>{emptyMsg}</p></div>
        : <div style={{ overflowX: "auto" }}>{children}</div>
      }
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return <div className={`qt-toast qt-toast--${type}`}>{msg}</div>;
}

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canConvert } = useAuth();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorDialog, setErrorDialog] = useState("");
  const [pdfDialog, setPdfDialog] = useState(false);
  const [dirigidoA, setDirigidoA] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [convertDialog, setConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    getQuoteById(id)
      .then((res) => {
        setQuote(res.data);
        setDirigidoA(res.data?.client?.nombreComercial || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteQuote(quote._id);
      navigate("/quotes");
    } catch (err) {
      setConfirmDelete(false);
      const msg = err.response?.data?.message || "Error al eliminar la cotización.";
      if (msg.toLowerCase().includes("dueño")) {
        setErrorDialog("Solo el administrador puede borrar una cotización.");
      } else {
        setErrorDialog(msg);
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote?._id) return;
    try {
      setPdfLoading(true);
      const params = dirigidoA?.trim() ? { dirigidoA: dirigidoA.trim() } : {};
      const res = await api.get(`/pdf/quote/${quote._id}`, { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
      setPdfDialog(false);
    } catch (err) {
      alert(err.response?.data || "No se pudo generar el PDF");
    } finally { setPdfLoading(false); }
  };

  if (loading) return <div className="qt-status">Cargando cotización...</div>;
  if (!quote) return <div className="qt-status">No se encontró la cotización.</div>;

  const s = STATUS[quote.status] || { label: quote.status, cls: "" };
  const activaciones = Array.isArray(quote.activaciones) ? quote.activaciones.filter(Boolean) : [];
  const ajustes = quote.ajustesPrecios || {};
  const tieneAjustes = ajustes.tipoAccion && ajustes.tipoAccion !== "Ninguno" &&
    ((ajustes.porcentajeAjuste || 0) !== 0 || (ajustes.valorAjuste || 0) !== 0);

  const handleConvertToSale = async () => {
    try {
      setConverting(true);
      const res = await api.post(`/sales/from-quote/${quote._id}`);
      setToast({ msg: "Venta creada correctamente", type: "success" });
      setConvertDialog(false);
      // Opcional: navegar a la venta creada
      setTimeout(() => navigate(`/sales/${res.data.sale._id}`), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || "Error al convertir a venta";
      setToast({ msg, type: "error" });
      setConvertDialog(false);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="qt-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <div className="qt-detail-header">
        <h1 className="qt-title">Cotización #{quote.folio}</h1>
        <div className="qt-detail-actions">
          <Link to="/quotes" className="qt-btn-secondary"><ArrowLeft size={14} /> Volver</Link>
          <button className="qt-btn-secondary" type="button" onClick={() => setPdfDialog(true)}>
            <Printer size={14} /> Imprimir PDF
          </button>
          <Link to={`/quotes/${quote._id}/edit`} className="qt-btn-primary">
            <Pencil size={14} /> Editar
          </Link>
          <button className="qt-btn-danger" type="button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Eliminar
          </button>
          {!quote.opportunityId && canConvert && (() => {
            const isApproved = quote.status === "aprobada";
            return (
              <button
                className="qt-btn-primary"
                type="button"
                onClick={() => isApproved ? setConvertDialog(true) : null}
                disabled={!isApproved}
                title={isApproved ? "" : "La cotización debe estar aprobada para convertirla a venta"}
                style={{
                  background: isApproved ? "#16a34a" : "#9ca3af",
                  borderColor: isApproved ? "#16a34a" : "#9ca3af",
                  cursor: isApproved ? "pointer" : "not-allowed",
                  opacity: isApproved ? 1 : 0.7,
                }}
              >
                <ShoppingCart size={14} /> Convertir a Venta
              </button>
            );
          })()}
        </div>
      </div>

      {/* RESUMEN */}
      <div className="qt-card">
        <div className="qt-card-header">Resumen</div>
        <div className="qt-card-body">
          <div style={{ marginBottom: 16 }}>
            <p className="qt-info-label">Cliente</p>
            <p className="qt-info-value" style={{ fontSize: 17 }}>{quote.client?.nombreComercial || "—"}</p>
            {quote.client?.razonSocial && (
              <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>
                Razón social: {quote.client.razonSocial}
              </p>
            )}
            {quote.client?.rfc && (
              <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 13 }}>
                RFC: {quote.client.rfc}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div>
              <p className="qt-info-label">Total</p>
              <p className="qt-info-value" style={{ fontSize: 20, color: "#16a34a" }}>{fmt(quote.total)}</p>
            </div>
            <div>
              <p className="qt-info-label">Status</p>
              <span className={`qt-badge ${s.cls}`} style={{ fontSize: 13 }}>{s.label}</span>
            </div>
          </div>

          <hr className="qt-divider" />

          <div className="qt-info-grid">
            <InfoItem label="Creada" value={fmtDate(quote.createdAt)} />
            <InfoItem label="Actualizada" value={fmtDate(quote.updatedAt)} />
            <InfoItem label="Folio" value={quote.folio} />
            <InfoItem label="Forma de pago" value={quote.formaPago || "—"} />
            <InfoItem label="Uso CFDI" value={quote.usoCFDI || "—"} />
            <InfoItem label="Facturación" value={quote.facturacionEstado === "facturado" ? "Facturado" : "Por facturar"} />
            <InfoItem label="Creada por" value={quote.createdBy?.name || "—"} />
            <InfoItem label="Aprobada por" value={quote.approvedBy?.name || "—"} />
            {quote.approvedAt && <InfoItem label="Fecha aprobación" value={fmtDate(quote.approvedAt)} />}
          </div>
        </div>
      </div>

      {/* DURACIÓN */}
      <SectionCard title="Duración" empty={!quote.duracion} emptyMsg="No se capturó duración.">
        <div className="qt-card-body">
          <p style={{ margin: 0, color: "inherit" }}>
            {quote.duracion} {Number(quote.duracion) === 1 ? "mes" : "meses"}
          </p>
        </div>
      </SectionCard>

      {/* TARIFAS */}
      <SectionCard title="Tarifas" empty={!quote.tarifas?.length} emptyMsg="No hay tarifas registradas.">
        <table className="qt-inner-table">
          <thead>
            <tr><th>Formato</th><th>Periodicidad</th><th>Costo</th><th>Fechas</th><th>Total línea</th></tr>
          </thead>
          <tbody>
            {quote.tarifas?.map((t, i) => (
              <tr key={i}>
                <td>{t.formato || "—"}</td>
                <td>{t.periodicidad || "—"}</td>
                <td>{fmt(t.costo)}</td>
                <td>{t.fechas?.length ? t.fechas.map(fmtDate).join(", ") : "—"}</td>
                <td>{fmt(t.totalLinea || t.totaLinea)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* ACTIVACIONES */}
      <SectionCard title="Activación" empty={activaciones.length === 0} emptyMsg="No hay activación para esta cotización.">
        <table className="qt-inner-table">
          <thead>
            <tr><th>Tipo</th><th>Cantidad</th><th>Costo activación</th><th>Costo impresión</th><th>Fechas</th><th>Puntos distribución</th></tr>
          </thead>
          <tbody>
            {activaciones.map((a, i) => (
              <tr key={i}>
                <td>{a.tipo || "—"}</td>
                <td>{a.cantidad ?? 0}</td>
                <td>{fmt(a.costoActivacion)}</td>
                <td>{fmt(a.costoImpresion)}</td>
                <td>{a.fechas?.length ? a.fechas.map(fmtDate).join(", ") : "—"}</td>
                <td>{a.puntosDistribucion || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* DESARROLLO INFORMATIVO */}
      <SectionCard title="Desarrollo Informativo" empty={!quote.desarrolloInformativo?.activo} emptyMsg="No hay desarrollo informativo.">
        <table className="qt-inner-table">
          <thead><tr><th>Fecha</th><th>Formato</th></tr></thead>
          <tbody>
            <tr>
              <td>{fmtDate(quote.desarrolloInformativo?.fecha)}</td>
              <td>{quote.desarrolloInformativo?.formato || "—"}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* POSTEO REDES */}
      <SectionCard title="Posteo Redes Sociales" empty={!quote.posteoRedesSociales?.activo} emptyMsg="No hay posteos en redes sociales.">
        <table className="qt-inner-table">
          <thead><tr><th>Cantidad</th><th>Fechas</th></tr></thead>
          <tbody>
            <tr>
              <td>{quote.posteoRedesSociales?.cantidad ?? 0}</td>
              <td>{quote.posteoRedesSociales?.fechas?.length ? quote.posteoRedesSociales.fechas.map(fmtDate).join(", ") : "—"}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* INTERCAMBIO */}
      <SectionCard title="Intercambio" empty={!quote.intercambio?.activo} emptyMsg="No hay intercambio para esta cotización.">
        <table className="qt-inner-table">
          <thead><tr><th>% Efectivo</th><th>% Especie</th><th>Ofrecemos</th><th>Nos ofrecen</th></tr></thead>
          <tbody>
            <tr>
              <td>{quote.intercambio?.porcentajeEfectivo ?? 0}%</td>
              <td>{quote.intercambio?.porcentajeEspecie ?? 0}%</td>
              <td>{quote.intercambio?.ofrecemos || "—"}</td>
              <td>{quote.intercambio?.nosOfrecen || "—"}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* CORTESÍAS */}
      <SectionCard title="Cortesías" empty={!quote.cortesias?.activo} emptyMsg="No hay cortesías para esta cotización.">
        <table className="qt-inner-table">
          <thead><tr><th>Cantidad</th><th>Formato</th><th>Fechas</th></tr></thead>
          <tbody>
            <tr>
              <td>{quote.cortesias?.cantidad ?? 0}</td>
              <td>{quote.cortesias?.formato || "—"}</td>
              <td>{quote.cortesias?.fechas?.length ? quote.cortesias.fechas.map(fmtDate).join(", ") : "—"}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* AJUSTES */}
      <SectionCard title="Ajustes de Precios" empty={!tieneAjustes} emptyMsg="Sin ajustes registrados.">
        <table className="qt-inner-table">
          <thead><tr><th>Tipo de acción</th><th>% Ajuste</th><th>Valor ajuste</th></tr></thead>
          <tbody>
            <tr>
              <td>{ajustes.tipoAccion || "Ninguno"}</td>
              <td>{ajustes.porcentajeAjuste || 0}%</td>
              <td>{fmt(ajustes.valorAjuste)}</td>
            </tr>
          </tbody>
        </table>
      </SectionCard>

      {/* DIALOG ELIMINAR */}
      {confirmDelete && (
        <div className="qt-dialog-overlay">
          <div className="qt-dialog">
            <p className="qt-dialog-title">Eliminar cotización</p>
            <p className="qt-dialog-body">¿Seguro que deseas eliminar esta cotización? Esta acción no se puede deshacer.</p>
            <div className="qt-dialog-actions">
              <button className="qt-btn-secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="qt-btn-danger" type="button" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG ERROR ELIMINAR */}
      {errorDialog && (
        <div className="qt-dialog-overlay">
          <div className="qt-dialog" style={{ maxWidth: 400 }}>
            <p className="qt-dialog-title" style={{ color: "#ef4444" }}>Acción Denegada</p>
            <p className="qt-dialog-body" style={{ marginTop: "10px", marginBottom: "20px" }}>{errorDialog}</p>
            <div className="qt-dialog-actions" style={{ justifyContent: "flex-end" }}>
              <button
                className="qt-btn-secondary"
                type="button"
                onClick={() => setErrorDialog("")}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG PDF */}
      {pdfDialog && (
        <div className="qt-dialog-overlay">
          <div className="qt-dialog">
            <p className="qt-dialog-title">Generar PDF</p>
            <p className="qt-dialog-body">Puedes editar a quién va dirigida la cotización.</p>
            <label className="qt-input-label">Dirigido a</label>
            <input
              className="qt-input"
              value={dirigidoA}
              onChange={(e) => setDirigidoA(e.target.value)}
              placeholder="Ej. Carlos Pérez (Director General)"
              style={{ marginBottom: 20 }}
            />
            <div className="qt-dialog-actions">
              <button className="qt-btn-secondary" type="button" onClick={() => setPdfDialog(false)} disabled={pdfLoading}>
                Cancelar
              </button>
              <button className="qt-btn-primary" type="button" onClick={handleDownloadPdf} disabled={pdfLoading}>
                {pdfLoading ? "Generando..." : "Abrir PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
      {convertDialog && (
        <div className="qt-dialog-overlay">
          <div className="qt-dialog">
            <p className="qt-dialog-title">Convertir a Venta</p>
            <p className="qt-dialog-body">
              ¿Deseas crear una venta a partir de la cotización <strong>#{quote.folio}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="qt-dialog-actions">
              <button
                className="qt-btn-secondary"
                type="button"
                onClick={() => setConvertDialog(false)}
                disabled={converting}
              >
                Cancelar
              </button>
              <button
                className="qt-btn-primary"
                type="button"
                onClick={handleConvertToSale}
                disabled={converting}
                style={{ background: "#16a34a", borderColor: "#16a34a" }}
              >
                {converting ? "Creando venta..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}