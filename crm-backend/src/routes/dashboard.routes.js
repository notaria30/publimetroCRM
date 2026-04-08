const express = require("express");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Invoice = require("../models/Invoice");
const Opportunity = require("../models/Opportunity");
const { auth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Dashboard Overview (tarjetas principales)
router.get("/overview", auth, async (req, res) => {
  try {
    let clienteFiltro = {};
    let ventaFiltro = {};
    let facturaFiltro = {};
    let quoteFiltro = {};

    if (req.user.role === "WORKER") {
      clienteFiltro.assignedTo = req.user._id;
      ventaFiltro.assignedTo = req.user._id;
      facturaFiltro.createdBy = req.user._id;
      quoteFiltro.createdBy = req.user._id;
    }

    const totalClientes = await Client.countDocuments(clienteFiltro);

    const ventasCerradas = await Opportunity.countDocuments({
      ...ventaFiltro,
      stage: "cerrado_ganado",
    });

    const facturasPagadas = await Invoice.aggregate([
      { $match: { pagado: true, ...facturaFiltro } },
      { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
    ]);

    const facturasPendientes = await Invoice.aggregate([
      { $match: { pagado: false, ...facturaFiltro } },
      { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
    ]);

    const totalCotizaciones = await Quote.countDocuments(quoteFiltro);

    res.json({
      totalClientes,
      ventasCerradas,
      totalFacturado: facturasPagadas[0]?.total || 0,
      totalPendiente: facturasPendientes[0]?.total || 0,
      totalCotizaciones,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


// Pipeline de oportunidades (conteo por etapa)
router.get("/pipeline", auth, async (req, res) => {
  try {
    const etapas = ["prospeccion", "calificacion", "propuesta", "negociacion"]; // No contamos los cerrados aquí
    const pipelineData = {};

    for (const etapa of etapas) {
      const filtro = { stage: etapa };

      if (req.user.role === "WORKER") {
        filtro.vendedorId = req.user._id;
      }

      pipelineData[etapa] = await Opportunity.countDocuments(filtro);
    }

    // Además podemos añadir cerrado ganado si el frontend lo requiere para pintar la barra, 
    // pero user solicitó el pipeline del prospecto a ganador
    pipelineData["cierre"] = await Opportunity.countDocuments({
      stage: "cerrado_ganado",
      ...(req.user.role === "WORKER" ? { vendedorId: req.user._id } : {})
    });

    res.json({
        prospeccion: pipelineData["prospeccion"] || 0,
        presentacion: pipelineData["calificacion"] || 0, // mapeo de legado por UI actual
        propuesta: pipelineData["propuesta"] || 0,
        cierre: pipelineData["cierre"] || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


// Facturación (pagado vs pendiente)
router.get("/billing", auth, async (req, res) => {
  try {
    const filtro = {};

    if (req.user.role === "WORKER") {
      filtro.createdBy = req.user._id;
    }

    const pagado = await Invoice.aggregate([
      { $match: { pagado: true, ...filtro } },
      { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
    ]);

    const pendiente = await Invoice.aggregate([
      { $match: { pagado: false, ...filtro } },
      { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
    ]);

    res.json({
      pagado: pagado[0]?.total || 0,
      pendiente: pendiente[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


// Clientes activos y nuevos del mes
router.get("/clients", auth, async (req, res) => {
  try {
    let filtrosActivos = { clienteActivo: true };
    let filtrosNuevosMes = {};

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    filtrosNuevosMes.createdAt = { $gte: inicioMes };

    if (req.user.role === "WORKER") {
      filtrosActivos.assignedTo = req.user._id;
      filtrosNuevosMes.assignedTo = req.user._id;
    }

    const activos = await Client.countDocuments(filtrosActivos);
    const nuevosMes = await Client.countDocuments(filtrosNuevosMes);

    res.json({
      activos,
      nuevosMes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


// Cotizaciones del mes
router.get("/quotes", auth, async (req, res) => {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    let filtros = { createdAt: { $gte: inicioMes } };

    if (req.user.role === "WORKER") {
      filtros.createdBy = req.user._id;
    }

    const cotizacionesMes = await Quote.countDocuments(filtros);

    res.json({ cotizacionesMes });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


module.exports = router;
