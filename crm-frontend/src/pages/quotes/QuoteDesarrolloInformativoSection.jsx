import "./quotes.css";
import DateInput from "../../components/DateInput";
import SelectConOtro from "../../components/SelectConOtro";

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

const TIPOS = ["Comercial", "Informativo", "Editorial"];
const SECCIONES = ["Noticias", "Espectáculo", "Deportes"];

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
        <span>Desarrollos</span>
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
              <SelectConOtro
                value={form.desarrolloInformativo.formato || ""}
                onChange={(v) => update({ formato: v })}
                options={FORMATOS}
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="qt-input-label">Tipo</label>
              <select
                className="qt-input"
                value={form.desarrolloInformativo.tipo || ""}
                onChange={(e) => update({ tipo: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Página */}
            <div>
              <label className="qt-input-label">Página</label>
              <input
                className="qt-input"
                type="number"
                placeholder="0"
                value={form.desarrolloInformativo.pagina ?? ""}
                onChange={(e) => update({ pagina: e.target.value === "" ? "" : Number(e.target.value) })}
              />
            </div>

            {/* Sección */}
            <div>
              <label className="qt-input-label">Sección</label>
              <select
                className="qt-input"
                value={form.desarrolloInformativo.seccion || ""}
                onChange={(e) => update({ seccion: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {SECCIONES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}