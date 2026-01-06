// src/models/Client.js
const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    nombreComercial: { type: String, required: true },
    razonSocial: { type: String, required: true },
    rfc: { type: String, required: true },
    curp: { type: String },
    direccion: {
      calleNumero: String,
      colonia: String,
      ciudad: String,
      estado: String,
      pais: String,
      cp: String,
      telefono: String,
    },

    regimen: {
      type: String,
      enum: [
        "REGIMEN GENERAL DE LEY PERSONAS MORALES",
        "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS MORALES",
        "PERSONAS MORALES CON FINES NO LUCRATIVOS",
        "RÉGIMEN DE PEQUEÑOS CONTRIBUYENTES",
        "RÉGIMEN DE SUELDOS Y SALARIOS E INGRESOS ASIMILADOS A SALARIOS",
        "RÉGIMEN DE ARRENDAMIENTO",
        "RÉGIMEN SIMPLIFICADO DE LEY PERSONAS FÍSICAS",
        "RÉGIMEN DE INCORPORACIÓN FISCAL",
      ],
    },

    agenciaODirecto: {
      type: String,
      enum: ["AGENCIA", "DIRECTO"],
    },

    tipoCliente: {
      type: String,
      enum: ["iniciativa privada", "gobierno", "corporativo"],
    },

    tipoIndustria: {
      type: String,
      lowercase: true,
      trim: true,
      enum: [
        "autos",
        "inmobiliaria",
        "restaurantes",
        "hoteles",
        "tiendas departamentales",
        "tiendas de conveniencia",
        "hospitales",
        "opticas",
        "farmacias",
        "gimansios",
        "clinicas",
        "escuelas",
        "universidades",
        "clubs deportivo",
        "eventos o espectaculos",
        "servicios financieros",
        "aseguradoras",
        "notarias",
        "talleres mecanicos",
        "distribuidora de autos",
        "cursos o diplomados",
        "laboratorios medicos"
      ],
    },

    contactos: {
      mercadotecnia: {
        nombre: String,
        email: String,
        celular: String,
      },
      diseno: {
        nombre: String,
        email: String,
        celular: String,
      },
      facturacion: {
        nombre: String,
        email: String,
        celular: String,
      },
    },

    ejecutivoAsignado: {
      type: String,
      enum: ["Jackeline Said", "Nancy Peñaloza", "Alejandra Aguirre"],
    },

    clienteActivo: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["prospeccion", "presentacion", "propuesta", "cierre"],
      default: "prospeccion",
    },

    // Relación con trabajador asignado
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

  },
  { timestamps: true }
);
module.exports = mongoose.model("Client", clientSchema);