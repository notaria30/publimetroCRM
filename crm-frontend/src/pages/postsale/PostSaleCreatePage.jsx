import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPostSale } from "../../services/postSaleService";
import { getSales } from "../../services/salesService";
import { ArrowLeft } from "lucide-react";
import "./postsale.css";
import "../sales/sales.css";

const STAGES = [
  "servicio_post_venta",
  "medicion_resultados",
  "encuesta_satisfaccion",
  "renovacion",
  "reportes"
];

const STAGE_LABELS = {
  servicio_post_venta:   "Servicio Post-Venta",
  medicion_resultados:   "Medición de resultados",
  encuesta_satisfaccion: "Encuesta de satisfacción",
  renovacion:            "Renovación",
  reportes:              "Reportes"
};

export default function PostSaleCreatePage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState({
    sale:          "",
    postSaleStage: "servicio_post_venta",
    medicionResultados: "",
    encuestaSatisfaccion: { calificacion: "", comentarios: "" },
    renovacion: { requiereRenovacion: false, fechaPosibleRenovacion: "" },
    notas: "",
  });

  useEffect(() => {
    getSales().then((res) => setSales(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "postSaleStage") {
      setForm((prev) => ({
        ...prev,
        postSaleStage: value,
        renovacion: value === "renovacion"
          ? { ...prev.renovacion, requiereRenovacion: true }
          : prev.renovacion,
      }));
      return;
    }
    if (["calificacion", "comentarios"].includes(name)) {
      setForm((prev) => ({
        ...prev,
        encuestaSatisfaccion: { ...prev.encuestaSatisfaccion, [name]: value },
      }));
      return;
    }
    if (name === "requiereRenovacion") {
      setForm((prev) => ({
        ...prev,
        renovacion: { ...prev.renovacion, requiereRenovacion: checked },
      }));
      return;
    }
    if (name === "fechaPosibleRenovacion") {
      setForm((prev) => ({
        ...prev,
        renovacion: { ...prev.renovacion, fechaPosibleRenovacion: value },
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sale) return alert("Selecciona una venta");
    try {
      await createPostSale(form);
      navigate("/postsale");
    } catch (err) {
      alert("Error al crear registro");
      console.error(err);
    }
  };

  return (
    <div className="sl-page">
      {/* HEADER */}
      <div className="sl-header">
        <h1 className="sl-title">Crear Post-Venta</h1>
        <div className="sl-header-actions">
          <button className="sl-btn-secondary" onClick={() => navigate("/postsale")}>
            <ArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* VENTA ASOCIADA */}
        <div className="sl-card">
          <div className="sl-card-header">Venta Asociada</div>
          <div className="sl-card-body">
            <div className="ps-form-grid-2">
              <div className="sl-form-group">
                <label className="sl-label">Venta *</label>
                <select
                  className="sl-select-full"
                  name="sale"
                  value={form.sale}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar venta…</option>
                  {sales.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.folio || s._id} — {s.client?.nombreComercial}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Etapa</label>
                <select
                  className="sl-select-full"
                  name="postSaleStage"
                  value={form.postSaleStage}
                  onChange={handleChange}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* MEDICIÓN DE RESULTADOS */}
        <div className="sl-card">
          <div className="sl-card-header">📊 Medición de Resultados</div>
          <div className="sl-card-body">
            <div className="sl-form-group">
              <label className="sl-label">Descripción</label>
              <textarea
                className="sl-textarea"
                rows={3}
                name="medicionResultados"
                value={form.medicionResultados}
                onChange={handleChange}
                placeholder="Describe KPIs, cumplimiento, desempeño…"
              />
            </div>
          </div>
        </div>

        {/* ENCUESTA DE SATISFACCIÓN */}
        <div className="sl-card">
          <div className="sl-card-header">😊 Encuesta de Satisfacción</div>
          <div className="sl-card-body">
            <div className="ps-form-grid-rating">
              <div className="sl-form-group">
                <label className="sl-label">Calificación (1–10)</label>
                <input
                  className="sl-input"
                  type="number"
                  name="calificacion"
                  min={1} max={10}
                  value={form.encuestaSatisfaccion.calificacion}
                  onChange={handleChange}
                  placeholder="1–10"
                />
              </div>
              <div className="sl-form-group">
                <label className="sl-label">Comentarios</label>
                <textarea
                  className="sl-textarea"
                  rows={3}
                  name="comentarios"
                  value={form.encuestaSatisfaccion.comentarios}
                  onChange={handleChange}
                  placeholder="Comentarios del cliente…"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RENOVACIÓN */}
        <div className="sl-card">
          <div className="sl-card-header">🔄 Renovación</div>
          <div className="sl-card-body">
            <label className="inv-toggle-wrap" style={{ marginBottom: 16 }}>
              <span className="inv-toggle">
                <input
                  type="checkbox"
                  name="requiereRenovacion"
                  checked={form.renovacion.requiereRenovacion}
                  onChange={handleChange}
                />
                <span className="inv-toggle-slider" />
              </span>
              <span className="inv-toggle-label">
                {form.renovacion.requiereRenovacion ? "Requiere renovación" : "No requiere renovación"}
              </span>
            </label>

            {form.renovacion.requiereRenovacion && (
              <div className="sl-form-group" style={{ maxWidth: 280 }}>
                <label className="sl-label">Fecha posible de renovación</label>
                <input
                  className="sl-input"
                  type="date"
                  name="fechaPosibleRenovacion"
                  value={form.renovacion.fechaPosibleRenovacion}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* NOTAS */}
        <div className="sl-card">
          <div className="sl-card-header">📝 Notas</div>
          <div className="sl-card-body">
            <div className="sl-form-group">
              <textarea
                className="sl-textarea"
                rows={3}
                name="notas"
                value={form.notas}
                onChange={handleChange}
                placeholder="Notas adicionales del ejecutivo…"
              />
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="inv-form-actions">
          <button type="button" className="sl-btn-secondary" onClick={() => navigate("/postsale")}>
            Cancelar
          </button>
          <button type="submit" className="sl-btn-save">
            Guardar Post-Venta
          </button>
        </div>

      </form>
    </div>
  );
}