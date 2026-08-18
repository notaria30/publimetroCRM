const express = require("express");
const Invoice = require("../models/Invoice");
const Client = require("../models/Client");
const Quote = require("../models/Quote");
const Sale = require("../models/Sale");
const { auth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Crear factura
router.post("/", auth, async (req, res) => {
  try {
    const {
      client,
      quote,
      sale,
      numeroFactura,
      fechaFactura,
      importeSinIVA,
      importeConIVA,
      metodoPago,
      formaPago,
      pagos,
    } = req.body;

    // Asegurarnos de que importeSinIVA sea número
    const base = Number(importeSinIVA);

    if (Number.isNaN(base)) {
      return res.status(400).json({
        message: "importeSinIVA debe ser un número válido",
      });
    }

    // Validar método de pago (SAT): PUE o PPD
    const allowedMetodoPago = ["PUE", "PPD"];
    if (metodoPago && !allowedMetodoPago.includes(metodoPago)) {
      return res.status(400).json({
        message: "metodoPago debe ser 'PUE' o 'PPD'",
      });
    }

    // Calculamos el importe con IVA (si no viene especificado manualmente)
    let finalImporteConIVA = Number(importeConIVA);
    if (Object.is(finalImporteConIVA, NaN) || importeConIVA === undefined || importeConIVA === null || importeConIVA === "") {
      finalImporteConIVA = Number((base * 1.16).toFixed(2));
    }


    // Validar cliente
    const clientData = await Client.findById(client);
    if (!clientData) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // Validar cotización
    const quoteData = await Quote.findById(quote);
    if (!quoteData) {
      return res.status(404).json({ message: "Cotización no encontrada" });
    }

    // --- LÓGICA DE INTERCAMBIO (Validación de tope máximo) ---
    let tieneIntercambio = false;
    let importeIntercambio = 0;
    let porcentajeEfectivoAplicado = 100;

    if (quoteData.intercambio && quoteData.intercambio.activo) {
      tieneIntercambio = true;
      porcentajeEfectivoAplicado = quoteData.intercambio.porcentajeEfectivo || 0;
      
      // El máximo en efectivo que se puede facturar
      const maxAllowedCash = Number((quoteData.total * (porcentajeEfectivoAplicado / 100)).toFixed(2));
      importeIntercambio = Number((quoteData.total - maxAllowedCash).toFixed(2));
      
      // Sumar facturas existentes para esta cotización
      const existingInvoices = await Invoice.find({ quote });
      const alreadyInvoiced = existingInvoices.reduce((acc, inv) => acc + (inv.importeSinIVA || 0), 0);
      
      // + 0.05 de tolerancia por redondeos
      if (alreadyInvoiced + base > maxAllowedCash + 0.05) {
        return res.status(400).json({ 
          message: `El monto excede el límite de efectivo permitido por intercambio. Tope en efectivo: $${maxAllowedCash}. Ya facturado: $${alreadyInvoiced}. Disponible: $${Math.max(0, maxAllowedCash - alreadyInvoiced).toFixed(2)}.` 
        });
      }
    }

    const finalFormaPago = formaPago || quoteData.formaPago || "";
    const saleData = await Sale.findOne({ quote });

    const factura = await Invoice.create({
      client,
      rfc: clientData.rfc,
      quote,
      sale: sale || saleData?._id || null,
      numeroFactura,
      fechaFactura,
      importeSinIVA: base,
      importeConIVA: finalImporteConIVA,
      metodoPago: metodoPago || "PUE",
      formaPago: finalFormaPago,
      pagos: pagos || [],
      createdBy: req.user._id,
      tieneIntercambio,
      importeIntercambio,
      porcentajeEfectivoAplicado,
    });
    // 👈 Buscar la venta: primero por saleId enviado, luego por quote
    let targetSale = saleData;
    if (sale) {
      targetSale = await Sale.findById(sale);
    }

    if (factura.pagado && targetSale) {
      targetSale.paid = true;
      targetSale.paidAt = new Date();
      await targetSale.save();

      if (targetSale.opportunityId) {
        const Opportunity = require("../models/Opportunity");
        await Opportunity.findByIdAndUpdate(targetSale.opportunityId, { stage: "cerrado_ganado" });
      }
    }

    res.status(201).json({
      message: "Factura creada correctamente",
      factura,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.numeroFactura) {
      return res.status(400).json({ message: "Ya existe una factura registrada con este mismo número." });
    }
    console.error("Error al crear factura:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Listar facturas
router.get("/", auth, async (req, res) => {
  try {
    let invoices;

    if (req.user.role === "OWNER") {
      invoices = await Invoice.find()
        .populate("client", "nombreComercial rfc")
        .populate("quote", "folio total")
        .populate("createdBy", "name email");
    } else {
      invoices = await Invoice.find({ createdBy: req.user._id })
        .populate("client", "nombreComercial rfc")
        .populate("quote", "folio total")
        .populate("createdBy", "name email");
    }

    res.json(invoices);
  } catch (error) {
    console.error("Error al obtener facturas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ✅ Ventas facturadas (para filtros en Sales)
router.get("/sales-status", auth, async (req, res) => {
  try {
    // Traer solo sale y quote (ligas)
    const invoices = await Invoice.find({}, "sale quote");

    const saleIds = new Set();
    const quoteIds = new Set();

    invoices.forEach((inv) => {
      if (inv.sale) saleIds.add(String(inv.sale));
      if (inv.quote) quoteIds.add(String(inv.quote));
    });

    res.json({
      saleIds: Array.from(saleIds),
      quoteIds: Array.from(quoteIds),
    });
  } catch (error) {
    console.error("Error en sales-status:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ✅ Límite de facturación por intercambio para una cotización
router.get("/quote-limit/:quoteId", auth, async (req, res) => {
  try {
    const quoteData = await Quote.findById(req.params.quoteId);
    if (!quoteData) return res.status(404).json({ message: "Cotización no encontrada" });

    // Sin intercambio: límite es el total completo
    if (!quoteData.intercambio || !quoteData.intercambio.activo) {
      return res.json({
        tieneIntercambio: false,
        totalCotizacion: quoteData.total,
        maxAllowedCash: quoteData.total,
        importeIntercambio: 0,
        porcentajeEfectivo: 100,
        alreadyInvoiced: 0,
        disponible: quoteData.total,
      });
    }

    const porcentajeEfectivo = quoteData.intercambio.porcentajeEfectivo || 0;
    const maxAllowedCash = Number((quoteData.total * (porcentajeEfectivo / 100)).toFixed(2));
    const importeIntercambio = Number((quoteData.total - maxAllowedCash).toFixed(2));

    const existingInvoices = await Invoice.find({ quote: req.params.quoteId });
    const alreadyInvoiced = Number(
      existingInvoices.reduce((acc, inv) => acc + (inv.importeSinIVA || 0), 0).toFixed(2)
    );
    const disponible = Number(Math.max(0, maxAllowedCash - alreadyInvoiced).toFixed(2));

    res.json({
      tieneIntercambio: true,
      totalCotizacion: quoteData.total,
      maxAllowedCash,
      importeIntercambio,
      porcentajeEfectivo,
      alreadyInvoiced,
      disponible,
    });
  } catch (error) {
    console.error("Error al obtener límite de cotización:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("client", "nombreComercial rfc")
      .populate("quote", "folio total")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    if (req.user.role === "WORKER" && invoice.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "No tienes permiso para ver esta factura" });
    }

    res.json(invoice);
  } catch (error) {
    console.error("Error al obtener factura:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    if (
      req.user.role === "WORKER" &&
      invoice.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "No tienes permiso para actualizar esta factura" });
    }

    // --- LÓGICA DE INTERCAMBIO (Validación de tope máximo en edición) ---
    if (req.body.importeSinIVA !== undefined) {
      const quoteData = await Quote.findById(invoice.quote);
      if (quoteData && quoteData.intercambio && quoteData.intercambio.activo) {
        const porcentajeEfectivoAplicado = quoteData.intercambio.porcentajeEfectivo || 0;
        const maxAllowedCash = Number((quoteData.total * (porcentajeEfectivoAplicado / 100)).toFixed(2));
        
        // Sumar facturas existentes excluyendo esta misma
        const existingInvoices = await Invoice.find({ quote: invoice.quote, _id: { $ne: invoice._id } });
        const alreadyInvoiced = existingInvoices.reduce((acc, inv) => acc + (inv.importeSinIVA || 0), 0);
        const nuevoImporte = Number(req.body.importeSinIVA) || 0;
        
        if (alreadyInvoiced + nuevoImporte > maxAllowedCash + 0.05) {
          return res.status(400).json({ 
            message: `El monto excede el límite de efectivo permitido por intercambio. Tope en efectivo: $${maxAllowedCash}. Ya facturado (otras facturas): $${alreadyInvoiced}. Disponible: $${Math.max(0, maxAllowedCash - alreadyInvoiced).toFixed(2)}.` 
          });
        }
        
        // Actualizar datos del intercambio en caso de que hayan cambiado
        req.body.tieneIntercambio = true;
        req.body.importeIntercambio = Number((quoteData.total - maxAllowedCash).toFixed(2));
        req.body.porcentajeEfectivoAplicado = porcentajeEfectivoAplicado;
      }
    }

    // Aplicar cambios
    invoice.set(req.body);

    // ✅ .save() SÍ dispara pre("save") → recalcula pagado y saldoPendiente
    const updated = await invoice.save();

    // Sincronizar pago con la venta si correspondiera
    if (updated.pagado && updated.sale) {
      const Sale = require("../models/Sale");
      const targetSale = await Sale.findById(updated.sale);
      if (targetSale && !targetSale.paid) {
        targetSale.paid = true;
        targetSale.paidAt = new Date();
        await targetSale.save();

        if (targetSale.opportunityId) {
          const Opportunity = require("../models/Opportunity");
          await Opportunity.findByIdAndUpdate(targetSale.opportunityId, { stage: "cerrado_ganado" });
        }
      }
    }

    res.json({
      message: "Factura actualizada correctamente",
      updated,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.numeroFactura) {
      return res.status(400).json({ message: "Ya existe una factura registrada con este mismo número." });
    }
    console.error("Error al actualizar factura:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }

    if (req.user.role !== "OWNER") {
      return res.status(403).json({ message: "Solo el dueño puede eliminar facturas" });
    }

    await invoice.deleteOne();

    res.json({ message: "Factura eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});
module.exports = router;