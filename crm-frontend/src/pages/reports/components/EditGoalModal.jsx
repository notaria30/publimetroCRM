import { useState, useEffect } from "react";
import "../../reports.css";
import "../../sales/sales.css";

const fmtMoney = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v || 0);

export default function EditGoalModal({ open, onClose, year, month, monthName, onSave, currentGoal }) {
  const [goalAmount, setGoalAmount] = useState(currentGoal || 0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    setGoalAmount(currentGoal || 0);
    setError(null);
  }, [currentGoal, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (goalAmount < 0) return setError("La meta no puede ser negativa");
    setLoading(true);
    setError(null);
    try {
      await onSave(year, month, goalAmount);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Error al guardar la meta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rp-modal">
        <div className="rp-modal-header">
          <p className="rp-modal-title">Editar meta de ventas</p>
          <p className="rp-modal-subtitle">{monthName} {year}</p>
        </div>

        <div className="rp-modal-body">
          {error && <div className="rp-error">{error}</div>}

          <p className="rp-modal-current">
            Meta actual: <strong>{fmtMoney(currentGoal || 0)}</strong>
          </p>

          <div className="sl-form-group">
            <label className="sl-label">Nueva meta mensual</label>
            <div className="rp-input-wrap">
              <span className="rp-input-prefix">$</span>
              <input
                className="sl-input rp-input-prefixed"
                type="number"
                min={0}
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => { if (goalAmount === "") setGoalAmount(0); }}
              />
            </div>
            <p className="rp-modal-hint">Ingresa el monto en pesos mexicanos (sin IVA)</p>
          </div>

          <p className="rp-modal-hint" style={{ marginTop: 10 }}>
            Esta meta se usará para calcular el % de cumplimiento y la diferencia.
          </p>
        </div>

        <div className="rp-modal-footer">
          <button className="sl-btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="sl-btn-save" onClick={handleSave} disabled={loading}>
            {loading ? "Guardando…" : "Guardar meta"}
          </button>
        </div>
      </div>
    </div>
  );
}