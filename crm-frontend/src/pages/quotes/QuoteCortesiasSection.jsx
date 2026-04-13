import "./quotes.css";
import DateInput from "../../components/DateInput";

const FORMATOS_CORTESIA = [
  "1/4 plana",
  "1/2 plana",
  "Plana",
  "Doble Plana Central",
  "Contraportada",
  "Cintillo en portada",
  "Cintillo interior",
  "Robaplana",
];

export default function QuoteCortesiasSection({ form, setForm }) {
  const handleFechaChange = (index, value) => {
    setForm((prev) => {
      const fechas = [...prev.cortesias.fechas];
      fechas[index] = value;
      return { ...prev, cortesias: { ...prev.cortesias, fechas } };
    });
  };

  const handleCantidadChange = (value) => {
    const raw = String(value ?? "").trim();
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        cortesias: { ...prev.cortesias, cantidad: "", fechas: [] },
      }));
      return;
    }
    let n = Number(raw);
    if (!Number.isFinite(n)) return;
    n = Math.max(0, Math.floor(n));
    setForm((prev) => {
      const prevFechas = Array.isArray(prev.cortesias.fechas) ? prev.cortesias.fechas : [];
      const fechas = Array.from({ length: n }, (_, i) => prevFechas[i] || "");
      return { ...prev, cortesias: { ...prev.cortesias, cantidad: n, fechas } };
    });
  };

  const isActivo = !!form.cortesias.activo;

  return (
    <div className="qt-card">
      <div
        className="qt-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Cortesías</span>
        <label className="cl-toggle-wrap" style={{ margin: 0 }}>
          <span className="cl-toggle">
            <input
              type="checkbox"
              checked={isActivo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  cortesias: {
                    ...prev.cortesias,
                    activo: e.target.checked,
                    ...(e.target.checked ? {} : { fechas: [], cantidad: 0, formato: "" }),
                  },
                }))
              }
            />
            <span className="cl-toggle-slider" />
          </span>
        </label>
      </div>

      {isActivo && (
        <div className="qt-card-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 16,
            }}
          >
            {/* Cantidad */}
            <div>
              <label className="qt-input-label">Cantidad</label>
              <input
                className="qt-input"
                type="number"
                min={1}
                value={form.cortesias.cantidad}
                onChange={(e) => handleCantidadChange(e.target.value)}
              />
            </div>

            {/* Formato */}
            <div>
              <label className="qt-input-label">Formato</label>
              <select
                className="qt-input"
                value={form.cortesias.formato || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cortesias: { ...prev.cortesias, formato: e.target.value },
                  }))
                }
              >
                <option value="">Seleccione...</option>
                {FORMATOS_CORTESIA.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fechas */}
          {form.cortesias.fechas.length > 0 && (
            <div>
              <label className="qt-input-label" style={{ marginBottom: 8, display: "block" }}>
                Fechas
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                {form.cortesias.fechas.map((fecha, i) => (
                  <div key={i}>
                    <label className="qt-input-label">Fecha {i + 1}</label>
                    <DateInput
                      value={fecha || ""}
                      minDate={new Date().toISOString().split("T")[0]}
                      onChange={(val) => handleFechaChange(i, val)}
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