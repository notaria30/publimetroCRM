const mongoose = require("mongoose");

const postSaleSchema = new mongoose.Schema(
  {
    // Relación con venta
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },

    // Estado actual post-venta
    postSaleStage: {
      type: String,
      enum: [
        "servicio_post_venta",
        "medicion_resultados",
        "encuesta_satisfaccion",
        "renovacion",
        "reportes",
      ],
      default: "servicio_post_venta",
    },

    // Seguimiento post-venta
    medicionResultados: {
      type: String,
    },

    encuestaSatisfaccion: {
      calificacion: { type: Number, min: 1, max: 10 },
      comentarios: { type: String },
    },

    renovacion: {
      requiereRenovacion: { type: Boolean, default: false },
      fechaPosibleRenovacion: { type: Date },
    },

    notas: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PostSale", postSaleSchema);
