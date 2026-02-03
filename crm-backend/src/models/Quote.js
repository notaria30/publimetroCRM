const mongoose = require("mongoose");

const tarifaSchema = new mongoose.Schema(
  {
    periodicidad: String,
    formato: String,
    costo: { type: Number, default: 0 },
    fechas: [Date], // Fecha 1 ... Fecha 5
    totalLinea: { type: Number, default: 0 }, // total por esa tarifa
  },
  { _id: false }
);

const activacionSchema = new mongoose.Schema(
  {
    activo: { type: Boolean, default: false },
    cantidad: { type: Number, default: 0 },
    costoActivacion: { type: Number, default: 0 },
    costoImpresion: { type: Number, default: 0 },
    costo: { type: Number, default: 0 },
    tipo: { type: String },
    cantidadTipo: { type: Number, default: 0 },
    fechas: [Date],
    puntosDistribucion: { type: String },
  },
  { _id: false }
);


const quoteSchema = new mongoose.Schema(
  {
    folio: {
      type: Number,
      unique: true,
    },

    // Relación con Cliente
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // Usuario que creó la cotización
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // TARIFAS
    tarifas: [tarifaSchema],

    // Duración (texto libre)
    duracion: { type: String },

    // Presentación / introducción para el cliente (se usa en PDF / envío)
    presentation: { type: String, default: "" },

    // ACTIVACIÓN
    activacion: activacionSchema,
    activacionesActivo: { type: Boolean, default: false },
    activaciones: {
      type: [activacionSchema],
      default: [],
    },

    // DESARROLLO INFORMATIVO
    desarrolloInformativo: {
      activo: { type: Boolean, default: false },
      fecha: { type: Date },
      formato: { type: String },
    },

    // POSTEO REDES SOCIALES
    posteoRedesSociales: {
      activo: { type: Boolean, default: false },
      cantidad: { type: Number, default: 0 },
      fechas: [Date],
    },

    // INTERCAMBIO
    intercambio: {
      activo: { type: Boolean, default: false },
      porcentajeEfectivo: { type: Number, default: 0 },
      porcentajeEspecie: { type: Number, default: 0 },
      ofrecemos: { type: String },
      nosOfrecen: { type: String },
    },

    // CORTESÍAS
    cortesias: {
      activo: { type: Boolean, default: false },
      cantidad: { type: Number, default: 0 },
      formato: { type: String },
      fechas: [Date],
    },

    // -----------------------------
    // PAGOS (ACTUALIZADO)
    // -----------------------------

    // Forma de pago (EFECTIVO, TRANSFERENCIA, TARJETA, ETC.)
    formaPago: { type: String },

    // Método de pago (PPD / PUE)
    metodoPago: {
      type: String,
      enum: ["PPD", "PUE"],
    },

    // Uso CFDI (G01, G03, P01, etc.)
    usoCFDI: { type: String },

    // Facturado / Por facturar
    facturacionEstado: {
      type: String,
      enum: ["facturado", "por_facturar"],
      default: "por_facturar",
    },

    // Estado del cliente dentro de la cotización
    estadoCliente: {
      type: String,
      default: "Lead",
    },

    // Ajustes de precios
    ajustesPrecios: {
      porcentajeAjuste: { type: Number, default: 0 },
      valorAjuste: { type: Number, default: 0 },
      tipoAccion: {
        type: String,
        enum: ["Reducir", "Aumentar", "Ninguno"],
        default: "Ninguno",
      },
    },

    // Total final
    total: {
      type: Number,
      default: 0,
    },

    // Status cotización
    status: {
      type: String,
      enum: ["pendiente", "aprobado", "rechazado"],
      default: "pendiente",
    },

    // Aprobación
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Asignar folio consecutivo
quoteSchema.pre("save", async function (next) {
  if (this.folio) return next();

  try {
    const lastQuote = await mongoose
      .model("Quote")
      .findOne({})
      .sort({ folio: -1 })
      .select("folio");

    this.folio = lastQuote ? lastQuote.folio + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});
quoteSchema.pre("validate", function (next) {
  // 1) Legacy singular: activacion.costo -> activacion.costoActivacion
  if (this.activacion) {
    if ((this.activacion.costoActivacion ?? 0) === 0 && (this.activacion.costo ?? 0) > 0) {
      this.activacion.costoActivacion = this.activacion.costo;
    }
  }

  // 2) Array: activaciones[i].costo -> activaciones[i].costoActivacion
  if (Array.isArray(this.activaciones)) {
    this.activaciones = this.activaciones.map((a) => {
      if (!a) return a;
      const ca = a.costoActivacion ?? 0;
      const legacy = a.costo ?? 0;

      if (ca === 0 && legacy > 0) {
        return { ...a.toObject?.() ?? a, costoActivacion: legacy };
      }
      return a;
    });
  }

  next();
});

module.exports = mongoose.model("Quote", quoteSchema);