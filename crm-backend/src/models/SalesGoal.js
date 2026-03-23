const mongoose = require("mongoose");

const salesGoalSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    goalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    // Meta por ejecutivo (opcional)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Índice compuesto para evitar duplicados (año/mes/ejecutivo)
// Si assignedTo es null, es meta general
salesGoalSchema.index(
  { year: 1, month: 1, assignedTo: 1 }, 
  { unique: true }
);

module.exports = mongoose.model("SalesGoal", salesGoalSchema);