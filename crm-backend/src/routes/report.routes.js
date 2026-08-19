const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth.middleware");
const Invoice = require("../models/Invoice");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const SalesGoal = require("../models/SalesGoal");
const User = require("../models/User");
const Quote = require("../models/Quote");

async function getFinancialEvents({ startDate, endDate, clientId, executiveId, tipoCliente, tipoVenta, statusPago }) {
  const events = [];

  // 1. FACTURADAS (Efectivo)
  if (!tipoVenta || tipoVenta === "all" || tipoVenta === "facturada") {
    let invFilter = {};
    if (startDate) invFilter.fechaFactura = { $gte: new Date(startDate) };
    if (endDate) invFilter.fechaFactura = { ...invFilter.fechaFactura, $lte: new Date(endDate) };
    if (statusPago === "pagadas") invFilter.pagado = true;
    if (statusPago === "pendiente") invFilter.pagado = false;

    let invoices = await Invoice.find(invFilter)
      .populate("client", "nombreComercial tipoCliente")
      .populate({ path: "sale", populate: { path: "assignedTo", select: "name" } })
      .lean();

    for (const inv of invoices) {
      if (clientId && clientId !== "all" && String(inv.client?._id) !== clientId) continue;
      if (tipoCliente && tipoCliente !== "all" && inv.client?.tipoCliente !== tipoCliente) continue;
      
      const assignedTo = inv.sale?.assignedTo?._id || inv.sale?.assignedTo;
      if (executiveId && executiveId !== "all" && String(assignedTo) !== executiveId) continue;

      const paidTotal = (inv.pagos || []).reduce((acc, p) => acc + (p.importe || 0), 0);
      const pagadoSinIVA = paidTotal / 1.16;

      events.push({
        type: "facturada",
        date: new Date(inv.fechaFactura),
        amount: inv.importeSinIVA || 0,
        paid: inv.pagado,
        paidAmount: pagadoSinIVA,
        client: inv.client,
        ejecutivo: inv.sale?.assignedTo?.name || "No asignado",
        ejecutivoId: assignedTo,
      });
    }
  }

  // 2. INTERCAMBIOS (Especie)
  if (!tipoVenta || tipoVenta === "all" || tipoVenta === "intercambio") {
    if (statusPago !== "pendiente") {
      let quoteFilter = {
        status: "aprobada",
        "intercambio.activo": true,
        "intercambio.porcentajeEspecie": { $gt: 0 },
      };

      if (startDate) quoteFilter.approvedAt = { $gte: new Date(startDate) };
      if (endDate) quoteFilter.approvedAt = { ...quoteFilter.approvedAt, $lte: new Date(endDate) };

      let quotes = await Quote.find(quoteFilter)
        .populate("client", "nombreComercial tipoCliente")
        .lean();

      const quoteIds = quotes.map(q => q._id);
      const sales = await Sale.find({ quote: { $in: quoteIds } })
        .populate("assignedTo", "name")
        .lean();
      
      const saleByQuote = {};
      sales.forEach(s => saleByQuote[String(s.quote)] = s);

      for (const q of quotes) {
        if (clientId && clientId !== "all" && String(q.client?._id) !== clientId) continue;
        if (tipoCliente && tipoCliente !== "all" && q.client?.tipoCliente !== tipoCliente) continue;
        
        const sale = saleByQuote[String(q._id)];
        const assignedTo = sale?.assignedTo?._id || sale?.assignedTo;
        if (executiveId && executiveId !== "all" && String(assignedTo) !== executiveId) continue;

        const pEspecie = q.intercambio.porcentajeEspecie || 0;
        const amountEspecie = Number(( (q.total || 0) * (pEspecie / 100) ).toFixed(2));
        const dt = q.approvedAt ? new Date(q.approvedAt) : new Date(q.createdAt);

        events.push({
          type: "intercambio",
          date: dt,
          amount: amountEspecie,
          paid: true,
          paidAmount: amountEspecie,
          client: q.client,
          ejecutivo: sale?.assignedTo?.name || "No asignado",
          ejecutivoId: assignedTo,
        });
      }
    }
  }

  return events.sort((a, b) => b.date - a.date);
}

// ============================================
// REPORTE 1: Ventas mensuales
// ============================================
router.get("/sales-monthly", auth, async (req, res) => {
  try {
    const { startDate, endDate, clientId, tipoCliente, statusPago, tipoVenta } = req.query;

    const events = await getFinancialEvents({ startDate, endDate, clientId, tipoCliente, statusPago, tipoVenta });
    const goals = await SalesGoal.find({});
    const monthlyData = {};

    events.forEach((ev) => {
      const date = ev.date;
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          year,
          month,
          monthName: date.toLocaleString("es-MX", { month: "long" }),
          totalVentas: 0,
          totalFacturado: 0,
          totalIntercambio: 0,
          totalPagado: 0,
          eventos: [],
        };
      }

      monthlyData[monthKey].totalVentas += ev.amount;
      monthlyData[monthKey].totalPagado += ev.paidAmount;

      if (ev.type === "facturada") {
        monthlyData[monthKey].totalFacturado += ev.amount;
      } else {
        monthlyData[monthKey].totalIntercambio += ev.amount;
      }

      monthlyData[monthKey].eventos.push(ev);
    });

    const result = Object.values(monthlyData).map((month) => {
      const goal = goals.find(
        (g) => g.year === month.year && g.month === month.month && !g.assignedTo
      );
      const meta = goal?.goalAmount || 0;
      const diferencia = month.totalVentas - meta;
      const porcentajeCumplimiento = meta > 0 ? (month.totalVentas / meta) * 100 : 0;

      return {
        fecha: `${month.monthName} ${month.year}`,
        totalVentas: month.totalVentas,
        totalFacturado: month.totalFacturado,
        totalIntercambio: month.totalIntercambio,
        totalPagado: month.totalPagado,
        meta,
        diferencia,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
      };
    });

    result.sort((a, b) => {
      const [aMonth, aYear] = a.fecha.split(" ");
      const [bMonth, bYear] = b.fecha.split(" ");
      if (aYear !== bYear) return bYear - aYear;
      const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      return months.indexOf(bMonth) - months.indexOf(aMonth);
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error en reporte ventas mensuales:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// REPORTE 2: Ventas por ejecutivo
// ============================================
router.get("/executive", auth, async (req, res) => {
  try {
    const { startDate, endDate, clientId, executiveId, tipoVenta } = req.query;

    const events = await getFinancialEvents({ startDate, endDate, clientId, executiveId, tipoVenta });
    const goals = await SalesGoal.find({});
    
    const result = [];

    events.forEach((ev) => {
      const fecha = ev.date;
      const fechaStr = fecha.toLocaleDateString("es-MX");
      const ejecutivo = ev.ejecutivo;
      const ejecutivoId = ev.ejecutivoId;
      const cliente = ev.client?.nombreComercial || "N/A";
      const ventasSinIVA = ev.amount;

      // Buscar meta mensual para este ejecutivo
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;
      const goal = goals.find(
        (g) => g.year === year && g.month === month && String(g.assignedTo) === String(ejecutivoId)
      );
      const meta = goal?.goalAmount || 0;

      const porcentajeCumplimiento = meta > 0 ? (ventasSinIVA / meta) * 100 : 0;

      result.push({
        fecha: fechaStr,
        ejecutivo,
        cliente,
        tipoVenta: ev.type,
        ventasSinIVA,
        meta,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
      });
    });

    // Ordenar por fecha descendente
    result.sort((a, b) => {
      const dateA = new Date(a.fecha.split("/").reverse().join("-"));
      const dateB = new Date(b.fecha.split("/").reverse().join("-"));
      return dateB - dateA;
    });

    res.json({ data: result });
  } catch (error) {
    console.error("Error en reporte ejecutivo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// REPORTE 3: Comparativo ventas
// ============================================
router.get("/comparative", auth, async (req, res) => {
  try {
    const {
      periodoBase,
      periodoComparativo,
      tipoCliente,
      ejecutivoId,
      tipoVenta,
      mesBase,
      anioBase,
      mesComp,
      anioComp,
    } = req.query;

    const events = await getFinancialEvents({ tipoCliente, executiveId: ejecutivoId, tipoVenta });

    // ── Determinar rango de cada período ──────────────────────────
    let labelBase, labelComp;
    let isBase, isComp;

    if (periodoBase === "mes-libre" || periodoComparativo === "mes-libre") {
      const yB = parseInt(anioBase);
      const mB = parseInt(mesBase);
      const yC = parseInt(anioComp);
      const mC = parseInt(mesComp);

      const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      labelBase = `${MESES[mB - 1]} ${yB}`;
      labelComp = `${MESES[mC - 1]} ${yC}`;

      isBase = (ev) => ev.date.getFullYear() === yB && ev.date.getMonth() + 1 === mB;
      isComp = (ev) => ev.date.getFullYear() === yC && ev.date.getMonth() + 1 === mC;
    } else if (periodoBase === "mensual" && periodoComparativo === "mensual") {
      const now = new Date();
      const yC = now.getFullYear();
      const yB = yC - 1;
      const m  = now.getMonth() + 1;
      const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      labelBase = `${MESES[m - 1]} ${yB}`;
      labelComp = `${MESES[m - 1]} ${yC}`;

      isBase = (ev) => ev.date.getFullYear() === yB && ev.date.getMonth() + 1 === m;
      isComp = (ev) => ev.date.getFullYear() === yC && ev.date.getMonth() + 1 === m;
    } else {
      const years = [...new Set(events.map(ev => ev.date.getFullYear()))].sort();
      const yC = years.length >= 1 ? years[years.length - 1] : new Date().getFullYear();
      const yB = years.length >= 2 ? years[years.length - 2] : yC - 1;
      labelBase = String(yB);
      labelComp = String(yC);

      isBase = (ev) => ev.date.getFullYear() === yB;
      isComp = (ev) => ev.date.getFullYear() === yC;
    }

    // ── Agrupar por cliente ────────────────────────────────────────
    const salesByClient = new Map();

    events.forEach((ev) => {
      const cliente   = ev.client?.nombreComercial || "N/A";
      const ejecutivo = ev.ejecutivo  || "No asignado";
      const monto     = ev.amount || 0;
      const key       = `${cliente}|${ejecutivo}`;

      if (!salesByClient.has(key))
        salesByClient.set(key, { cliente, ejecutivo, base: 0, comp: 0 });

      const row = salesByClient.get(key);
      if (isBase(ev)) row.base += monto;
      if (isComp(ev)) row.comp += monto;
    });

    // ── Construir resultado ────────────────────────────────────────
    const result = [];
    for (const [, c] of salesByClient) {
      if (c.base === 0 && c.comp === 0) continue;

      const variacionMonto = c.comp - c.base;
      const variacionPorcentaje =
        c.base === 0 && c.comp > 0 ? 1
        : c.base > 0 ? Math.round((variacionMonto / c.base) * 100) / 100
        : 0;

      result.push({
        fecha: `${labelBase} vs ${labelComp}`,
        cliente: c.cliente,
        periodoBase: c.base,
        periodoComparativo: c.comp,
        variacionMonto,
        variacionPorcentaje,
        ejecutivo: c.ejecutivo,
      });
    }

    if (result.length === 0)
      return res.json({ data: [], message: "No hay datos para los filtros seleccionados" });

    result.sort((a, b) => b.variacionPorcentaje - a.variacionPorcentaje);
    res.json({ data: result });

  } catch (error) {
    console.error("Error en reporte comparativo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// REPORTE 4: Publicidad
// ============================================
router.get("/advertising", auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      clientId,
      tipoPublicidad,
      formato
    } = req.query;

    // Construir filtro base para facturas (ventas)
    let invoiceFilter = {};

    if (startDate) {
      invoiceFilter.fechaFactura = { $gte: new Date(startDate) };
    }
    if (endDate) {
      invoiceFilter.fechaFactura = {
        ...invoiceFilter.fechaFactura,
        $lte: new Date(endDate),
      };
    }

    // Obtener facturas con sus relaciones
    let invoices = await Invoice.find(invoiceFilter)
      .populate("client", "nombreComercial tipoCliente")
      .populate({
        path: "sale",
        populate: {
          path: "quote",
          populate: {
            path: "tarifas",
          },
        },
      })
      .lean();

    // Filtrar por cliente específico
    if (clientId && clientId !== "all") {
      invoices = invoices.filter((inv) => String(inv.client._id) === clientId);
    }

    // Procesar cada factura para extraer información de publicidad
    const advertisingData = [];

    invoices.forEach((invoice) => {
      const fecha = new Date(invoice.fechaFactura);
      const fechaStr = fecha.toLocaleDateString("es-MX");
      const cliente = invoice.client?.nombreComercial || "N/A";

      // Obtener información de la cotización
      const quote = invoice.sale?.quote || invoice.quote;

      if (!quote) return;

      // Extraer tarifas (formatos publicitarios)
      const tarifas = quote.tarifas || [];

      // Para cada tarifa, determinar el tipo de publicidad
      tarifas.forEach((tarifa) => {
        // Determinar tipo de publicidad basado en el contexto
        let tipoPublicidadDetectado = "pagada"; // Por defecto

        // Si hay intercambio en la cotización
        if (quote.intercambio?.activo && quote.intercambio.porcentajeEspecie > 0) {
          tipoPublicidadDetectado = "intercambio";
        }

        // Si hay cortesías
        if (quote.cortesias?.activo && quote.cortesias.cantidad > 0) {
          tipoPublicidadDetectado = "cortesias";
        }

        // Si hay desarrollo informativo
        if (quote.desarrolloInformativo?.activo) {
          tipoPublicidadDetectado = "desarrollo_informativo";
        }

        // Obtener formato de la tarifa
        const formatoTarifa = tarifa.formato || "";

        // Aplicar filtros adicionales
        let include = true;

        if (tipoPublicidad && tipoPublicidad !== "all") {
          include = include && (tipoPublicidadDetectado === tipoPublicidad);
        }

        if (formato && formato !== "all") {
          include = include && (formatoTarifa.toLowerCase().includes(formato.toLowerCase()) ||
            formatoTarifa === formato);
        }

        if (include) {
          advertisingData.push({
            fecha: fechaStr,
            cliente,
            tipoPublicidad: tipoPublicidadDetectado,
            formato: formatoTarifa || "No especificado",
          });
        }
      });
    });

    // Ordenar por fecha descendente
    advertisingData.sort((a, b) => {
      const dateA = new Date(a.fecha.split("/").reverse().join("-"));
      const dateB = new Date(b.fecha.split("/").reverse().join("-"));
      return dateB - dateA;
    });

    res.json({ data: advertisingData });
  } catch (error) {
    console.error("Error en reporte publicidad:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// REPORTE 5: Clientes activos
// ============================================
router.get("/active-clients", auth, async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Obtener facturas recientes y clientes en paralelo (consultas independientes)
    const [invoices, allClients] = await Promise.all([
      Invoice.find({ fechaFactura: { $gte: ninetyDaysAgo } })
        .populate("client", "nombreComercial tipoCliente rfc")
        .lean(),
      Client.find({}, "nombreComercial tipoCliente rfc").lean(),
    ]);

    // Agrupar por cliente
    const clientActivity = new Map();

    invoices.forEach((invoice) => {
      if (!invoice.client) return;

      const clientId = String(invoice.client._id);
      const clientName = invoice.client.nombreComercial;
      const clientType = invoice.client.tipoCliente || "No especificado";
      const clientRfc = invoice.client.rfc;
      const invoiceAmount = invoice.importeConIVA || 0;
      const invoiceDate = invoice.fechaFactura;

      if (!clientActivity.has(clientId)) {
        clientActivity.set(clientId, {
          cliente: clientName,
          tipoCliente: clientType,
          rfc: clientRfc,
          ultimaVenta: invoiceDate,
          totalVentas: 0,
          cantidadVentas: 0,
        });
      }

      const client = clientActivity.get(clientId);

      // Actualizar última venta (la más reciente)
      if (invoiceDate > client.ultimaVenta) {
        client.ultimaVenta = invoiceDate;
      }

      client.totalVentas += invoiceAmount;
      client.cantidadVentas += 1;
    });

    // Combinar resultados (allClients ya incluye a los que no tienen ventas)
    const result = allClients.map((client) => {
      const clientId = String(client._id);
      const activity = clientActivity.get(clientId);

      const tieneVentas = !!activity;
      const isActive = tieneVentas && activity.cantidadVentas >= 1;

      return {
        cliente: client.nombreComercial,
        tipoCliente: client.tipoCliente || "No especificado",
        rfc: client.rfc,
        estado: isActive ? "Activo" : "Inactivo",
        ultimaVenta: activity ? new Date(activity.ultimaVenta).toLocaleDateString("es-MX") : "Sin ventas",
        totalVentas: activity ? activity.totalVentas : 0,
        cantidadVentas: activity ? activity.cantidadVentas : 0,
      };
    });

    // Ordenar: primero activos, luego inactivos
    result.sort((a, b) => {
      if (a.estado === "Activo" && b.estado !== "Activo") return -1;
      if (a.estado !== "Activo" && b.estado === "Activo") return 1;
      return b.totalVentas - a.totalVentas;
    });

    res.json({
      data: result,
      resumen: {
        totalClientes: result.length,
        activos: result.filter(c => c.estado === "Activo").length,
        inactivos: result.filter(c => c.estado === "Inactivo").length,
        periodoDias: 90,
      }
    });
  } catch (error) {
    console.error("Error en reporte clientes activos:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// OBTENER CLIENTES PARA FILTROS
// ============================================
router.get("/clients", auth, async (req, res) => {
  try {
    const clients = await Client.find({}, "nombreComercial tipoCliente");
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener clientes" });
  }
});

// ============================================
// OBTENER EJECUTIVOS PARA FILTROS
// ============================================
router.get("/executives", auth, async (req, res) => {
  try {
    const executives = await User.find({ role: { $in: ["WORKER", "OWNER"] } }, "name email role");
    res.json(executives);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener ejecutivos" });
  }
});

// ============================================
// METAS DE VENTAS - OBTENER
// ============================================
router.get("/goals", auth, async (req, res) => {
  try {
    const { year, month, assignedTo } = req.query;
    
    let filter = {};
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    if (assignedTo && assignedTo !== "all") filter.assignedTo = assignedTo;
    
    // Si es OWNER o ADMIN, puede ver todas las metas
    // Si es WORKER, solo ve sus propias metas (o metas generales)
    if (req.user.role === "WORKER") {
      filter.$or = [
        { assignedTo: req.user._id },
        { assignedTo: { $exists: false } }, // metas generales
      ];
    }
    
    const goals = await SalesGoal.find(filter)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .sort({ year: -1, month: -1 });
    
    res.json(goals);
  } catch (error) {
    console.error("Error al obtener metas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ============================================
// METAS DE VENTAS - CREAR/ACTUALIZAR
// ============================================
router.post("/goals", auth, async (req, res) => {
  try {
    const { year, month, goalAmount, assignedTo } = req.body;
    
    if (!year || !month || goalAmount === undefined) {
      return res.status(400).json({ message: "Faltan campos requeridos" });
    }
    
    // Solo OWNER puede modificar metas
    if (req.user.role !== "OWNER") {
      return res.status(403).json({ message: "No tienes permiso para modificar metas" });
    }
    
    // Buscar si ya existe una meta para este periodo
    let goal = await SalesGoal.findOne({
      year: parseInt(year),
      month: parseInt(month),
      assignedTo: assignedTo || null,
    });
    
    if (goal) {
      // Actualizar existente
      goal.goalAmount = goalAmount;
      await goal.save();
    } else {
      // Crear nueva
      goal = await SalesGoal.create({
        year: parseInt(year),
        month: parseInt(month),
        goalAmount,
        assignedTo: assignedTo || null,
        createdBy: req.user._id,
      });
    }
    
    res.json({ 
      success: true, 
      message: "Meta guardada correctamente",
      goal 
    });
  } catch (error) {
    console.error("Error al guardar meta:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;