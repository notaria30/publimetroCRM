const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    folio: {
      type: String,
      unique: true,
      index: true,
    },
    
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Pipeline
    pipelineStage: {
      type: String,
      enum: ["prospeccion", "presentacion", "propuesta", "cierre"],
      default: "prospeccion",
    },

    // 👈 NUEVOS CAMPOS PARA FACTURACIÓN
    metodoPago: {
      type: String,
      enum: ["PUE", "PPD"],
      default: "PUE",
    },
    formaPago: {
      type: String,
      enum: ["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Otro"],
      default: "Transferencia",
    },

    // Notas de seguimiento
    followUpNotes: [
      {
        text: String,
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Tareas
    tasks: [
      {
        title: String,
        dueDate: Date,
        completed: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Historial de pipeline
    history: [
      {
        fromStage: String,
        toStage: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Cierre
    closedAt: Date,
    isClosed: { type: Boolean, default: false },

    paid: { type: Boolean, default: false },
    paidAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);