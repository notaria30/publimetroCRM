const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth.middleware");
const Invoice = require("../models/Invoice");
const Sale = require("../models/Sale");
const Client = require("../models/Client");
const SalesGoal = require("../models/SalesGoal");
const User = require("../models/User");

// ============================================
// REPORTE 1: Ventas mensuales
// ============================================
router.get("/sales-monthly", auth, async (req, res) => {
  try {
    const { startDate, endDate, clientId, tipoCliente, statusPago } = req.query;

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

    if (statusPago === "pagadas") {
      invoiceFilter.pagado = true;
    } else if (statusPago === "pendiente") {
      invoiceFilter.pagado = false;
    }

    let invoices = await Invoice.find(invoiceFilter)
      .populate("client", "nombreComercial tipoCliente")
      .populate("quote", "total")
      .lean();

    if (clientId && clientId !== "all") {
      invoices = invoices.filter((inv) => String(inv.client._id) === clientId);
    }

    if (tipoCliente && tipoCliente !== "all") {
      invoices = invoices.filter(
        (inv) => inv.client?.tipoCliente === tipoCliente
      );
    }

    const goals = await SalesGoal.find({});

    const monthlyData = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.fechaFactura);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          year,
          month,
          monthName: date.toLocaleString("es-MX", { month: "long" }),
          totalVentas: 0,
          totalPagado: 0,
          facturas: [],
        };
      }

      monthlyData[monthKey].totalVentas += invoice.importeConIVA || 0;

      if (invoice.pagado && invoice.importePago) {
        monthlyData[monthKey].totalPagado += invoice.importePago;
      } else if (invoice.pagado) {
        monthlyData[monthKey].totalPagado += invoice.importeConIVA || 0;
      }

      monthlyData[monthKey].facturas.push(invoice);
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
        meta,
        diferencia,
        porcentajeCumplimiento: Math.round(porcentajeCumplimiento * 100) / 100,
        totalPagado: month.totalPagado,
      };
    });

    result.sort((a, b) => {
      const [aMonth, aYear] = a.fecha.split(" ");
      const [bMonth, bYear] = b.fecha.split(" ");
      if (aYear !== bYear) return bYear - aYear;
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
      ];
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
    const { startDate, endDate, clientId, executiveId } = req.query;

    // Construir filtro para facturas
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

    // Obtener facturas con datos de cliente y venta
    let invoices = await Invoice.find(invoiceFilter)
      .populate("client", "nombreComercial tipoCliente")
      .populate("sale")
      .populate({
        path: "sale",
        populate: {
          path: "assignedTo",
          select: "name email",
        },
      })
      .populate("quote", "total")
      .lean();

    // Filtrar por cliente específico
    if (clientId && clientId !== "all") {
      invoices = invoices.filter((inv) => String(inv.client._id) === clientId);
    }

    // Filtrar por ejecutivo específico
    if (executiveId && executiveId !== "all") {
      invoices = invoices.filter((inv) => {
        const assignedTo = inv.sale?.assignedTo?._id || inv.sale?.assignedTo;
        return assignedTo && String(assignedTo) === executiveId;
      });
    }

    // Obtener metas mensuales por ejecutivo (si existen)
    const goals = await SalesGoal.find({});

    // Agrupar por ejecutivo y fecha
    const result = [];

    invoices.forEach((invoice) => {
      const fecha = new Date(invoice.fechaFactura);
      const fechaStr = fecha.toLocaleDateString("es-MX");
      const ejecutivo = invoice.sale?.assignedTo?.name || "No asignado";
      const ejecutivoId = invoice.sale?.assignedTo?._id || null;
      const cliente = invoice.client?.nombreComercial || "N/A";
      const ventasSinIVA = invoice.importeSinIVA || 0;

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
// REPORTE 3: Comparativo ventas (VERSIÓN CORREGIDA)
// ============================================
router.get("/comparative", auth, async (req, res) => {
  try {
    const { 
      periodoBase,      // "mensual" o "anual"
      periodoComparativo, // "mensual" o "anual"
      tipoCliente,
      ejecutivoId 
    } = req.query;

    // Obtener todas las facturas
    let invoices = await Invoice.find({})
      .populate("client", "nombreComercial tipoCliente")
      .populate({
        path: "sale",
        populate: {
          path: "assignedTo",
          select: "name email",
        },
      })
      .lean();

    // Filtrar por tipo de cliente
    if (tipoCliente && tipoCliente !== "all") {
      invoices = invoices.filter((inv) => inv.client?.tipoCliente === tipoCliente);
    }

    // Filtrar por ejecutivo
    if (ejecutivoId && ejecutivoId !== "all") {
      invoices = invoices.filter((inv) => {
        const assignedTo = inv.sale?.assignedTo?._id || inv.sale?.assignedTo;
        return assignedTo && String(assignedTo) === ejecutivoId;
      });
    }

    // Obtener años únicos de las facturas
    const years = new Set();
    invoices.forEach(inv => {
      const year = new Date(inv.fechaFactura).getFullYear();
      years.add(year);
    });
    const sortedYears = Array.from(years).sort();
    
    // Determinar años a comparar
    let yearBase, yearComparativo;
    let yearBaseLabel, yearComparativoLabel;
    
    if (periodoBase === "anual" && periodoComparativo === "anual") {
      if (sortedYears.length >= 2) {
        // Usar los dos últimos años con datos
        yearComparativo = sortedYears[sortedYears.length - 1];
        yearBase = sortedYears[sortedYears.length - 2];
        yearBaseLabel = yearBase;
        yearComparativoLabel = yearComparativo;
      } else if (sortedYears.length === 1) {
        // Solo hay un año con datos, comparar con el año anterior (sin datos)
        yearComparativo = sortedYears[0];
        yearBase = sortedYears[0] - 1;
        yearBaseLabel = yearBase;
        yearComparativoLabel = yearComparativo;
      } else {
        // No hay datos, usar años actuales
        yearComparativo = new Date().getFullYear();
        yearBase = yearComparativo - 1;
        yearBaseLabel = yearBase;
        yearComparativoLabel = yearComparativo;
      }
    }

    // Agrupar ventas por cliente y año
    const salesByClient = new Map();

    invoices.forEach((invoice) => {
      const fecha = new Date(invoice.fechaFactura);
      const year = fecha.getFullYear();
      const cliente = invoice.client?.nombreComercial || "N/A";
      const ejecutivo = invoice.sale?.assignedTo?.name || "No asignado";
      const monto = invoice.importeConIVA || 0;
      
      const clientKey = `${cliente}|${ejecutivo}`;
      
      if (!salesByClient.has(clientKey)) {
        salesByClient.set(clientKey, {
          cliente,
          ejecutivo,
          ventasPorAnio: {},
        });
      }
      
      const client = salesByClient.get(clientKey);
      client.ventasPorAnio[year] = (client.ventasPorAnio[year] || 0) + monto;
    });

    // Construir resultado
    const result = [];

    for (const [_, client] of salesByClient) {
      const ventasBase = client.ventasPorAnio[yearBase] || 0;
      const ventasComparativo = client.ventasPorAnio[yearComparativo] || 0;
      
      // Solo mostrar si hay datos en al menos un período
      if (ventasBase > 0 || ventasComparativo > 0) {
        const variacionMonto = ventasComparativo - ventasBase;
        let variacionPorcentaje = 0;
        
        if (ventasBase === 0 && ventasComparativo > 0) {
          variacionPorcentaje = 1; // 100% crecimiento (desde cero)
        } else if (ventasBase > 0) {
          variacionPorcentaje = variacionMonto / ventasBase;
        }
        
        result.push({
          fecha: `${yearBaseLabel} vs ${yearComparativoLabel}`,
          cliente: client.cliente,
          periodoBase: ventasBase,
          periodoComparativo: ventasComparativo,
          variacionMonto,
          variacionPorcentaje: Math.round(variacionPorcentaje * 100) / 100,
          ejecutivo: client.ejecutivo,
        });
      }
    }

    // Si no hay resultados, agregar un mensaje informativo
    if (result.length === 0) {
      return res.json({ 
        data: [],
        message: "No hay datos para los filtros seleccionados"
      });
    }

    // Ordenar por variación porcentual descendente
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

    // Obtener todas las facturas de los últimos 90 días
    const invoices = await Invoice.find({
      fechaFactura: { $gte: ninetyDaysAgo },
    })
      .populate("client", "nombreComercial tipoCliente rfc")
      .lean();

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

    // Obtener todos los clientes (incluyendo los que no tienen ventas)
    const allClients = await Client.find({}, "nombreComercial tipoCliente rfc").lean();

    // Combinar resultados
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