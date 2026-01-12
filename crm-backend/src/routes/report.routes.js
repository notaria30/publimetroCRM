const express = require("express");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Invoice = require("../models/Invoice");
const { auth } = require("../middlewares/auth.middleware");
const router = express.Router();
const SalesGoal = require("../models/SalesGoal"); 

// Reporte de ventas con filtros (SIN formato)
router.get("/sales", auth, async (req, res) => {
  try {
    const {
      cliente,
      tipoCliente,
      ejecutivo,
      fechaInicio,
      fechaFin,
      pagado, // "true" | "false" | undefined
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

    // 1) Buscar ventas base
    let ventas = await Sale.find(filtros)
      .populate("client", "nombreComercial tipoCliente")
      .populate("quote") // aquí viene quote.total
      .populate("assignedTo", "name email");

    // 2) Filtro por tipoCliente (sin formato)
    if (tipoCliente) {
      ventas = ventas.filter((v) => v?.client?.tipoCliente === tipoCliente);
    }

    // 3) Preparar mapa de pagos por quote (para mostrar y/o filtrar)
    const quoteIds = ventas
      .map((v) => v?.quote?._id)
      .filter(Boolean);

    const facturas = await Invoice.find({ quote: { $in: quoteIds } })
      .select("quote pagado");

    const pagoPorQuote = new Map(
      facturas.map((f) => [String(f.quote), Boolean(f.pagado)])
    );

    // 4) Si filtras por pagado, filtra por el mapa (más directo y sin $in gigante)
    if (pagado === "true" || pagado === "false") {
      const target = pagado === "true";
      ventas = ventas.filter((v) => {
        const qid = String(v?.quote?._id || "");
        // si no hay factura, no coincide ni con true ni con false (queda fuera)
        if (!pagoPorQuote.has(qid)) return false;
        return pagoPorQuote.get(qid) === target;
      });
    }

    // 5) Enriquecer ventas con "pagado" (para frontend/Excel)
    const ventasUI = ventas.map((v) => {
      const qid = String(v?.quote?._id || "");
      const pagadoVal = pagoPorQuote.has(qid) ? pagoPorQuote.get(qid) : null; // null si no hay factura
      return {
        ...v.toObject(),
        pagado: pagadoVal,
        monto: v?.quote?.total || 0,
      };
    });

    // ==============================
    // 📊  STATS (con monto)
    // ==============================
    const porCliente = {};
    const porEjecutivo = {};     // { "Juan": { count, totalMonto } }
    const porTipoCliente = {};
    const porMes = {};           // { "2026-01": { count, totalMonto } }

    ventasUI.forEach((v) => {
      const nombreCliente = v?.client?.nombreComercial || "Sin cliente";
      const nombreEjecutivo = v?.assignedTo?.name || "Sin ejecutivo";
      const tipoCli = v?.client?.tipoCliente || "Sin tipo";
      const fecha = new Date(v.createdAt);
      const mes = fecha.toISOString().slice(0, 7);
      const monto = v.monto || 0;

      porCliente[nombreCliente] = (porCliente[nombreCliente] || 0) + 1;

      if (!porEjecutivo[nombreEjecutivo]) {
        porEjecutivo[nombreEjecutivo] = { count: 0, totalMonto: 0 };
      }
      porEjecutivo[nombreEjecutivo].count += 1;
      porEjecutivo[nombreEjecutivo].totalMonto += monto;

      porTipoCliente[tipoCli] = (porTipoCliente[tipoCli] || 0) + 1;

      if (!porMes[mes]) {
        porMes[mes] = { count: 0, totalMonto: 0 };
      }
      porMes[mes].count += 1;
      porMes[mes].totalMonto += monto;
    });

    res.json({
      total: ventasUI.length,
      ventas: ventasUI,
      stats: {
        porCliente,
        porEjecutivo,
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
    const month = req.query.month; // "YYYY-MM" (opcional)

    // Base pipeline: ventas por vendedor (y suma de monto si hay quote.total)
    const pipeline = [];

    // WORKER: solo él
    if (req.user.role === "WORKER") {
      pipeline.push({ $match: { assignedTo: req.user._id } });
    }

    // Si quieres filtrar por mes, usamos createdAt dentro del mes
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-");
      const start = new Date(Number(y), Number(m) - 1, 1);
      const end = new Date(Number(y), Number(m), 1);
      pipeline.push({ $match: { createdAt: { $gte: start, $lt: end } } });
    }

    pipeline.push(
      // traer quote para sumar total
      {
        $lookup: {
          from: "quotes",
          localField: "quote",
          foreignField: "_id",
          as: "quoteDoc",
        },
      },
      { $unwind: { path: "$quoteDoc", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          _id: "$assignedTo",
          totalVentas: { $sum: 1 },
          totalMonto: { $sum: { $ifNull: ["$quoteDoc.total", 0] } },
          ventasCerradas: { $sum: { $cond: [{ $eq: ["$isClosed", true] }, 1, 0] } },
          montoCerrado: {
            $sum: { $cond: [{ $eq: ["$isClosed", true] }, { $ifNull: ["$quoteDoc.total", 0] }, 0] },
          },
        },
      },

      // usuario
      {
        $lookup: {
          from: "users",
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
          totalMonto: 1,
          ventasCerradas: 1,
          montoCerrado: 1,
          name: "$user.name",
          email: "$user.email",
          role: "$user.role",
        },
      },
      { $sort: { totalMonto: -1 } }
    );

    const vendedores = await Sale.aggregate(pipeline);

    // Metas del mes (solo si month viene)
    let goalsMap = new Map();
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const goals = await SalesGoal.find({ month }).select("user goalAmount goalClosedDeals");
      goalsMap = new Map(goals.map((g) => [String(g.user), g]));
    }

    const enriched = vendedores.map((v) => {
      const g = goalsMap.get(String(v._id));
      const goalAmount = g?.goalAmount ?? 0;
      const goalClosedDeals = g?.goalClosedDeals ?? 0;

      const progressAmount = goalAmount > 0 ? Math.min(100, (v.montoCerrado / goalAmount) * 100) : 0;
      const progressDeals = goalClosedDeals > 0 ? Math.min(100, (v.ventasCerradas / goalClosedDeals) * 100) : 0;

      return {
        ...v,
        goal: {
          month: month || null,
          goalAmount,
          goalClosedDeals,
          progressAmount,
          progressDeals,
        },
      };
    });

    res.json({ vendedores: enriched, month: month || null });
  } catch (error) {
    console.error("Error en metas vendedores:", error);
    res.status(500).json({ message: "Error interno" });
  }
});

module.exports = router;