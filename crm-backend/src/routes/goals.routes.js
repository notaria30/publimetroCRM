const express = require("express");
const router = express.Router();
const { auth, isOwner } = require("../middlewares/auth.middleware");
const SalesGoal = require("../models/SalesGoal");
const User = require("../models/User");

// Lista de WORKERS
router.get("/workers", auth, isOwner, async (req, res) => {
  const workers = await User.find({ role: "WORKER" }).select("name email role");
  res.json({ workers });
});

// Crear/actualizar meta (upsert) por user+month
router.post("/", auth, isOwner, async (req, res) => {
  try {
    const { user, month, goalAmount = 0, goalClosedDeals = 0 } = req.body;

    if (!user || !month) {
      return res.status(400).json({ message: "user y month son requeridos" });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "month debe ser formato YYYY-MM" });
    }

    const updated = await SalesGoal.findOneAndUpdate(
      { user, month },
      {
        $set: {
          goalAmount: Number(goalAmount) || 0,
          goalClosedDeals: Number(goalClosedDeals) || 0,
        },
        $setOnInsert: { createdBy: req.user._id },
      },
      { new: true, upsert: true }
    ).populate("user", "name email role");

    res.json({ message: "Meta guardada", goal: updated });
  } catch (e) {
    console.error(e);
    // error típico: duplicado por índice unique
    res.status(500).json({ message: "Error guardando meta" });
  }
});

// Listar metas existentes
router.get("/", auth, isOwner, async (req, res) => {
  const goals = await SalesGoal.find()
    .populate("user", "name email role")
    .sort({ month: -1, createdAt: -1 });

  res.json({ goals });
});

module.exports = router;
