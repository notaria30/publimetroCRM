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

    const [
      totalClientes,
      ventasCerradas,
      facturasPagadas,
      facturasPendientes,
      totalCotizaciones,
    ] = await Promise.all([
      Client.countDocuments(clienteFiltro),
      Opportunity.countDocuments({ ...ventaFiltro, stage: "cerrado_ganado" }),
      Invoice.aggregate([
        { $match: { pagado: true, ...facturaFiltro } },
        { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
      ]),
      Invoice.aggregate([
        { $match: { pagado: false, ...facturaFiltro } },
        { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
      ]),
      Quote.countDocuments(quoteFiltro),
    ]);

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
    const vendedorFiltro = req.user.role === "WORKER" ? { vendedorId: req.user._id } : {};

    const [conteos, cierre] = await Promise.all([
      Promise.all(etapas.map((etapa) =>
        Opportunity.countDocuments({ stage: etapa, ...vendedorFiltro })
      )),
      Opportunity.countDocuments({ stage: "cerrado_ganado", ...vendedorFiltro }),
    ]);

    const pipelineData = {};
    etapas.forEach((etapa, i) => { pipelineData[etapa] = conteos[i]; });
    pipelineData["cierre"] = cierre;

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

    const [pagado, pendiente] = await Promise.all([
      Invoice.aggregate([
        { $match: { pagado: true, ...filtro } },
        { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
      ]),
      Invoice.aggregate([
        { $match: { pagado: false, ...filtro } },
        { $group: { _id: null, total: { $sum: "$importeConIVA" } } },
      ]),
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

    const [activos, nuevosMes] = await Promise.all([
      Client.countDocuments(filtrosActivos),
      Client.countDocuments(filtrosNuevosMes),
    ]);

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
