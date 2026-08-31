import { useState } from "react";
import { Plus, Trash2, ChevronDown, X } from "lucide-react";
import DateInput from "../../components/DateInput";
import SelectConOtro from "../../components/SelectConOtro";
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

// Puntos de distribución predefinidos de Publimetro
const PUNTOS_DISTRIBUCION = [
  // CDMX – Metro
  "Metro Balderas",
  "Metro Bellas Artes",
  "Metro Buenavista",
  "Metro Candelaria",
  "Metro Centro Médico",
  "Metro Chapultepec",
  "Metro Ciudad Azteca",
  "Metro Copilco",
  "Metro Cuatro Caminos",
  "Metro Doctores",
  "Metro El Rosario",
  "Metro Ermita",
  "Metro Garibaldi",
  "Metro Guerrero",
  "Metro Hidalgo",
  "Metro Indios Verdes",
  "Metro Instituto del Petróleo",
  "Metro Jamaica",
  "Metro La Raza",
  "Metro Legaria",
  "Metro Lindavista",
  "Metro Martin Carrera",
  "Metro Mixcoac",
  "Metro Nativitas",
  "Metro Observatorio",
  "Metro Pantitlán",
  "Metro Pino Suárez",
  "Metro Politécnico",
  "Metro Revolución",
  "Metro Salto del Agua",
  "Metro San Antonio Abad",
  "Metro San Lázaro",
  "Metro Tacuba",
  "Metro Tacubaya",
  "Metro Tasqueña",
  "Metro Terminal Aérea",
  "Metro Tlatelolco",
  "Metro Universidad",
  "Metro Viaducto",
  "Metro Xola",
  "Metro Zócalo",
  // CDMX – Metrobús
  "Metrobús Buenavista",
  "Metrobús Chapultepec",
  "Metrobús El Rosario",
  "Metrobús Indios Verdes",
  "Metrobús La Raza",
  "Metrobús Peñón Viejo",
  "Metrobús Politécnico",
  "Metrobús Revolución",
  "Metrobús Tlatelolco",
  // Otras ciudades
  "Monterrey – Macroplaza",
  "Monterrey – Metrorrey Sendero",
  "Monterrey – Metrorrey Talleres",
  "Guadalajara – Centro Histórico",
  "Guadalajara – Tren Ligero Periférico",
  "Guadalajara – Plaza Universidad",
  "Querétaro – Centro Histórico",
  "León – Bus RT Blvd. Torres Landa",
  "Puebla – Zócalo",
  "Mérida – Paseo Montejo",
  "Morelia – Centro Histórico",
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

// ── Componente de selección múltiple para puntos de distribución ────────────
function PuntosDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customPunto, setCustomPunto] = useState("");

  // value es un string con puntos separados por coma
  const selected = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const toggle = (punto) => {
    const next = selected.includes(punto)
      ? selected.filter((p) => p !== punto)
      : [...selected, punto];
    onChange(next.join(", "));
  };

  const remove = (punto, e) => {
    e.stopPropagation();
    onChange(selected.filter((p) => p !== punto).join(", "));
  };

  // Puntos personalizados que no están en el catálogo
  const customSeleccionados = selected.filter((p) => !PUNTOS_DISTRIBUCION.includes(p));

  const addCustom = () => {
    const v = customPunto.trim();
    setCustomPunto("");
    if (!v || selected.includes(v)) return;
    onChange([...selected, v].join(", "));
  };

  return (
    <div>
      {/* Chips de seleccionados */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {selected.map((p) => (
            <span
              key={p}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "var(--qt-accent, #16a34a)", color: "#fff",
                borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 500,
              }}
            >
              {p}
              <button
                type="button"
                onClick={(e) => remove(p, e)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 0, lineHeight: 1 }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Botón para abrir el dropdown */}
      <button
        type="button"
        className="qt-input"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", cursor: "pointer", textAlign: "left",
          color: selected.length === 0 ? "#9ca3af" : "inherit",
        }}
      >
        <span>{selected.length === 0 ? "Seleccione puntos..." : `${selected.length} punto(s) seleccionado(s)`}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {/* Lista desplegable (en flujo normal para no ser recortada por el overflow de la tarjeta) */}
      {open && (
        <div
          style={{
            marginTop: 4,
            background: "var(--qt-card-bg, #fff)", border: "1px solid var(--qt-border, #e5e7eb)",
            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 260, overflowY: "auto",
          }}
        >
          {/* Agregar punto personalizado ("Otro") */}
          <div
            style={{
              display: "flex", gap: 6, padding: "8px 10px",
              borderBottom: "1px solid var(--qt-border-light, #f3f4f6)",
              position: "sticky", top: 0, background: "var(--qt-card-bg, #fff)", zIndex: 1,
            }}
          >
            <input
              type="text"
              className="qt-input"
              value={customPunto}
              onChange={(e) => setCustomPunto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Otro punto (especificar)…"
              style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
            />
            <button
              type="button"
              onClick={addCustom}
              className="qt-btn-secondary"
              style={{ padding: "3px 12px", fontSize: 12, whiteSpace: "nowrap" }}
            >
              Agregar
            </button>
          </div>

          {/* Puntos personalizados ya agregados */}
          {customSeleccionados.map((punto) => (
            <label
              key={punto}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer", fontSize: 13,
                background: "var(--qt-accent-light, #dcfce7)",
                borderBottom: "1px solid var(--qt-border-light, #f3f4f6)",
              }}
            >
              <input
                type="checkbox"
                checked
                onChange={() => toggle(punto)}
                style={{ accentColor: "#16a34a" }}
              />
              {punto} <span style={{ color: "#9ca3af", fontSize: 11 }}>(personalizado)</span>
            </label>
          ))}

          {PUNTOS_DISTRIBUCION.map((punto) => (
            <label
              key={punto}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer", fontSize: 13,
                background: selected.includes(punto) ? "var(--qt-accent-light, #dcfce7)" : "transparent",
                borderBottom: "1px solid var(--qt-border-light, #f3f4f6)",
              }}
              onMouseEnter={(e) => { if (!selected.includes(punto)) e.currentTarget.style.background = "var(--qt-hover, #f9fafb)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = selected.includes(punto) ? "var(--qt-accent-light, #dcfce7)" : "transparent"; }}
            >
              <input
                type="checkbox"
                checked={selected.includes(punto)}
                onChange={() => toggle(punto)}
                style={{ accentColor: "#16a34a" }}
              />
              {punto}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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
                border: "none",
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
                  <SelectConOtro
                    value={act.tipo}
                    onChange={(v) => updateActivacion(idx, { tipo: v })}
                    options={TIPOS}
                  />
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
                        <DateInput
                          value={fecha || ""}
                          minDate={new Date().toISOString().split("T")[0]}
                          onChange={(val) => handleDateChange(idx, i, val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Puntos de distribución – dropdown multi-selección */}
              <div style={{ marginTop: 14 }}>
                <label className="qt-input-label" style={{ marginBottom: 6, display: "block" }}>
                  Puntos de distribución
                </label>
                <PuntosDropdown
                  value={act.puntosDistribucion}
                  onChange={(val) => updateActivacion(idx, { puntosDistribucion: val })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}