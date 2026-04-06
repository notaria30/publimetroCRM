const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    // CLIENTE
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // RFC (COPIADO del cliente en el momento)
    rfc: {
      type: String,
      required: true,
    },

    // LIGA A UNA COTIZACION
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      required: true,
    },

    // NUMERO DE FACTURA
    numeroFactura: {
      type: String,
      required: true,
      unique: true,
    },

    // FECHA DE FACTURA
    fechaFactura: {
      type: Date,
      required: true,
    },

    // IMPORTES
    importeSinIVA: {
      type: Number,
      required: true,
    },

    importeConIVA: {
      type: Number,
      required: true,
    },

    // MÉTODO DE PAGO (SAT): PUE / PPD
    metodoPago: {
      type: String,
      enum: ["PUE", "PPD"],
      default: "PUE",
      required: true,
    },

    // FORMA DE PAGO (SAT): Efectivo, Transferencia, Tarjeta, etc.
    formaPago: {
      type: String,
      default: "",
    },

    // PAGO
    pagos: [
      {
        fecha: { type: Date, required: true },
        importe: { type: Number, required: true },
        nota: { type: String, default: "" },
      }
    ],

    // campo calculado automático
    pagado: { type: Boolean, default: false },
    saldoPendiente: { type: Number, default: 0 },

    // Usuario que generó la factura
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: false,
    },

  },
  { timestamps: true }
);

// Calcular IVA automático antes de guardar
invoiceSchema.pre("save", function (next) {
  if (this.importeSinIVA) {
    this.importeConIVA = this.importeSinIVA * 1.16;
  }
  next();
});

invoiceSchema.pre("save", function (next) {
  if (this.importeSinIVA) {
    this.importeConIVA = this.importeSinIVA * 1.16;
  }
  // Calcular saldo y estado pagado automáticamente
  const totalPagado = (this.pagos || []).reduce((acc, p) => acc + (p.importe || 0), 0);
  this.saldoPendiente = Math.max(0, (this.importeConIVA || 0) - totalPagado);
  this.pagado = this.saldoPendiente === 0 && (this.pagos || []).length > 0;
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);