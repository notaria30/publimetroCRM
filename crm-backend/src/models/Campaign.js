// src/models/Campaign.js
const mongoose = require("mongoose");

const campaignSpaceSchema = new mongoose.Schema(
  {
    // Tipo de espacio: tarifa, fajilla, lona, activación, etc.
    tipo: {
      type: String,
      enum: ["tarifa", "fajilla", "lona", "activacion", "otro"],
      default: "tarifa",
    },
    // Nombre de la sección o espacio (Ej. "Portada", "Interior", "Fajillas metro", etc.)
    seccion: { type: String },
    // Formato / medida si aplica
    formato: { type: String },
    // Cantidad de inserciones / piezas
    cantidad: { type: Number, default: 0 },
    // Precio total de ese espacio dentro de la campaña
    precio: { type: Number, default: 0 },
    // Fechas de publicación / activación de ese espacio
    fechas: [Date],
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    },

    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
    },

    nombre: {
      type: String,
      required: true,
    },

    descripcion: {
      type: String,
    },

    fechaInicio: { type: Date },
    fechaFin: { type: Date },

    espacios: [campaignSpaceSchema],

    status: {
      type: String,
      enum: ["planificada", "en_curso", "finalizada", "cancelada"],
      default: "planificada",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    formatos: [{ type: String }],      // Ej: ["Plana", "Robaplana"]
    periodicidad: { type: String },    // Ej: "Mensual"
    cortesias: { type: String },       // Texto libre
  },
  { timestamps: true }
);


module.exports = mongoose.model("Campaign", campaignSchema);
