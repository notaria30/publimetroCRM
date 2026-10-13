import { useState } from "react";
import { MOTIVOS_PERDIDA } from "../../constants/opportunity";
import "./opportunities.css";

// Pide el motivo antes de cerrar una oportunidad como perdida.
export default function LostReasonModal({ opportunityTitle, onConfirm, onCancel }) {
  const [motivoPerdida, setMotivo] = useState("");
  const [comentarioPerdida, setComentario] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onConfirm({ motivoPerdida, comentarioPerdida });
  };

  return (
    <div className="opp-modal-overlay">
      <div className="opp-modal" style={{ maxWidth: 440 }}>
        <h2 className="opp-modal-header">Cerrar como perdida</h2>
        <p style={{ color: "var(--txt-muted)", fontSize: 14, margin: "0 0 16px" }}>
          ¿Por qué no se concretó <strong>{opportunityTitle}</strong>? Este dato alimenta el
          análisis de pérdidas del dashboard.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="sl-label">Motivo *</label>
            <select className="sl-select-full" value={motivoPerdida} onChange={(e) => setMotivo(e.target.value)} required>
              <option value="">Seleccione un motivo</option>
              {MOTIVOS_PERDIDA.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="sl-label">Comentario {motivoPerdida === "Otro" ? "*" : "(opcional)"}</label>
            <textarea
              className="sl-textarea"
              value={comentarioPerdida}
              onChange={(e) => setComentario(e.target.value)}
              required={motivoPerdida === "Otro"}
              placeholder="Ej. contrató con otro medio por menor tarifa"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button type="button" className="sl-btn-secondary" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="sl-btn-save" style={{ background: "#ef4444", border: "none" }}>
              Cerrar como perdida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
