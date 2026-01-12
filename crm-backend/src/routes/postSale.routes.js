const express = require("express");
const PostSale = require("../models/PostSale");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const { auth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Crear registro post-venta
router.post("/", auth, async (req, res) => {
  try {
    const { sale, postSaleStage, medicionResultados, encuestaSatisfaccion, renovacion, notas } = req.body;

    const saleData = await Sale.findById(sale);
    if (!saleData) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }

    // Cliente relacionado
    const clientData = await Client.findById(saleData.client);
    if (!clientData) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const postSale = await PostSale.create({
      sale,
      client: saleData.client,
      assignedTo: saleData.assignedTo, // el mismo ejecutivo
      postSaleStage,
      medicionResultados,
      encuestaSatisfaccion,
      renovacion,
      notas,
    });

    res.status(201).json({
      message: "Registro post-venta creado correctamente",
      postSale,
    });
  } catch (error) {
    console.error("Error al crear post-venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Listar post-venta
router.get("/", auth, async (req, res) => {
  try {
    let records;

    if (req.user.role === "OWNER") {
      records = await PostSale.find()
        .populate("sale", "folio _id")
        .populate("client", "nombreComercial status")
        .populate("assignedTo", "name email");
    } else {
      records = await PostSale.find({ assignedTo: req.user._id })
        .populate("sale")
        .populate("client", "nombreComercial status")
        .populate("assignedTo", "name email");
    }

    res.json(records);
  } catch (error) {
    console.error("Error al obtener post-venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ver post-venta específico
router.get("/:id", auth, async (req, res) => {
  try {
    const record = await PostSale.findById(req.params.id)
      .populate("sale")
      .populate("client")
      .populate("assignedTo", "name email");

    if (!record) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    if (req.user.role === "WORKER" && record.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes ver este registro" });
    }

    res.json(record);
  } catch (error) {
    console.error("Error al obtener post-venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Actualizar registro post-venta
router.put("/:id", auth, async (req, res) => {
  try {
    const record = await PostSale.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    if (req.user.role === "WORKER" && record.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No puedes actualizar este registro" });
    }

    const updated = await PostSale.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "Registro actualizado correctamente",
      updated,
    });
  } catch (error) {
    console.error("Error al actualizar post-venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const record = await PostSale.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    if (req.user.role !== "OWNER") {
      return res.status(403).json({ message: "Solo el dueño puede eliminar" });
    }

    await record.deleteOne();

    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar post-venta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


module.exports = router;
