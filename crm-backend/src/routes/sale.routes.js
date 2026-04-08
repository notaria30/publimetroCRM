const express = require("express");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const { auth } = require("../middlewares/auth.middleware");
const PostSale = require("../models/PostSale");
const router = express.Router();
const Counter = require("../models/Counter");
const Invoice = require("../models/Invoice");

// NOTA: La creación de una venta a partir de cero o de cotización directamente 
// ha sido reemplazada por el flujo de Opportunidades (POST /api/opportunities/:id/convert-to-sale).
// Listar ventas
router.get("/", auth, async (req, res) => {
  try {
    let sales;
    if (req.user.role === "OWNER") {
      sales = await Sale.find()
        .populate("client", "nombreComercial status")
        .populate("quote", "folio total")
        .populate("assignedTo", "name email");
    } else {
      sales = await Sale.find({ assignedTo: req.user._id })
        .populate("client", "nombreComercial status")
        .populate("quote", "folio total status")
        .populate("assignedTo", "name email");
    }
    // ✅ Agregar campo facturado basado en facturas existentes
    const saleIds = sales.map((s) => s._id);

    const invoices = await Invoice.find({
      sale: { $in: saleIds },
    }).select("sale");

    const facturadasSet = new Set(
      invoices
        .filter((inv) => inv.sale)
        .map((inv) => String(inv.sale))
    );

    const salesWithFacturado = sales.map((s) => ({
      ...s.toObject(),
      facturado: facturadasSet.has(String(s._id)),
    }));

    return res.json(salesWithFacturado);

  } catch (error) {
    console.error("Error al obtener ventas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
// Ver una venta por ID
router.get("/:id", auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("client", "nombreComercial status rfc")
      .populate("quote", "folio total status metodoPago formaPago")
      .populate("assignedTo", "name email")
      .populate("tasks.createdBy", "name email")
      .populate("followUpNotes.createdBy", "name email");
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    // WORKER solo puede ver sus propias ventas
    if (req.user.role === "WORKER") {
      const assignedId =
        sale.assignedTo && sale.assignedTo._id
          ? sale.assignedTo._id.toString()
          : sale.assignedTo.toString();

      if (assignedId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para ver esta venta" });
      }
    }

    const saleData = sale.toObject();

    if (saleData.quote) {
      saleData.metodoPago = saleData.quote.metodoPago || "PUE";
      saleData.formaPago = saleData.quote.formaPago || "";
    }

    res.json(sale);
  } catch (error) {
    console.error("Error al obtener venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
// Actualizar pipeline
router.put("/:id", auth, async (req, res) => {
  try {
    const saleId = req.params.id;
    const updates = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    // Solo el OWNER o el dueño del registro pueden editar
    if (req.user.role === "WORKER") {
      const assignedId =
        sale.assignedTo && sale.assignedTo._id
          ? sale.assignedTo._id.toString()
          : sale.assignedTo.toString();

      if (assignedId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "No puedes actualizar esta venta" });
      }
    }

    const previousStage = sale.executionStage; // CAMBIO AQUÍ

    // 🔥 Actualizar la venta
    const updatedSale = await Sale.findByIdAndUpdate(
      saleId,
      updates,
      { new: true, runValidators: true }
    )
      .populate("client", "nombreComercial status")
      .populate("quote", "folio total status")
      .populate("assignedTo", "name email")
      .populate("history.changedBy", "name email");



    // 🔥 Historial de pipeline de ejecución
    if (updates.executionStage && previousStage !== updates.executionStage) {
      updatedSale.history.push({
        fromStage: previousStage,
        toStage: updates.executionStage,
        changedBy: req.user._id,
      });

      await updatedSale.save();
    }

    res.json({
      message: "Venta actualizada",
      updatedSale,
    });
  } catch (error) {
    console.error("Error al actualizar venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Cerrar venta
router.put("/:id/close", auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    // WORKER solo puede cerrar sus ventas
    if (req.user.role === "WORKER") {
      const assignedId =
        sale.assignedTo && sale.assignedTo._id
          ? sale.assignedTo._id.toString()
          : sale.assignedTo.toString();

      if (assignedId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ message: "No tienes permiso para cerrar esta venta" });
      }
    }

    sale.executionStage = "testigos_enviados"; // Etapa final de la ejecución
    sale.isClosed = true;
    sale.closedAt = new Date();
    await sale.save();
    // actualizar al cliente
    const client = await Client.findById(sale.client);
    client.status = "cierre";
    await client.save();

    res.json({
      message: "Venta cerrada correctamente",
      sale,
    });
  } catch (error) {
    console.error("Error al cerrar venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Agregar nota de seguimiento
router.post("/:id/notes", auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

    const { text } = req.body;

    sale.followUpNotes.push({
      text,
      createdBy: req.user._id,
    });

    await sale.save();
    await sale.populate("followUpNotes.createdBy", "name email");

    res.json({ message: "Nota agregada", notes: sale.followUpNotes });
  } catch (err) {
    console.error("Error al agregar nota:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

// Agregar tarea
router.post("/:id/tasks", auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

    const { title, dueDate } = req.body;

    sale.tasks.push({
      title,
      dueDate,
      createdBy: req.user._id,
    });

    await sale.save();
    await sale.populate("tasks.createdBy", "name email");

    res.json({ message: "Tarea agregada", tasks: sale.tasks });
  } catch (err) {
    console.error("Error al agregar tarea:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

// Completar tarea
router.put("/:id/tasks/:taskId/complete", auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Venta no encontrada" });

    const task = sale.tasks.id(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

    task.completed = true;
    await sale.save();
    await sale.populate("tasks.createdBy", "name email");

    res.json({ message: "Tarea completada", tasks: sale.tasks });
  } catch (err) {
    console.error("Error completando tarea:", err);
    res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;