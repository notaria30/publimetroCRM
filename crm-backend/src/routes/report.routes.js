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
      .populate("client", "nombreComercial razonSocial tipoCliente")
      .populate("quote", "folio total")
      .populate({ path: "sale", populate: { path: "assignedTo", select: "name" } })
      .lean();

    for (const inv of invoices) {
      if (clientId && clientId !== "all" && String(inv.client?._id) !== clientId) continue;
      if (tipoCliente && tipoCliente !== "all" && inv.client?.tipoCliente !== tipoCliente) continue;

      const assignedTo = inv.sale?.assignedTo?._id || inv.sale?.assignedTo;
      if (executiveId && executiveId !== "all" && String(assignedTo) !== executiveId) continue;

      const paidTotal = (inv.pagos || []).reduce((acc, p) => acc + (p.importe || 0), 0);
      const pagadoSinIVA = Number((paidTotal / 1.16).toFixed(2));

      // Fecha de pago = fecha del último abono registrado
      const fechasPago = (inv.pagos || [])
        .filter((p) => p.fecha)
        .map((p) => new Date(p.fecha))
        .sort((a, b) => b - a);
      const fechaPago = fechasPago[0] || null;

      events.push({
        type: "facturada",
        date: new Date(inv.fechaFactura),
        amount: inv.importeSinIVA || 0,
        paid: inv.pagado,
        paidAmount: pagadoSinIVA,
        fechaPago,
        client: inv.client,
        razonSocial: inv.client?.razonSocial || inv.client?.nombreComercial || "N/A",
        tipoCliente: inv.client?.tipoCliente || null,
        cotizacion: inv.quote?.folio ?? null,
        cotizacionTotal: inv.quote?.total ?? null, // total cotizado (base para comparativo)
        factura: inv.numeroFactura || null,
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
        .populate("client", "nombreComercial razonSocial tipoCliente")
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
          // El intercambio es en especie: no genera cobro en efectivo
          paid: false,
          paidAmount: 0,
          fechaPago: null,
          client: q.client,
          razonSocial: q.client?.razonSocial || q.client?.nombreComercial || "N/A",
          tipoCliente: q.client?.tipoCliente || null,
          cotizacion: q.folio ?? null,
          cotizacionTotal: q.total ?? 0, // total cotizado (base para comparativo)
          factura: null,
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
    const { startDate, endDate, clientId, tipoCliente, tipoVenta } = req.query;
    // Filtro "Pagado": all | si | no  (se acepta también el legacy statusPago)
    let pagado = req.query.pagado || "all";
    if (pagado === "all" && req.query.statusPago === "pagadas") pagado = "si";
    if (pagado === "all" && req.query.statusPago === "pendiente") pagado = "no";

    let events = await getFinancialEvents({ startDate, endDate, clientId, tipoCliente, tipoVenta });

    if (pagado === "si") events = events.filter((e) => e.paid);
    else if (pagado === "no") events = events.filter((e) => !e.paid);

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

    // ── DETALLE: una fila por venta (facturada / intercambio) ──
    // events ya viene ordenado por fecha descendente desde getFinancialEvents
    const detalle = events.map((ev) => ({
      tipoVenta: ev.type, // "facturada" | "intercambio"
      tipoCliente: ev.tipoCliente || null,
      cliente: ev.razonSocial || "N/A",
      cotizacion: ev.cotizacion ?? null,
      factura: ev.factura || null,
      fecha: ev.date,
      importe: ev.amount || 0,
      importePago: ev.type === "facturada" ? (ev.paidAmount || 0) : null,
      fechaPago: ev.fechaPago || null,
      pagado: !!ev.paid,
    }));

    const totales = {
      importe: detalle.reduce((s, r) => s + (r.importe || 0), 0),
      importePago: detalle.reduce((s, r) => s + (r.importePago || 0), 0),
      registros: detalle.length,
    };

    res.json({ success: true, data: result, detalle, totales });
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
    // Segundo filtro de fecha: por fecha de pago (opcional, independiente)
    const { startDatePago, endDatePago } = req.query;
    // Filtro "Pagado": all | si | no
    let pagado = req.query.pagado || "all";
    if (pagado === "all" && req.query.statusPago === "pagadas") pagado = "si";
    if (pagado === "all" && req.query.statusPago === "pendiente") pagado = "no";

    let events = await getFinancialEvents({ startDate, endDate, clientId, executiveId, tipoVenta });

    if (pagado === "si") events = events.filter((e) => e.paid);
    else if (pagado === "no") events = events.filter((e) => !e.paid);

    // Filtro por fecha de pago
    if (startDatePago || endDatePago) {
      const desde = startDatePago ? new Date(startDatePago) : null;
      const hasta = endDatePago ? new Date(endDatePago) : null;
      events = events.filter((e) => {
        if (!e.fechaPago) return false;
        const fp = new Date(e.fechaPago);
        if (desde && fp < desde) return false;
        if (hasta && fp > hasta) return false;
        return true;
      });
    }

    const goals = await SalesGoal.find({});

    // ── data plana (compatibilidad con gráficas y tabla mensual) ──
    const result = [];
    events.forEach((ev) => {
      const fecha = ev.date;
      const year = fecha.getFullYear();
      const month = fecha.getMonth() + 1;
      const goal = goals.find(
        (g) => g.year === year && g.month === month && String(g.assignedTo) === String(ev.ejecutivoId)
      );
      const meta = goal?.goalAmount || 0;
      result.push({
        fecha: fecha.toLocaleDateString("es-MX"),
        ejecutivo: ev.ejecutivo,
        cliente: ev.client?.nombreComercial || "N/A",
        tipoVenta: ev.type,
        ventasSinIVA: ev.amount,
        meta,
        porcentajeCumplimiento: meta > 0 ? Math.round((ev.amount / meta) * 10000) / 100 : 0,
      });
    });
    result.sort((a, b) => {
      const dateA = new Date(a.fecha.split("/").reverse().join("-"));
      const dateB = new Date(b.fecha.split("/").reverse().join("-"));
      return dateB - dateA;
    });

    // ── grupos: detalle agrupado por ejecutivo (según especificación) ──
    // Meta = meta del ejecutivo para el mes de la fecha inicio (o mes actual).
    // Se lee la parte de fecha del string para no depender de la zona horaria.
    let metaYear, metaMonth;
    const mDate = String(startDate || "").match(/^(\d{4})-(\d{2})/);
    if (mDate) {
      metaYear = Number(mDate[1]);
      metaMonth = Number(mDate[2]);
    } else {
      const now = new Date();
      metaYear = now.getFullYear();
      metaMonth = now.getMonth() + 1;
    }

    const grupoMap = new Map();
    for (const ev of events) {
      const key = ev.ejecutivoId ? String(ev.ejecutivoId) : "sin-asignar";
      if (!grupoMap.has(key)) {
        grupoMap.set(key, {
          ejecutivoId: ev.ejecutivoId ? String(ev.ejecutivoId) : null,
          ejecutivo: ev.ejecutivo || "No asignado",
          facturadas: [],
          intercambios: [],
        });
      }
      const g = grupoMap.get(key);
      if (ev.type === "facturada") {
        g.facturadas.push({
          cliente: ev.razonSocial,
          factura: ev.factura,
          fecha: ev.date,
          importe: ev.amount || 0,
          importePago: ev.paidAmount || 0,
          fechaPago: ev.fechaPago || null,
          pagado: !!ev.paid,
        });
      } else {
        g.intercambios.push({
          cliente: ev.razonSocial,
          cotizacion: ev.cotizacion,
          fecha: ev.date,
          importe: ev.amount || 0,
        });
      }
    }

    const grupos = [...grupoMap.values()].map((g) => {
      const totalFacturado = g.facturadas.reduce((s, r) => s + r.importe, 0);
      const totalFacturadoPago = g.facturadas.reduce((s, r) => s + r.importePago, 0);
      const totalIntercambio = g.intercambios.reduce((s, r) => s + r.importe, 0);
      const totalVentas = totalFacturado + totalIntercambio;
      const goal = goals.find(
        (gl) => gl.year === metaYear && gl.month === metaMonth && String(gl.assignedTo) === String(g.ejecutivoId)
      );
      const meta = goal?.goalAmount || 0;
      return {
        ...g,
        totalFacturado,
        totalFacturadoPago,
        totalIntercambio,
        totalVentas,
        meta,
        porcentajeCumplimiento: meta > 0 ? Math.round((totalVentas / meta) * 10000) / 100 : 0,
      };
    });
    grupos.sort((a, b) => a.ejecutivo.localeCompare(b.ejecutivo, "es"));

    res.json({ data: result, grupos });
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
    const { startDate, endDate, clientId, tipoCliente, tipoVenta } = req.query;
    let pagado = req.query.pagado || "all";
    if (pagado === "all" && req.query.statusPago === "pagadas") pagado = "si";
    if (pagado === "all" && req.query.statusPago === "pendiente") pagado = "no";

    let events = await getFinancialEvents({ startDate, endDate, clientId, tipoCliente, tipoVenta });

    if (pagado === "si") events = events.filter((e) => e.paid);
    else if (pagado === "no") events = events.filter((e) => !e.paid);

    // Detalle: una fila por venta. Base = total cotizado; Final = venta real (facturada
    // sin IVA / monto en especie). Variación = Final − Base.
    const detalle = events.map((ev) => {
      const importeBase = ev.cotizacionTotal || 0;
      const importeFinal = ev.amount || 0;
      const variacionMonto = Number((importeFinal - importeBase).toFixed(2));
      const variacionPorcentaje =
        importeBase > 0
          ? Math.round((variacionMonto / importeBase) * 10000) / 100
          : importeFinal > 0 ? 100 : 0;
      return {
        tipoVenta: ev.type,
        tipoCliente: ev.tipoCliente || null,
        cliente: ev.razonSocial || "N/A",
        cotizacion: ev.cotizacion ?? null,
        factura: ev.factura || null,
        fecha: ev.date,
        importeBase,
        importeFinal,
        variacionMonto,
        variacionPorcentaje,
        importePago: ev.type === "facturada" ? (ev.paidAmount || 0) : null,
        fechaPago: ev.fechaPago || null,
        pagado: !!ev.paid,
      };
    });

    const totBase = detalle.reduce((s, r) => s + r.importeBase, 0);
    const totFinal = detalle.reduce((s, r) => s + r.importeFinal, 0);
    const totVar = Number((totFinal - totBase).toFixed(2));
    const totales = {
      importeBase: totBase,
      importeFinal: totFinal,
      variacionMonto: totVar,
      variacionPorcentaje: totBase > 0 ? Math.round((totVar / totBase) * 10000) / 100 : 0,
      importePago: detalle.reduce((s, r) => s + (r.importePago || 0), 0),
      registros: detalle.length,
    };

    res.json({ data: detalle, totales });
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
    const clients = await Client.find({}, "nombreComercial razonSocial tipoCliente").sort({ razonSocial: 1 });
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