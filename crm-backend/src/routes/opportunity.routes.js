const express = require("express");
const Opportunity = require("../models/Opportunity");
const { MOTIVOS_PERDIDA } = Opportunity;
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Sale = require("../models/Sale");
const Counter = require("../models/Counter");
const { auth, canConvertToSale } = require("../middlewares/auth.middleware");
const { updateClientStatus } = require("../services/clientStatus.service");
const { createCampaignForSale } = require("../services/saleLifecycle.service");

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
    const { title, clientId, assignedToId } = req.body;

    const assignedId = req.user.role === "OWNER" && assignedToId ? assignedToId : req.user._id;

    const newOpp = await Opportunity.create({
      title,
      client: clientId,
      vendedorId: assignedId,
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

    if (["cerrado_ganado", "cerrado_perdido"].includes(opp.stage)) {
      return res.status(400).json({ message: "Esta oportunidad ya fue finalizada y no puede reabrirse." });
    }

    // "cerrado_ganado" solo se asigna automáticamente al pagarse la factura de su venta
    if (stage === "cerrado_ganado") {
      return res.status(400).json({
        message: "No puedes mover a Cerrado Ganado manualmente. Avanzará cuando su venta esté facturada y pagada.",
      });
    }

    // Propuesta y Negociación existen porque hay algo cotizado
    if (["propuesta", "negociacion"].includes(stage) && !opp.quotes.length) {
      return res.status(400).json({
        message: "Para pasar a Propuesta o Negociación primero crea una cotización desde la oportunidad.",
      });
    }

    if (stage === "cerrado_perdido") {
      if (opp.convertedToSale) {
        return res.status(400).json({ message: "Esta oportunidad ya tiene una venta; no puede marcarse como perdida." });
      }
      const { motivoPerdida, comentarioPerdida } = req.body;
      if (!MOTIVOS_PERDIDA.includes(motivoPerdida)) {
        return res.status(400).json({ message: "Indica el motivo por el que se perdió la oportunidad." });
      }
      opp.motivoPerdida = motivoPerdida;
      opp.comentarioPerdida = comentarioPerdida || "";
      opp.closedAt = new Date();
    }

    opp.stage = stage;
    await opp.save();

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
// Solo OWNER y DIRECTOR pueden ejecutar esta acción (canConvertToSale middleware).
// La oportunidad debe tener al menos una cotización con status "aprobada".
router.post("/:id/convert-to-sale", auth, canConvertToSale, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id).populate("quotes");
    if (!opp) return res.status(404).json({ message: "Oportunidad no encontrada" });

    if (opp.convertedToSale) {
      return res.status(400).json({
        message: "Esta oportunidad ya fue convertida a venta anteriormente.",
        saleId: opp.saleId
      });
    }

    if (opp.stage === "cerrado_ganado") {
      return res.status(400).json({ message: "Esta oportunidad ya fue ganada" });
    }

    if (req.user.role === "WORKER" && String(opp.vendedorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "No tienes permiso para convertir esta oportunidad" });
    }

    // Verificar que exista al menos una cotización con status "aprobada"
    const hasApprovedQuote = opp.quotes.some(q => q.status === "aprobada");
    if (!hasApprovedQuote) {
      return res.status(403).json({
        message:
          "No se puede convertir a venta. La oportunidad debe tener al menos " +
          "una cotización con estatus \"aprobada\".",
      });
    }

    // Tomar la cotización aprobada (o la primera si hay varias aprobadas)
    const approvedQuote = opp.quotes.find(q => q.status === "aprobada");
    const quoteId = approvedQuote ? approvedQuote._id : null;

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

    // Marcar oportunidad como convertida (bloquear futuras conversiones)
    opp.convertedToSale = true;
    opp.saleId = newSale._id;
    await opp.save();

    // Evaluar estatus del cliente con la regla de los 90 días
    await updateClientStatus(opp.client);

    // Generar la campaña de la venta a partir de la cotización aprobada
    await createCampaignForSale(newSale, req.user._id);

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
