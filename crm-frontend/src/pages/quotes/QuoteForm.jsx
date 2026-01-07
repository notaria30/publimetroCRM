import { useEffect, useState, useMemo } from "react";
import { getClients } from "../../services/clientService";
import { approveQuote, rejectQuote } from "../../services/quoteService";
import { useAuth } from "../../context/AuthContext";

// IMPORTS DE SECCIONES (TODOS EN LA MISMA CARPETA /pages/quotes)
import QuoteGeneralSection from "./QuoteGeneralSection.jsx";
import QuoteTarifasSection from "./QuoteTarifasSection.jsx";
import QuoteActivacionSection from "./QuoteActivacionSection.jsx";
import QuoteDesarrolloInformativoSection from "./QuoteDesarrolloInformativoSection";
import QuotePosteoRedesSection from "./QuotePosteoRedesSection.jsx";
import QuoteFajillasSection from "./QuoteFajillasSection.jsx";
import QuoteIntercambioSection from "./QuoteIntercambioSection.jsx";
import QuoteCortesiasSection from "./QuoteCortesiasSection.jsx";
import QuoteEstadoAprobacionSection from "./QuoteEstadoAprobacionSection.jsx";
import QuoteTotalFinalSection from "./QuoteTotalFinalSection.jsx";


const EMPTY_TARIFA = {
  periodicidad: "",
  formato: "",
  costo: "",
  fechas: [],
  totalLinea: 0,
};

const defaultForm = {
  client: "",
  tarifas: [{ ...EMPTY_TARIFA }],
  duracion: "",
  activacion: {
    activo: false,
    cantidad: 0,
    costo: 0,
    tipo: "",
    fechas: [""],
    puntosDistribucion: "",
  },
  desarrolloInformativo: {
    activo: false,
    fecha: "",
    formato: "",
  },
  posteoRedesSociales: {
    activo: false,
    cantidad: 0,
    fechas: [""],
  },
  fajillas: {
    activo: false,
    cantidad: 0,
    precio: 0,
    puntosDistribucion: "",
  },
  intercambio: {
    activo: false,
    porcentajeEfectivo: 0,
    porcentajeEspecie: 0,
    ofrecemos: "",
    nosOfrecen: "",
  },
  cortesias: {
    activo: false,
    cantidad: 0,
    fechas: ["", ""],
  },
  ajustesPrecios: {
    porcentajeAjuste: 0,
    valorAjuste: 0,
    tipoAccion: "Ninguno",
  },
  formaPago: "",
  metodoPago: "",
  usoCFDI: "",
  facturacionEstado: "por_facturar",
  total: 0,
  status: "pendiente",
};

// formateo de fecha
function formatDateInput(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}


function mapInitialQuoteToForm(quote) {
  if (!quote) return defaultForm;

  return {
    client: quote.client?._id || quote.client || "",
    tarifas: (quote.tarifas || []).map((t) => ({
      periodicidad: t.periodicidad || "",
      formato: t.formato || "",
      costo: t.costo ?? 0,
      fechas: (t.fechas || [])
        .map(formatDateInput)
        .concat(Array(Math.max(0, 5 - (t.fechas || []).length)).fill(""))
        .slice(0, 5),
      formaPago: quote.formaPago || "",
      metodoPago: quote.metodoPago || "",
      usoCFDI: quote.usoCFDI || "",
      facturacionEstado: quote.facturacionEstado || "por_facturar",

      totalLinea: t.totalLinea ?? 0,
    })),

    duracion: quote.duracion || "",

    activacion: {
      activo: quote.activacion?.activo ?? false,
      cantidad: quote.activacion?.cantidad ?? 0,
      costo: quote.activacion?.costo ?? 0,
      tipo: quote.activacion?.tipo || "",
      fechas: (quote.activacion?.fechas || [])
        .map(formatDateInput)
        .concat(
          Array(Math.max(0, 2 - (quote.activacion?.fechas || []).length)).fill("")
        )
        .slice(0, 2),
      puntosDistribucion: quote.activacion?.puntosDistribucion || "",
    },

    desarrolloInformativo: {
      activo: quote.desarrolloInformativo?.activo ?? false,
      fecha: formatDateInput(quote.desarrolloInformativo?.fecha),
      formato: quote.desarrolloInformativo?.formato || "",
    },

    posteoRedesSociales: {
      activo: quote.posteoRedesSociales?.activo ?? false,
      cantidad: quote.posteoRedesSociales?.cantidad ?? 0,
      fechas: (quote.posteoRedesSociales?.fechas || [])
        .map(formatDateInput)
        .concat(
          Array(
            Math.max(0, 5 - (quote.posteoRedesSociales?.fechas || []).length)
          ).fill("")
        )
        .slice(0, 5),
    },

    fajillas: {
      activo: quote.fajillas?.activo ?? false,
      cantidad: quote.fajillas?.cantidad ?? 0,
      precio: quote.fajillas?.precio ?? 0,
      puntosDistribucion: quote.fajillas?.puntosDistribucion || "",
    },

    intercambio: {
      activo: quote.intercambio?.activo ?? false,
      porcentajeEfectivo: quote.intercambio?.porcentajeEfectivo ?? 0,
      porcentajeEspecie: quote.intercambio?.porcentajeEspecie ?? 0,
      ofrecemos: quote.intercambio?.ofrecemos || "",
      nosOfrecen: quote.intercambio?.nosOfrecen || "",
    },

    cortesias: {
      activo: quote.cortesias?.activo ?? false,
      cantidad: quote.cortesias?.cantidad ?? 0,
      fechas: (quote.cortesias?.fechas || [])
        .map(formatDateInput)
        .concat(
          Array(Math.max(0, 2 - (quote.cortesias?.fechas || []).length)).fill("")
        )
        .slice(0, 2),
    },

    ajustesPrecios: {
      porcentajeAjuste: quote.ajustesPrecios?.porcentajeAjuste ?? 0,
      valorAjuste: quote.ajustesPrecios?.valorAjuste ?? 0,
      tipoAccion: quote.ajustesPrecios?.tipoAccion || "Ninguno",
    },

    total: quote.total ?? 0,
    status: quote.status || "pendiente",
  };
}

export default function QuoteForm({
  mode = "create",     // create | edit
  initialQuote = null, // para editar
  onSubmit,            // async (payload)
}) {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(() =>
    initialQuote ? mapInitialQuoteToForm(initialQuote) : defaultForm
  );
  const [submitting, setSubmitting] = useState(false);

  // ----------------------
  // CLIENTES
  // ----------------------
  useEffect(() => {
    async function loadClients() {
      try {
        const res = await getClients();
        setClients(res.data);
      } catch (err) {
        console.error("Error cargando clientes:", err);
      }
    }
    loadClients();
  }, []);

  useEffect(() => {
    if (initialQuote) setForm(mapInitialQuoteToForm(initialQuote));
  }, [initialQuote]);

  // ----------------------
  // TARIFAS
  // ----------------------
  const handleTarifaField = (index, field, value) => {
    setForm((prev) => {
      const tarifas = [...prev.tarifas];
      const t = { ...tarifas[index] };

      if (field === "costo") t.costo = value === "" ? "" : Number(value);
      else t[field] = value;

      const periodicidad = Number(t.periodicidad) || 0;
      const costo = Number(t.costo) || 0;
      t.totalLinea = periodicidad * costo;

      tarifas[index] = t;
      return { ...prev, tarifas };
    });
  };

  const MAX_FECHAS_TARIFA = 31;
  const handlePeriodicidadChange = (index, value) => {
    const raw = String(value ?? "").trim();

    // si está vacío, deja que el usuario borre sin crashear
    if (raw === "") {
      setForm((prev) => {
        const tarifas = [...prev.tarifas];
        const t = { ...tarifas[index] };

        t.periodicidad = "";
        t.fechas = [];
        t.totalLinea = 0;

        tarifas[index] = t;
        return { ...prev, tarifas };
      });
      return;
    }

    let num = Number(raw);

    // evitar NaN / Infinity (Chrome puede generar esto mientras escriben)
    if (!Number.isFinite(num)) return;

    // entero + límites
    num = Math.floor(num);
    if (num < 0) num = 0;
    if (num > MAX_FECHAS_TARIFA) num = MAX_FECHAS_TARIFA;

    setForm((prev) => {
      const tarifas = [...prev.tarifas];
      const t = { ...tarifas[index] };

      // conservar fechas ya capturadas si baja/sube periodicidad
      const prevFechas = Array.isArray(t.fechas) ? t.fechas : [];
      const nuevasFechas = Array.from({ length: num }, (_, i) => prevFechas[i] || "");

      t.periodicidad = num;
      t.fechas = nuevasFechas;

      const costo = Number(t.costo) || 0;
      t.totalLinea = num * costo;

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

      const periodicidad = Number(t.periodicidad) || 0;
      const costo = Number(t.costo) || 0;
      t.totalLinea = periodicidad * costo;

      tarifas[tarifaIndex] = t;
      return { ...prev, tarifas };
    });
  };

  const addTarifa = () => {
    setForm((prev) => ({
      ...prev,
      tarifas: [...prev.tarifas, { ...EMPTY_TARIFA }],
    }));
  };

  const removeTarifa = (index) => {
    setForm((prev) => {
      const tarifas = prev.tarifas.filter((_, i) => i !== index);
      return {
        ...prev,
        tarifas: tarifas.length ? tarifas : [{ ...EMPTY_TARIFA }],
      };
    });
  };

  // ----------------------
  // TOTAL
  // ----------------------
  const totalCalculado = useMemo(() => {
    let total = 0;

    form.tarifas.forEach((t) => {
      total += Number(t.totalLinea) || 0;
    });

    if (form.activacion.activo) {
      total +=
        (Number(form.activacion.costo) || 0) *
        (Number(form.activacion.cantidad) || 1);
    }

    if (form.fajillas.activo) {
      total +=
        (Number(form.fajillas.precio) || 0) *
        (Number(form.fajillas.cantidad) || 1);
    }

    const aj = form.ajustesPrecios;
    if (aj.tipoAccion !== "Ninguno") {
      if (aj.porcentajeAjuste > 0) {
        const mod = (total * aj.porcentajeAjuste) / 100;
        total = aj.tipoAccion === "Aumentar" ? total + mod : total - mod;
      }
      if (aj.valorAjuste > 0) {
        total =
          aj.tipoAccion === "Aumentar"
            ? total + aj.valorAjuste
            : total - aj.valorAjuste;
      }
    }

    if (total < 0) total = 0;

    return total;
  }, [form]);

  useEffect(() => {
    setForm((prev) =>
      prev.total === totalCalculado ? prev : { ...prev, total: totalCalculado }
    );
  }, [totalCalculado]);

  const buildPayload = () => ({
    ...form,

    tarifas: form.tarifas.map((t) => ({
      ...t,
      costo: Number(t.costo) || 0,
      totalLinea: Number(t.totalLinea) || 0,
      // ✅ mandar strings "YYYY-MM-DD"
      fechas: (t.fechas || []).filter(Boolean),
    })),

    activacion: {
      ...form.activacion,
      cantidad: Number(form.activacion.cantidad) || 0,
      costo: Number(form.activacion.costo) || 0,
      // ✅ mandar strings "YYYY-MM-DD"
      fechas: (form.activacion.fechas || []).filter(Boolean),
    },

    desarrolloInformativo: {
      ...form.desarrolloInformativo,
      // ✅ mandar string "YYYY-MM-DD" o null
      fecha: form.desarrolloInformativo.fecha
        ? form.desarrolloInformativo.fecha
        : null,
    },

    posteoRedesSociales: {
      ...form.posteoRedesSociales,
      cantidad: Number(form.posteoRedesSociales.cantidad) || 0,
      // ✅ mandar strings "YYYY-MM-DD"
      fechas: (form.posteoRedesSociales.fechas || []).filter(Boolean),
    },

    fajillas: {
      ...form.fajillas,
      cantidad: Number(form.fajillas.cantidad) || 0,
      precio: Number(form.fajillas.precio) || 0,
    },

    intercambio: {
      ...form.intercambio,
      porcentajeEfectivo: Number(form.intercambio.porcentajeEfectivo) || 0,
      porcentajeEspecie: Number(form.intercambio.porcentajeEspecie) || 0,
    },

    cortesias: {
      ...form.cortesias,
      cantidad: Number(form.cortesias.cantidad) || 0,
      // ✅ mandar strings "YYYY-MM-DD"
      fechas: (form.cortesias.fechas || []).filter(Boolean),
    },

    ajustesPrecios: {
      ...form.ajustesPrecios,
      porcentajeAjuste: Number(form.ajustesPrecios.porcentajeAjuste) || 0,
      valorAjuste: Number(form.ajustesPrecios.valorAjuste) || 0,
    },
    formaPago: form.formaPago,
    metodoPago: form.metodoPago,
    usoCFDI: form.usoCFDI,
    facturacionEstado: form.facturacionEstado,
    total: Number(form.total) || 0,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;

    try {
      setSubmitting(true);
      const payload = buildPayload();
      await onSubmit(payload);
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      alert("Error al guardar la cotización");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24 }}>

      <form onSubmit={handleSubmit}>
        {/* General */}
        <QuoteGeneralSection
          form={form}
          setForm={setForm}
          clients={clients}
        />

        {/* Tarifas */}
        <QuoteTarifasSection
          form={form}
          setForm={setForm}
          handleTarifaField={handleTarifaField}
          handleTarifaFecha={handleTarifaFecha}
          handlePeriodicidadChange={handlePeriodicidadChange}
          addTarifa={addTarifa}
          removeTarifa={removeTarifa}
        />

        {/* Activación */}
        <QuoteActivacionSection form={form} setForm={setForm} />

        {/* Desarrollo Informativo */}
        <QuoteDesarrolloInformativoSection form={form} setForm={setForm} />

        {/* Posteo redes */}
        <QuotePosteoRedesSection form={form} setForm={setForm} />

        {/* Fajillas */}
        <QuoteFajillasSection form={form} setForm={setForm} />

        {/* Intercambio */}
        <QuoteIntercambioSection form={form} setForm={setForm} />

        {/* Cortesías */}
        <QuoteCortesiasSection form={form} setForm={setForm} />

        {/* Estado / Aprobación */}
        <QuoteEstadoAprobacionSection
          form={form}
          setForm={setForm}
          mode={mode}
          initialQuote={initialQuote}
          approveQuote={approveQuote}
          rejectQuote={rejectQuote}
          user={user}
        />

        {/* Total final */}
        <QuoteTotalFinalSection form={form} />

        {/* BOTÓN GUARDAR */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: "#009d5b",
            padding: "14px 20px",
            borderRadius: 8,
            fontSize: 16,
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            border: "none",
          }}
        >
          {submitting
            ? "Guardando..."
            : mode === "edit"
              ? "Guardar cambios"
              : "Guardar cotización"}
        </button>
      </form>
    </div>
  );
}