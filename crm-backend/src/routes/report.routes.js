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
    // Parámetros: rango de fechas (YYYY-MM-DD) y userId opcional
    const { startDate, endDate, userId } = req.query;

    // Construcción de rango de fechas seguro
    let dateFilter = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start) && !isNaN(end)) {
        // incluir el final del día endDate
        end.setHours(23, 59, 59, 999);
        dateFilter = { $gte: start, $lte: end };
      }
    }

    // Seguridad por rol: WORKER solo puede consultarse a sí mismo
    const effectiveUserId = req.user.role === "WORKER" ? String(req.user._id) : (userId || null);

    // 1) Ventas reales: sumar total de sales (sumando quote.total) dentro del rango y por user si aplica
    const salesPipeline = [];
    if (effectiveUserId) salesPipeline.push({ $match: { assignedTo: req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId) } });
    if (dateFilter) salesPipeline.push({ $match: { createdAt: dateFilter } });
    salesPipeline.push(
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
          _id: null,
          realSales: { $sum: { $ifNull: ["$quoteDoc.total", 0] } },
          count: { $sum: 1 },
        },
      }
    );

    const salesAgg = await Sale.aggregate(salesPipeline);
    const realSales = salesAgg?.[0]?.realSales || 0;

    // 2) Pipeline: quotes con status en [sent, approved, negotiation], filtradas por fecha de creación y user si aplica
    const quoteMatch = { status: { $in: ["sent", "approved", "negotiation"] } };
    if (dateFilter) quoteMatch.createdAt = dateFilter;
    if (effectiveUserId) quoteMatch.createdBy = req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId);

    const pipelineAgg = await Quote.aggregate([
      { $match: quoteMatch },
      {
        $group: {
          _id: null,
          pipeline: { $sum: { $ifNull: ["$total", 0] } },
          totalPropuestas: { $sum: 1 },
        },
      },
    ]);

    const pipeline = pipelineAgg?.[0]?.pipeline || 0;
    const totalPropuestas = pipelineAgg?.[0]?.totalPropuestas || 0;

    // 3) Meta: buscar en salesgoals por mes, año y userId; si no hay, usar meta global
    // Tomamos el mes-año del startDate si viene, si no del día actual
    const refDate = dateFilter ? new Date(new Date(startDate)) : new Date();
    const y = refDate.getFullYear();
    const m = refDate.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;

    let goalAmount = 0;
    if (effectiveUserId) {
      const userGoal = await SalesGoal.findOne({ month: monthKey, user: effectiveUserId }).select("goalAmount");
      if (userGoal && userGoal.goalAmount != null) goalAmount = userGoal.goalAmount;
    }
    if (!goalAmount) {
      const globalGoal = await SalesGoal.findOne({ month: monthKey, user: null }).select("goalAmount");
      if (globalGoal && globalGoal.goalAmount != null) goalAmount = globalGoal.goalAmount;
    }

    // 4) Proyección
    const projection = (realSales || 0) + (pipeline || 0);

    // 5) % cumplimiento
    const compliance = goalAmount > 0 ? (projection / goalAmount) * 100 : 0;

    res.json({
      totalPropuestas,
      totalPotencial: pipeline, // mantener compatibilidad con frontend existente
      realSales,
      pipeline,
      goal: goalAmount,
      projection,
      compliance,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        userId: effectiveUserId,
        month: monthKey,
      },
    });
  } catch (error) {
    console.error("Error en proyecciones:", error);
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
    // Filtros: rango de fechas por fecha de venta (Sales.createdAt), userId (vendedor asignado)
    const { startDate, endDate, userId } = req.query;

    // Rango de fechas seguro
    let dateFilter = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start) && !isNaN(end)) {
        end.setHours(23, 59, 59, 999);
        dateFilter = { $gte: start, $lte: end };
      }
    }

    // Seguridad: WORKER solo puede verse a sí mismo
    const effectiveUserId = req.user.role === "WORKER" ? String(req.user._id) : (userId || null);

    // 1) Ingresos por publicidad (ventas relacionadas con campañas), excluir canceladas si hay campo isCancelled o isClosed=false
    // Suponemos que Sale tiene referencia a campaign (campaign field) y a quote para monto
    const salesMatch = { };
    if (effectiveUserId) salesMatch.assignedTo = req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId);
    if (dateFilter) salesMatch.createdAt = dateFilter;

    const salesAgg = await Sale.aggregate([
      { $match: salesMatch },
      // excluir canceladas si existe flag
      { $match: { $or: [ { isCancelled: { $exists: false } }, { isCancelled: { $ne: true } } ] } },
      // Solo con campaign asociado
      { $match: { campaign: { $ne: null } } },
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
        $lookup: {
          from: "campaigns",
          localField: "campaign",
          foreignField: "_id",
          as: "campaignDoc",
        },
      },
      { $unwind: { path: "$campaignDoc", preserveNullAndEmptyArrays: true } },
      // Excluir campañas inactivas/canceladas si aplica
      { $match: { $or: [ { "campaignDoc.active": { $exists: false } }, { "campaignDoc.active": true } ] } },
      { $match: { $or: [ { "campaignDoc.status": { $exists: false } }, { "campaignDoc.status": { $nin: ["cancelled", "inactive"] } } ] } },
      {
        $group: {
          _id: "$_id", // asegurar no duplicar ventas
          amount: { $max: { $ifNull: ["$quoteDoc.total", 0] } },
          campaignId: { $first: "$campaign" },
          campaignName: { $first: "$campaignDoc.name" },
        },
      },
      {
        $group: {
          _id: null,
          ingresosPublicidad: { $sum: "$amount" },
        },
      },
    ]);

    const ingresosPublicidad = salesAgg?.[0]?.ingresosPublicidad || 0;

    // 2) Rendimiento por campaña: total vendido por campaña y cantidad de anuncios vendidos
    const perfCampAgg = await Sale.aggregate([
      { $match: salesMatch },
      { $match: { $or: [ { isCancelled: { $exists: false } }, { isCancelled: { $ne: true } } ] } },
      { $match: { campaign: { $ne: null } } },
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
        $lookup: {
          from: "campaigns",
          localField: "campaign",
          foreignField: "_id",
          as: "campaignDoc",
        },
      },
      { $unwind: { path: "$campaignDoc", preserveNullAndEmptyArrays: true } },
      { $match: { $or: [ { "campaignDoc.active": { $exists: false } }, { "campaignDoc.active": true } ] } },
      { $match: { $or: [ { "campaignDoc.status": { $exists: false } }, { "campaignDoc.status": { $nin: ["cancelled", "inactive"] } } ] } },
      {
        $group: {
          _id: "$_id",
          amount: { $max: { $ifNull: ["$quoteDoc.total", 0] } },
          campaignId: { $first: "$campaign" },
          campaignName: { $first: "$campaignDoc.name" },
          adsCount: { $max: { $ifNull: ["$itemsCount", 1] } }, // fallback si no existe itemsCount
        },
      },
      {
        $group: {
          _id: "$campaignId",
          campaignName: { $first: "$campaignName" },
          totalVendido: { $sum: "$amount" },
          anunciosVendidos: { $sum: "$adsCount" },
        },
      },
      { $sort: { totalVendido: -1 } },
    ]);

    // 3) Rendimiento por tipo de campaña (si existe campaignDoc.type)
    const perfTipoAgg = await Sale.aggregate([
      { $match: salesMatch },
      { $match: { $or: [ { isCancelled: { $exists: false } }, { isCancelled: { $ne: true } } ] } },
      { $match: { campaign: { $ne: null } } },
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
        $lookup: {
          from: "campaigns",
          localField: "campaign",
          foreignField: "_id",
          as: "campaignDoc",
        },
      },
      { $unwind: { path: "$campaignDoc", preserveNullAndEmptyArrays: true } },
      { $match: { $or: [ { "campaignDoc.active": { $exists: false } }, { "campaignDoc.active": true } ] } },
      { $match: { $or: [ { "campaignDoc.status": { $exists: false } }, { "campaignDoc.status": { $nin: ["cancelled", "inactive"] } } ] } },
      {
        $group: {
          _id: "$_id",
          amount: { $max: { $ifNull: ["$quoteDoc.total", 0] } },
          type: { $first: "$campaignDoc.type" },
          adsCount: { $max: { $ifNull: ["$itemsCount", 1] } },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$type", "Sin tipo"] },
          totalVendido: { $sum: "$amount" },
          anunciosVendidos: { $sum: "$adsCount" },
        },
      },
      { $sort: { totalVendido: -1 } },
    ]);

    // 4) Ocupación (si aplica): espacios vendidos vs disponibles por campaign
    // Asumimos campaignDoc.capacity como espacios disponibles y Sale.itemsCount como vendidos
    const ocupacionAgg = await Sale.aggregate([
      { $match: salesMatch },
      { $match: { $or: [ { isCancelled: { $exists: false } }, { isCancelled: { $ne: true } } ] } },
      { $match: { campaign: { $ne: null } } },
      {
        $lookup: {
          from: "campaigns",
          localField: "campaign",
          foreignField: "_id",
          as: "campaignDoc",
        },
      },
      { $unwind: { path: "$campaignDoc", preserveNullAndEmptyArrays: true } },
      { $match: { $or: [ { "campaignDoc.active": { $exists: false } }, { "campaignDoc.active": true } ] } },
      { $match: { $or: [ { "campaignDoc.status": { $exists: false } }, { "campaignDoc.status": { $nin: ["cancelled", "inactive"] } } ] } },
      {
        $group: {
          _id: "$campaign",
          vendidos: { $sum: { $ifNull: ["$itemsCount", 1] } },
          capacity: { $max: { $ifNull: ["$campaignDoc.capacity", 0] } },
          name: { $max: "$campaignDoc.name" },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          vendidos: 1,
          capacity: 1,
          ocupacion: {
            $cond: [
              { $gt: ["$capacity", 0] },
              { $multiply: [{ $divide: ["$vendidos", "$capacity"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { ocupacion: -1 } },
    ]);

    // 5) Totales por periodo (si aplicara periodicidad en campaigns)
    // Conservamos respuesta anterior como compatibilidad mínima
    res.json({
      ingresosPublicidad,
      rendimientoPorCampana: perfCampAgg,
      rendimientoPorTipo: perfTipoAgg,
      ocupacion: ocupacionAgg,
      // compatibilidad previa
      totalPorDia: 0,
      totalPorSemana: 0,
      totalPorMes: 0,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        userId: effectiveUserId,
      },
    });
  } catch (error) {
    console.error("Error en reporte de publicidad:", error);
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/activaciones", auth, async (req, res) => {
  try {
    // Filtros
    const { startDate, endDate, userId, estado, days } = req.query;
    const now = new Date();
    const upcomingDays = Number(days) > 0 ? Number(days) : 7;

    // Validación de fechas de activación (campaign.fechaInicio/fechaFin)
    let rangeFilter = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start) && !isNaN(end)) {
        end.setHours(23, 59, 59, 999);
        // Rango de solapamiento: fechaInicio <= end AND fechaFin >= start
        rangeFilter = { $and: [{ fechaInicio: { $lte: end } }, { fechaFin: { $gte: start } }] };
      }
    }

    // Seguridad: WORKER solo puede verse a sí mismo
    const effectiveUserId = req.user.role === "WORKER" ? String(req.user._id) : (userId || null);

    // Base: excluir campañas canceladas
    const baseMatch = { status: { $ne: "cancelada" } };

    const pipeline = [
      { $match: baseMatch },
      // Filtro por rango de activación si se envía
      ...(rangeFilter ? [{ $match: rangeFilter }] : []),
      // Relación con venta -> assignedTo (vendedor)
      {
        $lookup: {
          from: "sales",
          localField: "sale",
          foreignField: "_id",
          as: "saleDoc",
        },
      },
      { $unwind: { path: "$saleDoc", preserveNullAndEmptyArrays: true } },
      // Si hay filtro de vendedor, aplicarlo contra saleDoc.assignedTo
      ...(effectiveUserId
        ? [{ $match: { "saleDoc.assignedTo": req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId) } }]
        : []),
      // Cliente
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "clientDoc",
        },
      },
      { $unwind: { path: "$clientDoc", preserveNullAndEmptyArrays: true } },
      // Usuario vendedor (para mostrar nombre)
      {
        $lookup: {
          from: "users",
          localField: "saleDoc.assignedTo",
          foreignField: "_id",
          as: "sellerDoc",
        },
      },
      { $unwind: { path: "$sellerDoc", preserveNullAndEmptyArrays: true } },
      // Totales desde espacios (si existen)
      {
        $addFields: {
          totalCantidad: { $sum: { $map: { input: { $ifNull: ["$espacios", []] }, as: "e", in: { $ifNull: ["$e.cantidad", 0] } } } },
          totalPrecio: { $sum: { $map: { input: { $ifNull: ["$espacios", []] }, as: "e", in: { $ifNull: ["$e.precio", 0] } } } },
        },
      },
      {
        $project: {
          _id: 1,
          nombre: 1,
          status: 1,
          fechaInicio: 1,
          fechaFin: 1,
          clientName: "$clientDoc.nombreComercial",
          sellerId: "$sellerDoc._id",
          sellerName: "$sellerDoc.name",
          totalCantidad: 1,
          totalPrecio: 1,
          espaciosFechas: "$espacios.fechas",
        },
      },
    ];

    const campaigns = await require("mongoose").model("Campaign").aggregate(pipeline);

    // Normalización de fechas de espacios (si existen)
    const normalizeFechas = (espaciosFechas) => {
      const set = new Set();
      (espaciosFechas || []).forEach((arr) => {
        (arr || []).forEach((d) => {
          const iso = new Date(d).toISOString().slice(0, 10);
          set.add(iso);
        });
      });
      return Array.from(set).sort();
    };

    const today = now;
    const soon = new Date(now);
    soon.setDate(soon.getDate() + upcomingDays);

    const records = campaigns.map((c) => {
      const fechas = normalizeFechas(c.espaciosFechas);
      return {
        campaignId: c._id,
        nombre: c.nombre,
        cliente: c.clientName || "-",
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        fechas,
        cantidad: c.totalCantidad || 0,
        costo: c.totalPrecio || 0,
        sellerId: c.sellerId || null,
        sellerName: c.sellerName || null,
        status: c.status,
      };
    });

    // Clasificación por estado temporal (sin duplicar campañas)
    const isActive = (r) => r.fechaInicio && r.fechaFin && (new Date(r.fechaInicio) <= today) && (today <= new Date(r.fechaFin)) && r.status !== "cancelada";
    const isUpcoming = (r) => r.fechaFin && (new Date(r.fechaFin) >= today) && (new Date(r.fechaFin) <= soon) && r.status !== "cancelada" && r.status !== "finalizada";
    const isFinished = (r) => r.fechaFin && (new Date(r.fechaFin) < today);

    const activas = records.filter(isActive);
    const porVencer = records.filter(isUpcoming);
    const finalizadas = records.filter(isFinished);

    // Si se envía estado, filtrar la lista principal a ese estado
    let listado = records;
    if (estado === "active") listado = activas;
    else if (estado === "upcoming") listado = porVencer;
    else if (estado === "finished") listado = finalizadas;

    // Totales únicos por campaña
    const uniqueById = (arr) => Array.from(new Map(arr.map((x) => [String(x.campaignId), x])).values());

    const resp = {
      totalActivas: uniqueById(activas).length,
      totalPorVencer: uniqueById(porVencer).length,
      totalFinalizadas: uniqueById(finalizadas).length,
      activaciones: uniqueById(listado),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        userId: effectiveUserId,
        estado: estado || null,
        days: upcomingDays,
      },
    };

    res.json(resp);
  } catch (error) {
    console.error("Error en reporte de activaciones:", error);
    res.status(500).json({ message: "Error interno" });
  }
});


router.get("/analytics", auth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    // Rango de fechas OBLIGATORIO
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate y endDate son obligatorios (YYYY-MM-DD)" });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Fechas inválidas" });
    }
    end.setHours(23, 59, 59, 999);

    // Seguridad por rol (WORKER solo a sí mismo)
    const effectiveUserId = req.user.role === "WORKER" ? String(req.user._id) : (userId || null);

    // 1) Funnel comercial
    // 1.1 Cotizaciones del rango
    const quoteMatch = { createdAt: { $gte: start, $lte: end } };
    if (effectiveUserId) quoteMatch.createdBy = req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId);

    const quotesAgg = await Quote.aggregate([
      { $match: quoteMatch },
      {
        $group: {
          _id: null,
          totalQuotes: { $sum: 1 },
          approvedQuotes: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          rejectedOrCancelled: { $sum: { $cond: [{ $in: ["$status", ["rejected", "cancelled"]] }, 1, 0] } },
        },
      },
    ]);

    const totalQuotes = quotesAgg?.[0]?.totalQuotes || 0;
    const approvedQuotes = quotesAgg?.[0]?.approvedQuotes || 0;
    const rejectedOrCancelled = quotesAgg?.[0]?.rejectedOrCancelled || 0;

    // 1.2 Ventas del mismo rango
    const saleMatch = { createdAt: { $gte: start, $lte: end } };
    if (effectiveUserId) saleMatch.assignedTo = req.user.role === "WORKER" ? req.user._id : require("mongoose").Types.ObjectId(effectiveUserId);

    // Para no contar múltiples ventas de la misma quote como múltiples conversiones, contamos ventas DISTINCT por quote
    const salesAgg = await Sale.aggregate([
      { $match: saleMatch },
      { $group: { _id: "$quote" } }, // una conversión por quote
      { $group: { _id: null, closedSales: { $sum: 1 } } },
    ]);
    const closedSales = salesAgg?.[0]?.closedSales || 0;

    const conversionRate = approvedQuotes > 0 ? (closedSales / approvedQuotes) * 100 : 0;

    // 2) Tiempo promedio de cierre (días)
    // Diferencia entre quote.createdAt y sale.createdAt para las ventas del rango
    const timeAgg = await Sale.aggregate([
      { $match: saleMatch },
      {
        $lookup: {
          from: "quotes",
          localField: "quote",
          foreignField: "_id",
          as: "quoteDoc",
        },
      },
      { $unwind: { path: "$quoteDoc", preserveNullAndEmptyArrays: true } },
      // Excluir registros sin quote o fechas inválidas
      { $match: { "quoteDoc.createdAt": { $exists: true } } },
      {
        $project: {
          _id: 0,
          diffMs: { $subtract: ["$createdAt", "$quoteDoc.createdAt"] },
        },
      },
      { $match: { diffMs: { $gte: 0 } } },
      {
        $group: {
          _id: null,
          avgDiffMs: { $avg: "$diffMs" },
          count: { $sum: 1 },
        },
      },
    ]);
    const avgDiffMs = timeAgg?.[0]?.avgDiffMs || 0;
    const avgCloseTimeDays = avgDiffMs > 0 ? avgDiffMs / (1000 * 60 * 60 * 24) : 0;

    // 3) Tasa de cancelación: (rejected + cancelled) / totalQuotes
    const cancelRate = totalQuotes > 0 ? (rejectedOrCancelled / totalQuotes) * 100 : 0;

    // 4) Retención de clientes
    // Clientes con más de una venta en periodos distintos (meses distintos)
    const retentionAgg = await Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: { client: "$client", year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          ventasMes: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.client",
          mesesConVenta: { $sum: 1 },
        },
      },
      { $match: { mesesConVenta: { $gt: 1 } } },
      { $group: { _id: null, clientesRetenidos: { $sum: 1 } } },
    ]);
    const clientesRetenidos = retentionAgg?.[0]?.clientesRetenidos || 0;

    // Total de clientes activos en el rango (clientes que tuvieron alguna venta en el rango)
    const activeClientsAgg = await Sale.aggregate([
      { $match: saleMatch },
      { $group: { _id: "$client" } },
      { $group: { _id: null, totalClientesActivos: { $sum: 1 } } },
    ]);
    const totalClientesActivos = activeClientsAgg?.[0]?.totalClientesActivos || 0;

    const retentionRate = totalClientesActivos > 0 ? (clientesRetenidos / totalClientesActivos) * 100 : 0;

    res.json({
      funnel: {
        totalQuotes,
        approvedQuotes,
        closedSales,
        conversionRate,
        cancelRate,
      },
      avgCloseTimeDays,
      retention: {
        clientesRetenidos,
        totalClientesActivos,
        retentionRate,
      },
      filters: {
        startDate,
        endDate,
        userId: effectiveUserId,
      },
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