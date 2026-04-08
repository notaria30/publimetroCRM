import { useEffect, useState, useMemo } from "react";
import { getClients } from "../../services/clientService";
import { getOpportunities } from "../../services/opportunityService";
import { approveQuote, rejectQuote } from "../../services/quoteService";
import { useAuth } from "../../context/AuthContext";
import QuoteGeneralSection from "./QuoteGeneralSection.jsx";
import QuoteTarifasSection from "./QuoteTarifasSection.jsx";
import QuoteActivacionSection from "./QuoteActivacionSection.jsx";
import QuoteDesarrolloInformativoSection from "./QuoteDesarrolloInformativoSection";
import QuotePosteoRedesSection from "./QuotePosteoRedesSection.jsx";
import QuoteIntercambioSection from "./QuoteIntercambioSection.jsx";
import QuoteCortesiasSection from "./QuoteCortesiasSection.jsx";
import QuoteEstadoAprobacionSection from "./QuoteEstadoAprobacionSection.jsx";
import QuoteTotalFinalSection from "./QuoteTotalFinalSection.jsx";
import "./quotes.css";

const EMPTY_TARIFA = {
  periodicidad: "",
  formato: "",
  costo: "",
  fechas: [],
  totalLinea: 0,
};

const defaultForm = {
  client: "",
  opportunityId: "",
  tarifas: [{ ...EMPTY_TARIFA }],
  duracion: "",
  activacionesActivo: false,
  activaciones: [],
  desarrolloInformativo: { activo: false, fecha: "", formato: "" },
  posteoRedesSociales:   { activo: false, cantidad: 0, fechas: [""] },
  intercambio: {
    activo: false,
    porcentajeEfectivo: 0,
    porcentajeEspecie: 0,
    ofrecemos: "",
    nosOfrecen: "",
  },
  cortesias: { activo: false, cantidad: 0, formato: "", fechas: ["", ""] },
  ajustesPrecios: { porcentajeAjuste: 0, valorAjuste: 0, tipoAccion: "Ninguno" },
  formaPago: "",
  metodoPago: "",
  usoCFDI: "",
  facturacionEstado: "por_facturar",
  total: 0,
  status: "pendiente",
};

function formatDateInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function mapInitialQuoteToForm(quote) {
  if (!quote) return defaultForm;

  const activacionesRaw =
    quote.activaciones?.length
      ? quote.activaciones
      : quote.activacion ? [quote.activacion] : [];

  const activaciones = activacionesRaw.map((a) => ({
    cantidad:        a?.cantidad ?? 0,
    costoActivacion: a?.costoActivacion ?? a?.costo ?? 0,
    costoImpresion:  a?.costoImpresion ?? 0,
    cantidadTipo:    a?.cantidadTipo ?? 0,
    total:           a?.total ?? ((a?.cantidad ?? 0) * (a?.costoActivacion ?? 0)),
    tipo:            a?.tipo || "",
    fechas: (a?.fechas || [])
      .map(formatDateInput)
      .concat(Array(Math.max(0, 2 - (a?.fechas || []).length)).fill(""))
      .slice(0, 2),
    puntosDistribucion: a?.puntosDistribucion || "",
  }));

  return {
    client: quote.client?._id || quote.client || "",
    opportunityId: quote.opportunityId?._id || quote.opportunityId || "",
    tarifas: (quote.tarifas || []).map((t) => ({
      periodicidad: t.periodicidad || "",
      formato:      t.formato || "",
      costo:        t.costo ?? 0,
      fechas: (t.fechas || [])
        .map(formatDateInput)
        .concat(Array(Math.max(0, 5 - (t.fechas || []).length)).fill(""))
        .slice(0, 5),
      totalLinea: t.totalLinea ?? 0,
    })),
    duracion: quote.duracion || "",
    activacionesActivo: activaciones.length > 0,
    activaciones,
    desarrolloInformativo: {
      activo:  quote.desarrolloInformativo?.activo ?? false,
      fecha:   formatDateInput(quote.desarrolloInformativo?.fecha),
      formato: quote.desarrolloInformativo?.formato || "",
    },
    posteoRedesSociales: {
      activo:   quote.posteoRedesSociales?.activo ?? false,
      cantidad: quote.posteoRedesSociales?.cantidad ?? 0,
      fechas: (quote.posteoRedesSociales?.fechas || [])
        .map(formatDateInput)
        .concat(Array(Math.max(0, 5 - (quote.posteoRedesSociales?.fechas || []).length)).fill(""))
        .slice(0, 5),
    },
    intercambio: {
      activo:             quote.intercambio?.activo ?? false,
      porcentajeEfectivo: quote.intercambio?.porcentajeEfectivo ?? 0,
      porcentajeEspecie:  quote.intercambio?.porcentajeEspecie ?? 0,
      ofrecemos:          quote.intercambio?.ofrecemos || "",
      nosOfrecen:         quote.intercambio?.nosOfrecen || "",
    },
    cortesias: {
      activo:   quote.cortesias?.activo ?? false,
      cantidad: quote.cortesias?.cantidad ?? 0,
      formato:  quote.cortesias?.formato || "",
      fechas: (quote.cortesias?.fechas || [])
        .map(formatDateInput)
        .concat(Array(Math.max(0, (quote.cortesias?.cantidad ?? 0) - (quote.cortesias?.fechas || []).length)).fill(""))
        .slice(0, quote.cortesias?.cantidad ?? 0),
    },
    ajustesPrecios: {
      porcentajeAjuste: quote.ajustesPrecios?.porcentajeAjuste ?? 0,
      valorAjuste:      quote.ajustesPrecios?.valorAjuste ?? 0,
      tipoAccion:       quote.ajustesPrecios?.tipoAccion || "Ninguno",
    },
    formaPago:         quote.formaPago || "",
    metodoPago:        quote.metodoPago || "",
    usoCFDI:           quote.usoCFDI || "",
    facturacionEstado: quote.facturacionEstado || "por_facturar",
    total:             quote.total ?? 0,
    status:            quote.status || "pendiente",
  };
}

export default function QuoteForm({ mode = "create", initialQuote = null, onSubmit }) {
  const { user } = useAuth();
  const [clients, setClients]     = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [form, setForm]           = useState(() => initialQuote ? mapInitialQuoteToForm(initialQuote) : defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getClients().then((res) => setClients(res.data)).catch(console.error);
    getOpportunities().then((res) => setOpportunities(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialQuote) setForm(mapInitialQuoteToForm(initialQuote));
  }, [initialQuote]);

  // ── Tarifas ──────────────────────────────────────────────────────────────
  const handleTarifaField = (index, field, value) => {
    setForm((prev) => {
      const tarifas = [...prev.tarifas];
      const t = { ...tarifas[index] };
      if (field === "costo") t.costo = value === "" ? "" : Number(value);
      else t[field] = value;
      t.totalLinea = (Number(t.periodicidad) || 0) * (Number(t.costo) || 0);
      tarifas[index] = t;
      return { ...prev, tarifas };
    });
  };

  const handlePeriodicidadChange = (index, value) => {
    const raw = String(value ?? "").trim();
    if (raw === "") {
      setForm((prev) => {
        const tarifas = [...prev.tarifas];
        tarifas[index] = { ...tarifas[index], periodicidad: "", fechas: [], totalLinea: 0 };
        return { ...prev, tarifas };
      });
      return;
    }
    let num = Math.min(31, Math.max(0, Math.floor(Number(raw))));
    if (!Number.isFinite(num)) return;
    setForm((prev) => {
      const tarifas = [...prev.tarifas];
      const t = { ...tarifas[index] };
      const prevFechas = Array.isArray(t.fechas) ? t.fechas : [];
      t.periodicidad = num;
      t.fechas = Array.from({ length: num }, (_, i) => prevFechas[i] || "");
      t.totalLinea = num * (Number(t.costo) || 0);
      tarifas[index] = t;
      return { ...prev, tarifas };
    });
  };

  const handleTarifaFecha = (tarifaIndex, fechaIndex, value) => {
    setForm((prev) => {
      const tarifas = [...prev.tarifas];
      const t = { ...tarifas[tarifaIndex] };
      const fechas = [...t.fechas];
      fechas[fechaIndex] = value;
      t.fechas = fechas;
      t.totalLinea = (Number(t.periodicidad) || 0) * (Number(t.costo) || 0);
      tarifas[tarifaIndex] = t;
      return { ...prev, tarifas };
    });
  };

  const addTarifa = () =>
    setForm((prev) => ({ ...prev, tarifas: [...prev.tarifas, { ...EMPTY_TARIFA }] }));

  const removeTarifa = (index) =>
    setForm((prev) => {
      const tarifas = prev.tarifas.filter((_, i) => i !== index);
      return { ...prev, tarifas: tarifas.length ? tarifas : [{ ...EMPTY_TARIFA }] };
    });

  // ── Totales ───────────────────────────────────────────────────────────────
  const subtotalTarifas = useMemo(
    () => form.tarifas.reduce((acc, t) => acc + (Number(t.totalLinea) || 0), 0),
    [form.tarifas]
  );

  const totalCalculado = useMemo(() => {
    let extras = 0;
    if (form.activacionesActivo) {
      (form.activaciones || []).forEach((a) => {
        if (a.activo) extras += Number(a.total) || 0;
      });
    }
    const aj = form.ajustesPrecios;
    let base = subtotalTarifas;
    if (aj.tipoAccion !== "Ninguno") {
      const val  = Number(aj.valorAjuste) || 0;
      const porc = Number(aj.porcentajeAjuste) || 0;
      if (val > 0) {
        base = aj.tipoAccion === "Aumentar" ? base + val : base - val;
      } else if (porc > 0) {
        const mod = (base * porc) / 100;
        base = aj.tipoAccion === "Aumentar" ? base + mod : base - mod;
      }
    }
    return Math.max(0, base + extras);
  }, [subtotalTarifas, form.activaciones, form.activacionesActivo, form.ajustesPrecios]);

  useEffect(() => {
    setForm((prev) => prev.total === totalCalculado ? prev : { ...prev, total: totalCalculado });
  }, [totalCalculado]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    ...form,
    opportunityId: form.opportunityId || null,
    tarifas: form.tarifas.map((t) => ({
      ...t,
      costo:      Number(t.costo) || 0,
      totalLinea: Number(t.totalLinea) || 0,
      fechas:     (t.fechas || []).filter(Boolean),
    })),
    activaciones: form.activacionesActivo
      ? (form.activaciones || []).map((a) => ({
          ...a,
          cantidad:        Number(a.cantidad) || 0,
          costoActivacion: Number(a.costoActivacion) || 0,
          costoImpresion:  Number(a.costoImpresion) || 0,
          total:           Number(a.total) || 0,
          fechas:          (a.fechas || []).filter(Boolean),
        }))
      : [],
    desarrolloInformativo: {
      ...form.desarrolloInformativo,
      fecha: form.desarrolloInformativo.fecha || null,
    },
    posteoRedesSociales: {
      ...form.posteoRedesSociales,
      cantidad: Number(form.posteoRedesSociales.cantidad) || 0,
      fechas:   (form.posteoRedesSociales.fechas || []).filter(Boolean),
    },
    intercambio: {
      ...form.intercambio,
      porcentajeEfectivo: Number(form.intercambio.porcentajeEfectivo) || 0,
      porcentajeEspecie:  Number(form.intercambio.porcentajeEspecie) || 0,
    },
    cortesias: {
      ...form.cortesias,
      cantidad: Number(form.cortesias.cantidad) || 0,
      fechas:   (form.cortesias.fechas || []).filter(Boolean),
    },
    ajustesPrecios: {
      ...form.ajustesPrecios,
      porcentajeAjuste: Number(form.ajustesPrecios.porcentajeAjuste) || 0,
      valorAjuste:      Number(form.ajustesPrecios.valorAjuste) || 0,
    },
    formaPago:         form.formaPago,
    metodoPago:        form.metodoPago,
    usoCFDI:           form.usoCFDI,
    facturacionEstado: form.facturacionEstado || "por_facturar",
    total:             Number(form.total) || 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;
    try {
      setSubmitting(true);
      await onSubmit(buildPayload());
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      alert("Error al guardar la cotización");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>
      <form onSubmit={handleSubmit}>
        <QuoteGeneralSection form={form} setForm={setForm} clients={clients} opportunities={opportunities} />
        <QuoteTarifasSection
          form={form}
          setForm={setForm}
          subtotalTarifas={subtotalTarifas}
          handleTarifaField={handleTarifaField}
          handleTarifaFecha={handleTarifaFecha}
          handlePeriodicidadChange={handlePeriodicidadChange}
          addTarifa={addTarifa}
          removeTarifa={removeTarifa}
        />
        <QuoteActivacionSection          form={form} setForm={setForm} />
        <QuoteDesarrolloInformativoSection form={form} setForm={setForm} />
        <QuotePosteoRedesSection         form={form} setForm={setForm} />
        <QuoteIntercambioSection         form={form} setForm={setForm} />
        <QuoteCortesiasSection           form={form} setForm={setForm} />
        <QuoteEstadoAprobacionSection
          form={form}
          setForm={setForm}
          mode={mode}
          initialQuote={initialQuote}
          approveQuote={approveQuote}
          rejectQuote={rejectQuote}
          user={user}
        />
        <QuoteTotalFinalSection form={form} />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="submit"
            className="qt-btn-primary"
            disabled={submitting}
            style={{ padding: "12px 32px", fontSize: 15 }}
          >
            {submitting ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar cotización"}
          </button>
        </div>
      </form>
    </div>
  );
}