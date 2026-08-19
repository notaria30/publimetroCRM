const mongoose = require("mongoose");

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
        "calificacion",
        "propuesta",
        "negociacion",
        "cerrado_ganado",
        "cerrado_perdido",
      ],
      default: "prospeccion",
      index: true,
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    probability: {
      type: Number,
      default: 0,
    },
    expectedCloseDate: {
      type: Date,
    },
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
