// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    // La etapa "Calificación" se eliminó del pipeline: las oportunidades que
    // quedaron en ella regresan a Prospección.
    await mongoose.connection
      .collection("opportunities")
      .updateMany({ stage: "calificacion" }, { $set: { stage: "prospeccion" } });
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
