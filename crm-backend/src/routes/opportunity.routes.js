const express = require("express");
const Opportunity = require("../models/Opportunity");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Sale = require("../models/Sale");
const Counter = require("../models/Counter");
const { auth } = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/opportunities
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "WORKER") {
      filter.vendedorId = req.user._id;
    }

    const opportunities = await Opportunity.find(filter)
      .populate("client", "nombreComercial status")
      .populate("vendedorId", "name email")
      .populate("quotes", "folio total status version");
    
    res.json(opportunities);
  } catch (error) {
    console.error("Error obteniendo oportunidades:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// GET /api/opportunities/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id)
      .populate("client", "nombreComercial rfc status")
      .populate("vendedorId", "name email")
      .populate("quotes");

    if (!opp) return res.status(404).json({ message: "Oportunidad no encontrada" });

    if (req.user.role === "WORKER" && String(opp.vendedorId._id || opp.vendedorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "No tienes permiso para ver esta oportunidad" });
    }

    res.json(opp);
  } catch (error) {
    console.error("Error obteniendo oportunidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST /api/opportunities
router.post("/", auth, async (req, res) => {
  try {
    const { title, clientId, assignedToId, estimatedValue, expectedCloseDate } = req.body;
    
    const assignedId = req.user.role === "OWNER" && assignedToId ? assignedToId : req.user._id;

    const newOpp = await Opportunity.create({
      title,
      client: clientId,
      vendedorId: assignedId,
      estimatedValue: estimatedValue || 0,
      expectedCloseDate: expectedCloseDate || null,
      stage: "prospeccion"
    });

    res.status(201).json(newOpp);
  } catch (error) {
    console.error("Error creando oportunidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// PATCH /api/opportunities/:id/stage
router.patch("/:id/stage", auth, async (req, res) => {
  try {
    const { stage } = req.body;
    const opp = await Opportunity.findById(req.params.id);
    
    if (!opp) return res.status(404).json({ message: "Oportunidad no encontrada" });

    if (req.user.role === "WORKER" && String(opp.vendedorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "No tienes permiso para modificar esta oportunidad" });
    }

    opp.stage = stage;
    await opp.save();

    if (stage === "cerrado_ganado") {
      const client = await Client.findById(opp.client);
      if (client) {
        client.status = "activo";
        await client.save();
      }
    }

    res.json(opp);
  } catch (error) {
    console.error("Error actualizando etapa:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// DELETE /api/opportunities/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id);
    if (!opp) return res.status(404).json({ message: "Oportunidad no encontrada" });

    if (req.user.role === "WORKER" && String(opp.vendedorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "No tienes permiso para eliminar esta oportunidad" });
    }

    await opp.deleteOne();

    res.json({ message: "Oportunidad eliminada correctamente" });
  } catch (error) {
    console.error("Error eliminando oportunidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST /api/opportunities/:id/convert-to-sale
router.post("/:id/convert-to-sale", auth, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id).populate("quotes");
    if (!opp) return res.status(404).json({ message: "Oportunidad no encontrada" });

    if (opp.stage === "cerrado_ganado") {
      return res.status(400).json({ message: "Esta oportunidad ya fue ganada" });
    }

    if (req.user.role === "WORKER" && String(opp.vendedorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "No tienes permiso para convertir esta oportunidad" });
    }

    // Buscamos una cotización aprobada (idealmente)
    const approvedQuote = opp.quotes.find(q => q.status === "aprobado");
    const quoteId = approvedQuote ? approvedQuote._id : (opp.quotes.length > 0 ? opp.quotes[0]._id : null);

    // (Eliminado el auto-cierre de la oportunidad, se cerrará al pagar factura)

    // Generar Venta
    const counter = await Counter.findByIdAndUpdate(
      "saleFolio",
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const folio = `V-${String(counter.seq).padStart(4, "0")}`;

    const newSale = await Sale.create({
      folio,
      client: opp.client,
      quote: quoteId,
      opportunityId: opp._id,
      assignedTo: opp.vendedorId,
      executionStage: "validacion",
      isClosed: false,
    });

    // Actualizar status del cliente
    const client = await Client.findById(opp.client);
    if(client) {
      client.status = "activo"; // Se vuelve cliente activo
      await client.save();
    }

    res.status(201).json({
      message: "Venta creada correctamente (Oportunidad en pausa hasta pago)",
      sale: newSale,
      opportunity: opp
    });
  } catch (error) {
    console.error("Error convirtiendo a venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
