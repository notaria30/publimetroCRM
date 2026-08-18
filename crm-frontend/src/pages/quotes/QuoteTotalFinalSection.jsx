import "./quotes.css";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export default function QuoteTotalFinalSection({ form }) {
  const total = Number(form.total) || 0;
  const intercambio = form.intercambio;
  const tieneIntercambio = intercambio?.activo &&
    (Number(intercambio.porcentajeEfectivo) > 0 || Number(intercambio.porcentajeEspecie) > 0);

  const pEfectivo = Number(intercambio?.porcentajeEfectivo) || 0;
  const pEspecie  = Number(intercambio?.porcentajeEspecie)  || 0;
  const montoEfectivo = Number(((total * pEfectivo) / 100).toFixed(2));
  const montoEspecie  = Number(((total * pEspecie)  / 100).toFixed(2));

  return (
    <div
      className="qt-card"
      style={{ borderLeft: "5px solid #16a34a", marginBottom: 20 }}
    >
      <div className="qt-card-body">
        {/* Fila del total */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "inherit" }}>Total de la Cotización</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>
            {fmtMoney(total)}
          </span>
        </div>

        {/* Desglose de intercambio */}
        {tieneIntercambio && total > 0 && (
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px dashed #d1fae5",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}>
            <div style={{
              background: "#f0fdf4", borderRadius: 8,
              padding: "10px 14px", border: "1px solid #86efac",
            }}>
              <p style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.05em" }}>
                💵 A Facturar (Efectivo)
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#166534", margin: 0 }}>
                {fmtMoney(montoEfectivo)}
              </p>
              <p style={{ fontSize: 11, color: "#15803d", margin: "3px 0 0" }}>{pEfectivo}% del total</p>
            </div>

            <div style={{
              background: "#eff6ff", borderRadius: 8,
              padding: "10px 14px", border: "1px solid #93c5fd",
            }}>
              <p style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", margin: "0 0 4px", letterSpacing: "0.05em" }}>
                🔄 En Especie (Intercambio)
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
                {fmtMoney(montoEspecie)}
              </p>
              <p style={{ fontSize: 11, color: "#1d4ed8", margin: "3px 0 0" }}>{pEspecie}% del total</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}