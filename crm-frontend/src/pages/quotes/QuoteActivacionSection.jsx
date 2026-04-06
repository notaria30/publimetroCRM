import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import "./quotes.css";

const EMPTY_ACTIVACION = {
  activo: true,
  cantidad: 0,
  costoActivacion: 0,
  costoImpresion: 0,
  tipo: "",
  cantidadTipo: 0,
  total: 0,
  fechas: [],
  puntosDistribucion: "",
};

const TIPOS = [
  "Entrega simultanea",
  "Encarte",
  "Walking banner",
  "Fajillas",
];

const resizeFechas = (prevFechas = [], newLen) => {
  const safeLen = Math.max(0, Number(newLen) || 0);
  const next = prevFechas.slice(0, safeLen);
  while (next.length < safeLen) next.push("");
  return next;
};

const calcularTotalActivacion = (a) => {
  const cantidad = Number(a.cantidad) || 0;
  const costoActivacion = Number(a.costoActivacion) || 0;
  const costoImpresion = Number(a.costoImpresion) || 0;
  return cantidad * costoActivacion + costoImpresion;
};

export default function QuoteActivacionSection({ form, setForm }) {
  const activaciones = form.activaciones || [];
  const isEnabled = !!form.activacionesActivo;

  const toggleActivaciones = (checked) => {
    setForm((prev) => {
      if (checked) {
        return {
          ...prev,
          activacionesActivo: true,
          activaciones:
            prev.activaciones && prev.activaciones.length > 0
              ? prev.activaciones
              : [{ ...EMPTY_ACTIVACION, activo: true }],
        };
      }
      return { ...prev, activacionesActivo: false, activaciones: [] };
    });
  };

  const addActivacion = () => {
    setForm((prev) => ({
      ...prev,
      activacionesActivo: true,
      activaciones: [...(prev.activaciones || []), { ...EMPTY_ACTIVACION, activo: true }],
    }));
  };

  const removeActivacion = (index) => {
    setForm((prev) => {
      const next = (prev.activaciones || []).filter((_, i) => i !== index);
      if (next.length === 0) return { ...prev, activacionesActivo: false, activaciones: [] };
      return { ...prev, activaciones: next };
    });
  };

  const updateActivacion = (index, patch) => {
    setForm((prev) => {
      const next = [...(prev.activaciones || [])];
      const updated = { ...next[index], ...patch };
      updated.total =
        (Number(updated.cantidad) || 0) * (Number(updated.costoActivacion) || 0) +
        (Number(updated.costoImpresion) || 0);
      next[index] = updated;
      return { ...prev, activaciones: next };
    });
  };

  const handleCantidadChange = (idx, raw) => {
    setForm((prev) => {
      const next = [...(prev.activaciones || [])];
      const a = { ...next[idx] };
      if (raw === "") {
        a.cantidad = "";
        a.fechas = [];
        next[idx] = a;
        return { ...prev, activaciones: next };
      }
      const newCantidad = Math.max(0, Number(raw));
      a.cantidad = newCantidad;
      a.total =
        newCantidad * (Number(a.costoActivacion) || 0) +
        (Number(a.costoImpresion) || 0);
      a.fechas = resizeFechas(a.fechas || [], newCantidad);
      next[idx] = a;
      return { ...prev, activaciones: next };
    });
  };

  const handleDateChange = (index, fechaIndex, value) => {
    setForm((prev) => {
      const next = [...(prev.activaciones || [])];
      const a = { ...next[index] };
      const fechas = [...(a.fechas || [])];
      fechas[fechaIndex] = value;
      a.fechas = fechas;
      next[index] = a;
      return { ...prev, activaciones: next };
    });
  };

  return (
    <div className="qt-card">
      <div className="qt-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Activaciones</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isEnabled && (
            <button className="qt-btn-secondary" style={{ padding: "4px 12px", fontSize: 13 }} onClick={addActivacion} type="button">
              <Plus size={14} /> Agregar activación
            </button>
          )}
          <label className="cl-toggle-wrap" style={{ margin: 0 }}>
            <span className="cl-toggle">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => toggleActivaciones(e.target.checked)}
              />
              <span className="cl-toggle-slider" />
            </span>
          </label>
        </div>
      </div>

      {isEnabled && (
        <div className="qt-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activaciones.map((act, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 10,
                padding: 16,
                background: "transparent",
              }}
            >
              {/* Sub-header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "inherit" }}>
                  Activación {idx + 1}
                </span>
                <button
                  className="qt-btn-danger"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => removeActivacion(idx)}
                  type="button"
                  title="Eliminar activación"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Campos principales */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
                {/* Cantidad */}
                <div>
                  <label className="qt-input-label">Cantidad</label>
                  <input
                    className="qt-input"
                    type="number"
                    value={act.cantidad}
                    onChange={(e) => handleCantidadChange(idx, e.target.value)}
                  />
                </div>

                {/* Costo activación */}
                <div>
                  <label className="qt-input-label">Costo activación</label>
                  <input
                    className="qt-input"
                    type="number"
                    value={act.costoActivacion ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        costoActivacion: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="qt-input-label">Tipo</label>
                  <select
                    className="qt-input"
                    value={act.tipo}
                    onChange={(e) => updateActivacion(idx, { tipo: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Cantidad de tipo */}
                <div>
                  <label className="qt-input-label">Cantidad de tipo</label>
                  <input
                    className="qt-input"
                    type="number"
                    value={act.cantidadTipo ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        cantidadTipo: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Costo impresión */}
                <div>
                  <label className="qt-input-label">Costo impresión</label>
                  <input
                    className="qt-input"
                    type="number"
                    value={act.costoImpresion ?? 0}
                    onChange={(e) =>
                      updateActivacion(idx, {
                        costoImpresion: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>

                {/* Total (solo lectura) */}
                <div>
                  <label className="qt-input-label">Total</label>
                  <input
                    className="qt-input"
                    type="number"
                    value={calcularTotalActivacion(act)}
                    placeholder="0"
                    readOnly
                    style={{ background: "transparent", cursor: "default" }}
                  />
                </div>
              </div>

              {/* Fechas */}
              {(act.fechas || []).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <label className="qt-input-label" style={{ marginBottom: 8, display: "block" }}>Fechas</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                    {act.fechas.map((fecha, i) => (
                      <div key={i}>
                        <label className="qt-input-label">Fecha {i + 1}</label>
                        <input
                          className="qt-input"
                          type="date"
                          value={fecha || ""}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => handleDateChange(idx, i, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Puntos de distribución */}
              <div style={{ marginTop: 14 }}>
                <label className="qt-input-label">Puntos de distribución</label>
                <textarea
                  className="qt-input"
                  rows={4}
                  value={act.puntosDistribucion}
                  onChange={(e) => updateActivacion(idx, { puntosDistribucion: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}