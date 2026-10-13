const mongoose = require("mongoose");

// ─── Catálogos del pipeline ───────────────────────────────────────────────
const MOTIVOS_PERDIDA = [
  "Precio",
  "Sin presupuesto",
  "Eligió a la competencia",
  "Sin respuesta del cliente",
  "Fechas / disponibilidad",
  "Otro",
];

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    vendedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: [
        "prospeccion",
        "propuesta",
        "negociacion",
        "cerrado_ganado",
        "cerrado_perdido",
      ],
      default: "prospeccion",
      index: true,
    },
    // Valor del pipeline: el total de la última cotización ligada.
    estimatedValue: {
      type: Number,
      default: 0,
    },

    // Cierre como perdida: por qué no se concretó (se muestra en el tablero y el detalle).
    motivoPerdida: { type: String, enum: [...MOTIVOS_PERDIDA, null], default: null },
    comentarioPerdida: { type: String, trim: true, default: "" },

    // Fecha en que la oportunidad se ganó o se perdió.
    closedAt: { type: Date, default: null },
    quotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quote",
      },
    ],
    convertedToSale: {
      type: Boolean,
      default: false,
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);
module.exports.MOTIVOS_PERDIDA = MOTIVOS_PERDIDA;

