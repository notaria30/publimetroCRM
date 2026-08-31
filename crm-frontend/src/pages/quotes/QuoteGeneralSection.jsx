import "./quotes.css";
import SelectConOtro from "../../components/SelectConOtro";

const METODOS_PAGO  = ["PPD", "PUE"];
const FORMAS_PAGO   = ["Transferencia", "Efectivo", "Tarjeta", "Cheque"];
const USOS_CFDI     = [
  { value: "G01", label: "G01 - Adquisición de mercancías" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "P01", label: "P01 - Por definir" },
];

export default function QuoteGeneralSection({ clients, opportunities, form, setForm }) {
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="qt-card">
      <div className="qt-card-header">Datos generales</div>
      <div className="qt-card-body">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>

          {/* Cliente */}
          <div style={{ gridColumn: "span 2" }}>
            <label className="qt-input-label">Cliente *</label>
            <select
              className="qt-input"
              value={form.client}
              onChange={(e) => set("client", e.target.value)}
              required
            >
              <option value="">Seleccione cliente...</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.nombreComercial}</option>
              ))}
            </select>
          </div>

          {/* Oportunidad asociada */}
          <div style={{ gridColumn: "span 2" }}>
            <label className="qt-input-label">Oportunidad asociada</label>
            <select
              className="qt-input"
              value={form.opportunityId}
              onChange={(e) => set("opportunityId", e.target.value)}
            >
              <option value="">Sin oportunidad vinculada</option>
              {opportunities?.filter(o => !form.client || o.client?._id === form.client || o.client === form.client).map((o) => (
                <option key={o._id} value={o._id}>{o.title}</option>
              ))}
            </select>
          </div>

          {/* Duración */}
          <div>
            <label className="qt-input-label">Duración</label>
            <input
              className="qt-input"
              placeholder="Ej: 3 meses"
              value={form.duracion}
              onChange={(e) => set("duracion", e.target.value)}
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="qt-input-label">Método de pago</label>
            <select
              className="qt-input"
              value={form.metodoPago}
              onChange={(e) => set("metodoPago", e.target.value)}
            >
              <option value="">Seleccione...</option>
              {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Forma de pago */}
          <div>
            <label className="qt-input-label">Forma de pago</label>
            <SelectConOtro
              value={form.formaPago}
              onChange={(v) => set("formaPago", v)}
              options={FORMAS_PAGO}
            />
          </div>

          {/* Uso de CFDI */}
          <div style={{ gridColumn: "span 2" }}>
            <label className="qt-input-label">Uso de CFDI</label>
            <SelectConOtro
              value={form.usoCFDI}
              onChange={(v) => set("usoCFDI", v)}
              options={USOS_CFDI}
              otherLabel="Otro código SAT…"
              otherPlaceholder="Ej. I08, D01, S01…"
            />
          </div>

          {/* Estado de facturación */}
          <div>
            <label className="qt-input-label">Estado de facturación</label>
            <select
              className="qt-input"
              value={form.facturacionEstado}
              onChange={(e) => set("facturacionEstado", e.target.value)}
            >
              <option value="por_facturar">Por facturar</option>
              <option value="facturado">Facturado</option>
            </select>
          </div>

        </div>
      </div>
    </div>
  );
}