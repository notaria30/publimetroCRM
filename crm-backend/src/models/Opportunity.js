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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Opportunity", opportunitySchema);
