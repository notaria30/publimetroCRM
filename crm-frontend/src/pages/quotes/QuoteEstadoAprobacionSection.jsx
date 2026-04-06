import "./quotes.css";

export default function QuoteEstadoAprobacionSection({
  form,
  mode,
  initialQuote,
  approveQuote,
  rejectQuote,
  user,
}) {
  const userIsDirector = user?.role === "OWNER" || user?.role === "DIRECTOR";

  const STATUS_LABEL = {
    aprobado:  "Aprobada",
    pendiente: "Pendiente",
    rechazado: "Rechazada",
  };

  const STATUS_CLS = {
    aprobado:  "qt-badge--success",
    pendiente: "qt-badge--warning",
    rechazado: "qt-badge--error",
  };

  return (
    <div className="qt-card">
      <div className="qt-card-header">Estado y aprobación</div>
      <div className="qt-card-body">

        {/* Estado actual (solo lectura) */}
        <div style={{ marginBottom: 8 }}>
          <label className="qt-input-label">Estado de aprobación</label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <span className={`qt-badge ${STATUS_CLS[form.status] || ""}`} style={{ fontSize: 13 }}>
              {STATUS_LABEL[form.status] || form.status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0" }}>
            * Solo las cotizaciones aprobadas pueden convertirse en venta.
          </p>
        </div>

        {/* Botones aprobar / rechazar */}
        {mode === "edit" && userIsDirector && initialQuote && (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              className="qt-btn-approve"
              type="button"
              onClick={async () => {
                await approveQuote(initialQuote._id);
                alert("Cotización aprobada");
                window.location.reload();
              }}
            >
              ✔ Aprobar
            </button>
            <button
              className="qt-btn-reject"
              type="button"
              onClick={async () => {
                await rejectQuote(initialQuote._id);
                alert("Cotización rechazada");
                window.location.reload();
              }}
            >
              ✖ Rechazar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}