import "./quotes.css";

export default function QuoteIntercambioSection({ form, setForm }) {
  const isActivo = !!form.intercambio.activo;

  const update = (patch) =>
    setForm((prev) => ({
      ...prev,
      intercambio: { ...prev.intercambio, ...patch },
    }));

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 14 }}>
            {/* % Efectivo */}
            <div>
              <label className="qt-input-label">% Efectivo</label>
              <input
                className="qt-input"
                type="number"
                min={0}
                max={100}
                value={form.intercambio.porcentajeEfectivo}
                onChange={(e) =>
                  update({ porcentajeEfectivo: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
            </div>

            {/* % Especie */}
            <div>
              <label className="qt-input-label">% Especie</label>
              <input
                className="qt-input"
                type="number"
                min={0}
                max={100}
                value={form.intercambio.porcentajeEspecie}
                onChange={(e) =>
                  update({ porcentajeEspecie: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Ofrecemos */}
          <div style={{ marginBottom: 14 }}>
            <label className="qt-input-label">Ofrecemos</label>
            <textarea
              className="qt-input"
              rows={2}
              value={form.intercambio.ofrecemos}
              onChange={(e) => update({ ofrecemos: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Nos ofrecen */}
          <div>
            <label className="qt-input-label">Nos ofrecen</label>
            <textarea
              className="qt-input"
              rows={2}
              value={form.intercambio.nosOfrecen}
              onChange={(e) => update({ nosOfrecen: e.target.value })}
              style={{ resize: "vertical" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}