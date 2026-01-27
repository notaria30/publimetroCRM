// src/routes/quote.routes.js
const express = require("express");
const Quote = require("../models/Quote");
const { auth } = require("../middlewares/auth.middleware");
const puppeteer = require("puppeteer");
const router = express.Router();

function normalizeActivaciones(data) {
  // Si viene activaciones como array
  if (Array.isArray(data.activaciones)) {
    data.activaciones = data.activaciones.filter(Boolean);

    const selected =
      data.activaciones.find((a) => a?.activo) || data.activaciones[0];

    data.activacion = selected || undefined;
    return data;
  }

  // Si viene activacion singular
  if (data.activacion) {
    data.activaciones = [data.activacion];
    return data;
  }

  // Si no viene nada
  data.activaciones = [];
  data.activacion = undefined;
  return data;
}


// Crear cotización
router.post("/", auth, async (req, res) => {
  try {
    const data = req.body;

    normalizeActivaciones(data);

    // Asignar usuario creador
    data.createdBy = req.user._id;

    const quote = await Quote.create(data);

    res.status(201).json({
      message: "Cotización creada correctamente",
      quote,
    });
  } catch (error) {
    console.error("Error al crear cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Listar cotizaciones
router.get("/", auth, async (req, res) => {
  try {
    let quotes;

    if (req.user.role === "OWNER") {
      quotes = await Quote.find()
        .populate("client", "nombreComercial razonSocial")
        .populate("createdBy", "name email");
    } else {
      quotes = await Quote.find({ createdBy: req.user._id })
        .populate("client", "nombreComercial razonSocial")
        .populate("createdBy", "name email");
    }

    res.json(quotes);
  } catch (error) {
    console.error("Error al obtener cotizaciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Obtener una cotización por ID
router.get("/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate("client", "nombreComercial razonSocial rfc")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email role");

    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    // Compat: si no hay activaciones pero sí activacion, agrega array virtual
    if ((!quote.activaciones || quote.activaciones.length === 0) && quote.activacion) {
      quote.activaciones = [quote.activacion];
    }

    // WORKER solo puede ver las suyas
    if (req.user.role === "WORKER" && quote.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No tienes permiso para ver esta cotización" });
    }
    // Si hay activaciones, asegúrate que activacion sea la activa (o la primera)
    if (quote.activaciones && quote.activaciones.length > 0) {
      const selected =
        quote.activaciones.find((a) => a?.activo) || quote.activaciones[0];

      quote.activacion = selected;
    } else if (quote.activacion) {
      quote.activaciones = [quote.activacion];
    }

    res.json(quote);
  } catch (error) {
    console.error("Error al obtener cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


// Actualizar una cotización
router.put("/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    // WORKER solo puede editar las suyas
    if (
      req.user.role === "WORKER" &&
      quote.createdBy.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "No tienes permiso para actualizar esta cotización" });
    }

    // Copia los datos que vienen del body
    const updateData = { ...req.body };

    normalizeActivaciones(updateData);

    // Si es WORKER, NO puede tocar estado de aprobación
    if (req.user.role === "WORKER") {
      delete updateData.status;
      delete updateData.approvedBy;
      delete updateData.approvedAt;
    }

    const updatedQuote = await Quote.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "Cotización actualizada correctamente",
      updatedQuote,
    });
  } catch (error) {
    console.error("Error al actualizar cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Aprobar una cotización (OWNER o DIRECTOR)
router.put("/:id/approve", auth, async (req, res) => {
  try {
    // Solo OWNER o DIRECTOR pueden aprobar
    if (req.user.role !== "OWNER" && req.user.role !== "DIRECTOR") {
      return res
        .status(403)
        .json({ message: "No tienes permisos para aprobar cotizaciones" });
    }

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      {
        status: "aprobado",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    )
      .populate("client", "nombreComercial razonSocial")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("approvedBy", "name email role");

    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    res.json({
      message: "Cotización aprobada correctamente",
      quote,
    });
  } catch (error) {
    console.error("Error al aprobar cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Rechazar una cotización (OWNER o DIRECTOR)
router.put("/:id/reject", auth, async (req, res) => {
  try {
    if (req.user.role !== "OWNER" && req.user.role !== "DIRECTOR") {
      return res
        .status(403)
        .json({ message: "No tienes permisos para rechazar cotizaciones" });
    }

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      {
        status: "rechazado",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      },
      { new: true }
    )
      .populate("client", "nombreComercial razonSocial")
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("approvedBy", "name email role");


    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    res.json({
      message: "Cotización rechazada",
      quote,
    });
  } catch (error) {
    console.error("Error al rechazar cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


// Eliminar cotización (solo OWNER)
router.delete("/:id", auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    if (req.user.role !== "OWNER") {
      return res.status(403).json({ message: "Solo el dueño puede eliminar cotizaciones" });
    }

    await quote.deleteOne();

    res.json({ message: "Cotización eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;