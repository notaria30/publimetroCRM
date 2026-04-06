// src/routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth, isOwner } = require("../middlewares/auth.middleware");



const router = express.Router();

// Helper para generar token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Registrar dueño (OWNER)
// En un proyecto real pondríamos más control, aquí lo dejamos simple
router.post("/register-owner", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "OWNER",
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Dueño creado correctamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error en register-owner:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Crear trabajadores (solo OWNER)
router.post("/create-worker", auth, isOwner, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "WORKER", // <<--- Obligatorio para trabajadores
    });

    res.status(201).json({
      message: "Trabajador creado correctamente",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error en create-worker:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan datos" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Credenciales inválidas (email)" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Credenciales inválidas (password)" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login correcto",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

router.get("/users", auth, async (req, res) => {
  const users = await User.find().select("name email role");
  res.json(users);
});

// Obtener un usuario por ID (solo OWNER)
router.get("/users/:id", auth, isOwner, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email role");
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Editar usuario (solo OWNER)
router.put("/users/:id", auth, isOwner, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (name)  user.name  = name;
    if (email) user.email = email;
    if (role)  user.role  = role;
    if (password) {
      const bcrypt = require("bcryptjs");
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json({ message: "Usuario actualizado", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Eliminar usuario (solo OWNER)
router.delete("/users/:id", auth, isOwner, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    if (String(user._id) === String(req.user._id))
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });

    await user.deleteOne();
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Cambiar contraseña (usuario autenticado)
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Faltan campos requeridos." });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 6 caracteres." });

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "La contraseña actual es incorrecta." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor." });
  }
});

module.exports = router;
