const express = require("express");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Invoice = require("../models/Invoice");
const { auth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Reporte de ventas con filtros
router.get("/sales", auth, async (req, res) => {
  try {
    const {
      cliente,
      formato,
      tipoCliente,
      ejecutivo,
      fechaInicio,
      fechaFin,
      pagado,
    } = req.query;

    let filtros = {};

    // WORKER solo ve sus ventas
    if (req.user.role === "WORKER") {
      filtros.assignedTo = req.user._id;
    }

    if (cliente) filtros.client = cliente;
    if (req.user.role === "OWNER" && ejecutivo) filtros.assignedTo = ejecutivo;

    if (fechaInicio && fechaFin) {
      filtros.createdAt = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin),
      };
    }

    // Si se filtra por pagado
    if (pagado === "true" || pagado === "false") {
      const facturas = await Invoice.find({ pagado: pagado === "true" }).select("quote");
      filtros.quote = { $in: facturas.map((f) => f.quote) };
    }

    // Buscar ventas
    let ventas = await Sale.find(filtros)
      .populate("client", "nombreComercial tipoCliente")
      .populate("quote")
      .populate("assignedTo", "name email");

    // Formato desde cotización
    if (formato) {
      ventas = ventas.filter((v) =>
        v.quote?.tarifas?.some((t) => t.formato === formato)
      );
    }

    if (tipoCliente) {
      ventas = ventas.filter((v) => v.client.tipoCliente === tipoCliente);
    }

    // ==============================
    // 📊  AGREGACIONES
    // ==============================
    const porCliente = {};
    const porEjecutivo = {};
    const porFormato = {};
    const porTipoCliente = {};
    const porMes = {};

    ventas.forEach((v) => {
      const cliente = v.client.nombreComercial;
      const ejecutivo = v.assignedTo.name;
      const tipoCli = v.client.tipoCliente;
      const fecha = new Date(v.createdAt);
      const mes = fecha.toISOString().slice(0, 7);

      // formatos
      v.quote?.tarifas?.forEach((t) => {
        porFormato[t.formato] = (porFormato[t.formato] || 0) + 1;
      });

      porCliente[cliente] = (porCliente[cliente] || 0) + 1;
      porEjecutivo[ejecutivo] = (porEjecutivo[ejecutivo] || 0) + 1;
      porTipoCliente[tipoCli] = (porTipoCliente[tipoCli] || 0) + 1;
      porMes[mes] = (porMes[mes] || 0) + 1;
    });

    // RESPUESTA COMPLETA
    res.json({
      total: ventas.length,
      ventas,
      stats: {
        porCliente,
        porEjecutivo,
        porFormato,
        porTipoCliente,
        porMes,
      },
    });
  } catch (error) {
    console.error("Error en reporte de ventas:", error);
    res.status(500).json({ message: "Error interno" });
  }
});



router.get("/projections", auth, async (req, res) => {
  try {
    const filtros = {
      pipelineStage: "propuesta",
    };

    // 🔐 WORKER solo ve sus propuestas
    if (req.user.role === "WORKER") {
      filtros.assignedTo = req.user._id;
    }

    const propuestas = await Sale.find(filtros).populate("quote");

    const totalPotencial = propuestas.reduce(
      (sum, sale) => sum + (sale.quote?.total || 0),
      0
    );

    res.json({
      totalPropuestas: propuestas.length,
      totalPotencial,
      propuestas,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/clientes-activos", auth, async (req, res) => {
  try {
    let filtros = { clienteActivo: true };

    // 🔐 WORKER solo sus clientes
    if (req.user.role === "WORKER") {
      filtros.assignedTo = req.user._id;
    }

    const clientes = await Client.find(filtros);

    res.json({
      total: clientes.length,
      clientes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/publicidad", auth, async (req, res) => {
  try {
    let filtros = {};

    // 🔐 WORKER solo sus cotizaciones
    if (req.user.role === "WORKER") {
      filtros.createdBy = req.user._id;
    }

    const quotes = await Quote.find(filtros);

    let totalPorDia = 0;
    let totalPorSemana = 0;
    let totalPorMes = 0;

    quotes.forEach(q => {
      q.tarifas.forEach(t => {
        if (t.periodicidad === "diario") totalPorDia += t.totalLinea;
        if (t.periodicidad === "semanal") totalPorSemana += t.totalLinea;
        if (t.periodicidad === "mensual") totalPorMes += t.totalLinea;
      });
    });

    res.json({
      totalPorDia,
      totalPorSemana,
      totalPorMes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/activaciones", auth, async (req, res) => {
  try {
    let filtros = { "activacion.activo": true };

    // 🔐 WORKER solo sus cotizaciones
    if (req.user.role === "WORKER") {
      filtros.createdBy = req.user._id;
    }

    const quotes = await Quote.find(filtros)
      .populate("client", "nombreComercial");

    const activaciones = quotes.map(q => ({
      folio: q.folio,
      cliente: q.client?.nombreComercial,
      fechas: q.activacion.fechas,
      cantidad: q.activacion.cantidad,
      costo: q.activacion.costo,
    }));

    res.json({
      totalActivaciones: activaciones.length,
      activaciones,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/analytics", auth, async (req, res) => {
  try {
    const now = new Date();

    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioMesAnterior = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const ventasMes = await Sale.find({ createdAt: { $gte: inicioMes } });
    const ventasMesAnterior = await Sale.find({
      createdAt: { $gte: inicioMesAnterior, $lt: inicioMes },
    });

    res.json({
      mesActual: ventasMes.length,
      mesAnterior: ventasMesAnterior.length,
      comparativo: ventasMes.length - ventasMesAnterior.length,
    });
  } catch (error) {
    console.error("Error en analítica:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

router.get("/metas", auth, async (req, res) => {
  try {
    const pipeline = [];

    // 🔐 WORKER solo ve sus propias metas
    if (req.user.role === "WORKER") {
      pipeline.push({
        $match: { assignedTo: req.user._id },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$assignedTo",
          totalVentas: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",           // <- colección de usuarios (normalmente es "users")
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          totalVentas: 1,
          name: "$user.name",
          email: "$user.email",
          role: "$user.role",
        },
      },
      { $sort: { totalVentas: -1 } }
    );

    const vendedores = await Sale.aggregate(pipeline);

    res.json({ vendedores });
  } catch (error) {
    console.error("Error en metas vendedores:", error);
    res.status(500).json({ message: "Error interno" });
  }
});


module.exports = router;
