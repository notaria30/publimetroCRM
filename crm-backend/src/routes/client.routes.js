const express = require("express");
const Client = require("../models/Client");
const { auth, isOwner } = require("../middlewares/auth.middleware");
const router = express.Router();

// Validar RFC (para evitar clientes duplicados en cualquier worker)
router.get("/check-rfc", auth, async (req, res) => {
  try {
    const { rfc } = req.query;

    if (!rfc) {
      return res.status(400).json({ message: "Falta el RFC" });
    }

    const client = await Client.findOne({ rfc: rfc.toUpperCase().trim() })
      .populate("assignedTo", "name email role");

    if (!client) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      workerName: client.assignedTo?.name || "Desconocido",
      workerEmail: client.assignedTo?.email || null
    });

  } catch (error) {
    console.error("Error en /check-rfc:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Validar NOMBRE COMERCIAL (para evitar clientes duplicados por nombre)
router.get("/check-name", auth, async (req, res) => {
  try {
    const { nombreComercial } = req.query;

    if (!nombreComercial) {
      return res.status(400).json({ message: "Falta el nombre comercial" });
    }

    // Búsqueda case-insensitive
    const client = await Client.findOne({
      nombreComercial: new RegExp(`^${nombreComercial.trim()}$`, "i"),
    }).populate("assignedTo", "name email role");

    if (!client) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      workerName: client.assignedTo?.name || "Desconocido",
      workerEmail: client.assignedTo?.email || null,
    });
  } catch (error) {
    console.error("Error en /check-name:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Crear cliente
router.post("/", auth, async (req, res) => {
  try {
    const data = req.body;
    let assignedTo = req.user._id;
    // Si es OWNER y envía un assignedTo válido, respetarlo
    if (req.user.role === "OWNER" && data.assignedTo) {
      assignedTo = data.assignedTo;
    }
    const client = await Client.create({
      ...data,
      assignedTo,
    });
    res.status(201).json({
      message: "Cliente creado correctamente",
      client,
    });
  } catch (error) {
    console.error("Error al crear cliente:", error);

    // RFC duplicado
    if (error.code === 11000 && error.keyPattern?.rfc) {
      return res.status(400).json({ message: "El RFC ya está registrado en el sistema" });
    }

    // ✅ Validación Mongoose (enum/required/etc.)
    if (error.name === "ValidationError") {
      return res.status(422).json({
        message: "Validación fallida",
        errors: Object.fromEntries(
          Object.entries(error.errors).map(([field, detail]) => [field, detail.message])
        ),
      });
    }

    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Listar clientes
router.get("/", auth, async (req, res) => {
  try {
    let clients;
    if (req.user.role === "OWNER") {
      clients = await Client.find()
        .populate("assignedTo", "name email role");
    } else {
      clients = await Client.find({ assignedTo: req.user._id })
        .populate("assignedTo", "name email role");
    }
    res.json(clients);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Ver cliente por ID
router.get("/:id", auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate(
      "assignedTo",
      "name email"
    );
    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    // Si es worker, solo puede ver los suyos
    if (req.user.role === "WORKER" && client.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No tienes permiso para ver este cliente" });
    }
    res.json(client);
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Actualizar cliente
router.put("/:id", auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    // WORKER solo puede editar sus propios clientes (y NO puede cambiar assignedTo)
    if (req.user.role === "WORKER") {
      if (client.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "No tienes permiso para actualizar este cliente" });
      }
      // Bloquear cambios de assignedTo por workers
      delete req.body.assignedTo;
    }

    // OWNER sí puede reasignar clientes libremente
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json({
      message: "Cliente actualizado correctamente",
      updatedClient,
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Eliminar cliente (solo OWNER)
router.delete("/:id", auth, isOwner, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    await client.deleteOne();
    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
module.exports = router;