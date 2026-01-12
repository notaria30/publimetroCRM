// src/middlewares/auth.middleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware principal: verifica token
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó un token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // buscar usuario
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Token inválido (usuario no existe)" });
    }

    // guardar usuario en la request
    req.user = user;
    req.user.role = (req.user.role || "").toUpperCase();
    next();
  } catch (error) {
    console.error("Error en auth middleware:", error);
    res.status(401).json({ message: "Token inválido o expirado" });
  }
};
// Middleware que solo deja pasar a OWNER
const isOwner = (req, res, next) => {
  if (req.user.role !== "OWNER") {
    return res.status(403).json({ message: "Solo el dueño puede hacer esta acción" });
  }
  next();
};
module.exports = { auth, isOwner };