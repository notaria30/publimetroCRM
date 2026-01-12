const mongoose = require("mongoose");

const salesGoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // YYYY-MM (ej: "2026-01")
    month: { type: String, required: true },

    goalAmount: { type: Number, default: 0 },
    goalClosedDeals: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

salesGoalSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("SalesGoal", salesGoalSchema);
