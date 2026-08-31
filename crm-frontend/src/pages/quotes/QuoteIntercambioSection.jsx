import "./quotes.css";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export default function QuoteIntercambioSection({ form, setForm }) {
  const isActivo = !!form.intercambio.activo;
  const total = Number(form.total) || 0;

  const update = (patch) =>
    setForm((prev) => ({
      ...prev,
      intercambio: { ...prev.intercambio, ...patch },
    }));

  // Cuando cambia % Efectivo → auto-calcula % Especie y montos
  const handleEfectivoChange = (rawVal) => {
    if (rawVal === "") {
      update({ porcentajeEfectivo: "" });
      return;
    }
    const pEfectivo = Math.min(100, Math.max(0, Number(rawVal) || 0));
    const pEspecie = Number((100 - pEfectivo).toFixed(2));
    update({ porcentajeEfectivo: pEfectivo, porcentajeEspecie: pEspecie });
  };

  // Cuando cambia % Especie → auto-calcula % Efectivo y montos
  const handleEspecieChange = (rawVal) => {
    if (rawVal === "") {
      update({ porcentajeEspecie: "" });
      return;
    }
    const pEspecie = Math.min(100, Math.max(0, Number(rawVal) || 0));
    const pEfectivo = Number((100 - pEspecie).toFixed(2));
    update({ porcentajeEfectivo: pEfectivo, porcentajeEspecie: pEspecie });
  };

  // Al salir del campo, si quedó vacío se normaliza a un número coherente
  const handlePorcentajeBlur = () => {
    setForm((prev) => {
      const it = prev.intercambio;
      const efEmpty = it.porcentajeEfectivo === "" || it.porcentajeEfectivo == null;
      const esEmpty = it.porcentajeEspecie === "" || it.porcentajeEspecie == null;
      if (!efEmpty && !esEmpty) return prev;

      let ef = Number(it.porcentajeEfectivo) || 0;
      let es = Number(it.porcentajeEspecie) || 0;
      if (efEmpty && esEmpty) {
        ef = 0;
        es = 0;
      } else if (efEmpty) {
        ef = Number((100 - es).toFixed(2));
      } else if (esEmpty) {
        es = Number((100 - ef).toFixed(2));
      }
      return { ...prev, intercambio: { ...it, porcentajeEfectivo: ef, porcentajeEspecie: es } };
    });
  };

  const pEfectivo = Number(form.intercambio.porcentajeEfectivo) || 0;
  const pEspecie  = Number(form.intercambio.porcentajeEspecie)  || 0;
  const montoEfectivo = Number(((total * pEfectivo) / 100).toFixed(2));
  const montoEspecie  = Number(((total * pEspecie)  / 100).toFixed(2));
  const suma          = pEfectivo + pEspecie;
  const sumaValida    = Math.abs(suma - 100) < 0.01 || suma === 0;

  return (
    <div className="qt-card">
      <div
        className="qt-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Intercambio</span>
        <label className="cl-toggle-wrap" style={{ margin: 0 }}>
          <span className="cl-toggle">
            <input
              type="checkbox"
              checked={isActivo}
              onChange={(e) => update({ activo: e.target.checked })}
            />
            <span className="cl-toggle-slider" />
          </span>
        </label>
      </div>

      {isActivo && (
        <div className="qt-card-body">

          {/* Banner informativo: el total del cliente no cambia */}
          <div style={{
            background: "var(--qt-accent-light, #dcfce7)",
            border: "1px solid var(--qt-accent, #16a34a)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 18,
            fontSize: 13,
            color: "#166534",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span>
              El intercambio <strong>no modifica el total de la cotización</strong>.
              Solo define qué porción se facturará en efectivo y cuál se cubre en especie.
            </span>
          </div>

          {/* Porcentajes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label className="qt-input-label">% Efectivo (a facturar)</label>
              <input
                className="qt-input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.intercambio.porcentajeEfectivo ?? ""}
                onChange={(e) => handleEfectivoChange(e.target.value)}
                onBlur={handlePorcentajeBlur}
              />
            </div>
            <div>
              <label className="qt-input-label">% Especie (intercambio)</label>
              <input
                className="qt-input"
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.intercambio.porcentajeEspecie ?? ""}
                onChange={(e) => handleEspecieChange(e.target.value)}
                onBlur={handlePorcentajeBlur}
              />
            </div>
          </div>

          {/* Alerta si no suman 100 */}
          {!sumaValida && suma > 0 && (
            <div style={{
              background: "#fef9c3", border: "1px solid #ca8a04",
              borderRadius: 6, padding: "8px 12px", marginBottom: 14,
              fontSize: 12, color: "#854d0e",
            }}>
              ⚠ Los porcentajes suman <strong>{suma}%</strong>. Deben sumar exactamente 100%.
            </div>
          )}

          {/* Montos calculados en tiempo real */}
          {total > 0 && (pEfectivo > 0 || pEspecie > 0) && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 12, marginBottom: 18,
            }}>
              {/* Tarjeta Efectivo */}
              <div style={{
                background: "#f0fdf4", border: "1px solid #86efac",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", margin: "0 0 6px", letterSpacing: "0.05em" }}>
                  💵 Monto a Facturar (Efectivo)
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#166534", margin: 0 }}>
                  {fmtMoney(montoEfectivo)}
                </p>
                <p style={{ fontSize: 12, color: "#15803d", margin: "4px 0 0" }}>
                  {pEfectivo}% de {fmtMoney(total)}
                </p>
              </div>

              {/* Tarjeta Especie */}
              <div style={{
                background: "#eff6ff", border: "1px solid #93c5fd",
                borderRadius: 10, padding: "14px 16px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", margin: "0 0 6px", letterSpacing: "0.05em" }}>
                  🔄 Monto en Especie (Intercambio)
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
                  {fmtMoney(montoEspecie)}
                </p>
                <p style={{ fontSize: 12, color: "#1d4ed8", margin: "4px 0 0" }}>
                  {pEspecie}% de {fmtMoney(total)}
                </p>
              </div>
            </div>
          )}

          {/* Barra visual de distribución */}
          {(pEfectivo > 0 || pEspecie > 0) && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 600, textTransform: "uppercase" }}>
                Distribución del total
              </p>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 16, background: "#e5e7eb" }}>
                {pEfectivo > 0 && (
                  <div
                    title={`Efectivo: ${pEfectivo}%`}
                    style={{ width: `${pEfectivo}%`, background: "#16a34a", transition: "width 0.3s" }}
                  />
                )}
                {pEspecie > 0 && (
                  <div
                    title={`Especie: ${pEspecie}%`}
                    style={{ width: `${pEspecie}%`, background: "#3b82f6", transition: "width 0.3s" }}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#16a34a", borderRadius: 2, marginRight: 4 }} />Efectivo {pEfectivo}%</span>
                <span><span style={{ display: "inline-block", width: 10, height: 10, background: "#3b82f6", borderRadius: 2, marginRight: 4 }} />Especie {pEspecie}%</span>
              </div>
            </div>
          )}

          {/* Textos descriptivos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="qt-input-label">Ofrecemos (Publimetro)</label>
              <textarea
                className="qt-input"
                rows={2}
                value={form.intercambio.ofrecemos}
                onChange={(e) => update({ ofrecemos: e.target.value })}
                style={{ resize: "vertical" }}
                placeholder="Ej. Publicaciones en impreso y digital"
              />
            </div>
            <div>
              <label className="qt-input-label">Nos ofrecen (Cliente)</label>
              <textarea
                className="qt-input"
                rows={2}
                value={form.intercambio.nosOfrecen}
                onChange={(e) => update({ nosOfrecen: e.target.value })}
                style={{ resize: "vertical" }}
                placeholder="Ej. Vales de consumo, productos, servicios"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}