import { Trash2, Plus } from "lucide-react";
import DateInput from "../../components/DateInput";
import "./quotes.css";

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

export default function QuoteTarifasSection({
  form,
  setForm,
  subtotalTarifas,
  handleTarifaField,
  handleTarifaFecha,
  handlePeriodicidadChange,
  addTarifa,
  removeTarifa,
}) {
  const handlePorcentajeChange = (raw) => {
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        ajustesPrecios: { ...prev.ajustesPrecios, porcentajeAjuste: "", valorAjuste: "" },
      }));
      return;
    }
    // Permitir decimales: e.g. "6.5" para 6.5%
    if (!/^\d*\.?\d*$/.test(raw)) return;
    const pct = Number(raw);
    // Valor exacto sin redondeo para preservar centavos
    const valor = subtotalTarifas > 0 ? parseFloat(((subtotalTarifas * pct) / 100).toFixed(2)) : 0;
    setForm((prev) => ({
      ...prev,
      ajustesPrecios: { ...prev.ajustesPrecios, porcentajeAjuste: raw, valorAjuste: valor },
    }));
  };

  const handleValorChange = (raw) => {
    if (raw === "") {
      setForm((prev) => ({
        ...prev,
        ajustesPrecios: { ...prev.ajustesPrecios, valorAjuste: "", porcentajeAjuste: "" },
      }));
      return;
    }
    // Permitir decimales en el monto: e.g. "1500.50"
    if (!/^\d*\.?\d*$/.test(raw)) return;
    const val = Number(raw);
    // Porcentaje con 2 decimales para evitar que el redondeo a entero
    // produzca un valor derivado distinto al que el usuario escribió
    const pct =
      subtotalTarifas > 0
        ? parseFloat(((val / subtotalTarifas) * 100).toFixed(2))
        : 0;
    setForm((prev) => ({
      ...prev,
      ajustesPrecios: { ...prev.ajustesPrecios, valorAjuste: raw, porcentajeAjuste: pct },
    }));
  };

  return (
    <div className="qt-card">
      {/* Header */}
      <div
        className="qt-card-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>Tarifas</span>
        <button
          type="button"
          className="qt-btn-secondary"
          style={{ padding: "4px 12px", fontSize: 13 }}
          onClick={addTarifa}
        >
          <Plus size={14} /> Agregar tarifa
        </button>
      </div>

      <div className="qt-card-body">
        {/* LISTA DE TARIFAS */}
        {form.tarifas.map((tarifa, index) => (
          <div
            key={index}
            style={{
              border: "none",
              borderRadius: 10,
              padding: 16,
              marginBottom: 14,
              background: "transparent"
            }}
          >
            {/* Sub-header línea */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "inherit" }}>Línea {index + 1}</span>
              {form.tarifas.length > 1 && (
                <button
                  type="button"
                  className="qt-btn-danger"
                  style={{ padding: "3px 10px", fontSize: 12 }}
                  onClick={() => removeTarifa(index)}
                  title="Eliminar línea"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Campos principales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {/* Periodicidad */}
              <div>
                <label className="qt-input-label">Periodicidad</label>
                <input
                  className="qt-input"
                  type="number"
                  placeholder="0"
                  value={tarifa.periodicidad}
                  onChange={(e) => handlePeriodicidadChange(index, e.target.value)}
                />
              </div>

              {/* Formato */}
              <div>
                <label className="qt-input-label">Formato</label>
                <select
                  className="qt-input"
                  value={tarifa.formato}
                  onChange={(e) => handleTarifaField(index, "formato", e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Costo */}
              <div>
                <label className="qt-input-label">Costo</label>
                <input
                  className="qt-input"
                  type="number"
                  placeholder="0"
                  value={tarifa.costo}
                  onChange={(e) => handleTarifaField(index, "costo", e.target.value)}
                />
              </div>

              {/* Total línea (solo lectura) */}
              <div>
                <label className="qt-input-label">Total línea</label>
                <input
                  className="qt-input"
                  type="number"
                  value={tarifa.totalLinea}
                  placeholder="0"
                  readOnly
                  style={{ background: "transparent", cursor: "default" }}
                />
              </div>
            </div>

            {/* Fechas */}
            {tarifa.fechas.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label className="qt-input-label" style={{ marginBottom: 8, display: "block" }}>Fechas</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                  {tarifa.fechas.map((f, iFecha) => (
                    <div key={iFecha}>
                      <label className="qt-input-label">Fecha {iFecha + 1}</label>
                      <DateInput
                        value={f || ""}
                        minDate={new Date().toISOString().split("T")[0]}
                        onChange={(val) => handleTarifaFecha(index, iFecha, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* AJUSTES DE PRECIOS */}
        <hr className="qt-divider" />
        <p className="qt-section-title" style={{ fontSize: 15, marginBottom: 12 }}>Ajustes de precios</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
          {/* % Ajuste */}
          <div>
            <label className="qt-input-label">% Ajuste</label>
            <input
              className="qt-input"
              type="text"
              inputMode="numeric"
              value={form.ajustesPrecios.porcentajeAjuste}
              onChange={(e) => handlePorcentajeChange(e.target.value)}
            />
          </div>

          {/* Valor ajuste */}
          <div>
            <label className="qt-input-label">Valor ajuste</label>
            <input
              className="qt-input"
              type="text"
              inputMode="numeric"
              value={form.ajustesPrecios.valorAjuste}
              onChange={(e) => handleValorChange(e.target.value)}
            />
          </div>

          {/* Tipo acción */}
          <div>
            <label className="qt-input-label">Tipo acción</label>
            <select
              className="qt-input"
              value={form.ajustesPrecios.tipoAccion}
              onChange={(e) => {
                const nextTipo = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  ajustesPrecios: {
                    ...prev.ajustesPrecios,
                    tipoAccion: nextTipo,
                    porcentajeAjuste: nextTipo === "Ninguno" ? 0 : prev.ajustesPrecios.porcentajeAjuste,
                    valorAjuste: nextTipo === "Ninguno" ? 0 : prev.ajustesPrecios.valorAjuste,
                  },
                }));
              }}
            >
              <option value="Ninguno">Ninguno</option>
              <option value="Aumentar">Aumentar</option>
              <option value="Reducir">Reducir</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}