import "./quotes.css";
import DateInput from "../../components/DateInput";

const FORMATOS = [
  "1/4 plana",
  "1/2 plana",
  "Plana",
  "Doble Plana Central",
  "Contraportada",
  "Cintillo en portada",
  "Cintillo interior",
  "Robaplana",
];

export default function QuoteDesarrolloInformativoSection({ form, setForm }) {
  const isActivo = !!form.desarrolloInformativo.activo;

  const update = (patch) =>
    setForm((prev) => ({
      ...prev,
      desarrolloInformativo: { ...prev.desarrolloInformativo, ...patch },
    }));

  return (
    <div className="qt-card">
      <div
        className="qt-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Desarrollo Informativo</span>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {/* Fecha */}
            <div>
              <label className="qt-input-label">Fecha</label>
              <DateInput
                value={form.desarrolloInformativo.fecha || ""}
                minDate={new Date().toISOString().split("T")[0]}
                onChange={(val) => update({ fecha: val })}
              />
            </div>

            {/* Formato */}
            <div>
              <label className="qt-input-label">Formato</label>
              <select
                className="qt-input"
                value={form.desarrolloInformativo.formato || ""}
                onChange={(e) => update({ formato: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {FORMATOS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}