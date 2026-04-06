import "./quotes.css";

export default function QuotePosteoRedesSection({ form, setForm }) {
  const isActivo = !!form.posteoRedesSociales.activo;

  const handleFechaChange = (index, value) => {
    setForm((prev) => {
      const fechas = [...prev.posteoRedesSociales.fechas];
      fechas[index] = value;
      return { ...prev, posteoRedesSociales: { ...prev.posteoRedesSociales, fechas } };
    });
  };

  const handleCantidadChange = (raw) => {
    setForm((prev) => {
      if (raw === "") {
        return { ...prev, posteoRedesSociales: { ...prev.posteoRedesSociales, cantidad: "", fechas: [] } };
      }
      const n = Math.max(0, Math.min(30, Number(raw) || 0));
      const prevFechas = prev.posteoRedesSociales.fechas || [];
      const fechas = Array.from({ length: n }, (_, i) => prevFechas[i] || "");
      return { ...prev, posteoRedesSociales: { ...prev.posteoRedesSociales, cantidad: n, fechas } };
    });
  };

  return (
    <div className="qt-card">
      <div
        className="qt-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Posteo Redes Sociales</span>
        <label className="cl-toggle-wrap" style={{ margin: 0 }}>
          <span className="cl-toggle">
            <input
              type="checkbox"
              checked={isActivo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  posteoRedesSociales: { ...prev.posteoRedesSociales, activo: e.target.checked },
                }))
              }
            />
            <span className="cl-toggle-slider" />
          </span>
        </label>
      </div>

      {isActivo && (
        <div className="qt-card-body">
          {/* Cantidad */}
          <div style={{ maxWidth: 200, marginBottom: 16 }}>
            <label className="qt-input-label">Cantidad</label>
            <input
              className="qt-input"
              type="number"
              min={0}
              max={30}
              value={form.posteoRedesSociales.cantidad}
              onChange={(e) => handleCantidadChange(e.target.value)}
            />
          </div>

          {/* Fechas */}
          {form.posteoRedesSociales.fechas.length > 0 && (
            <div>
              <label className="qt-input-label" style={{ marginBottom: 8, display: "block" }}>Fechas</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {form.posteoRedesSociales.fechas.map((fecha, i) => (
                  <div key={i}>
                    <label className="qt-input-label">Fecha {i + 1}</label>
                    <input
                      className="qt-input"
                      type="date"
                      value={fecha || ""}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => handleFechaChange(i, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}