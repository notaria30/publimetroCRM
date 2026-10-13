// src/services/saleLifecycle.service.js
//
// Efectos automáticos del ciclo de vida de una venta.
//
// Regla:
//   - "isClosed" es el cierre COMERCIAL de la venta (se factura o se cierra a mano).
//     Es independiente de "executionStage", que solo refleja el avance operativo
//     (validación → diseño → programado → publicado → testigos enviados).
//   - Al convertir una cotización en venta se genera su campaña (planificada).
//   - Al cerrar la venta se abre su registro de post-venta.
// Ambas operaciones son idempotentes: no duplican registros.

const Sale = require("../models/Sale");
const Quote = require("../models/Quote");
const Campaign = require("../models/Campaign");
const PostSale = require("../models/PostSale");
const { updateClientStatus } = require("./clientStatus.service");

/**
 * Crea el registro de post-venta de la venta si aún no existe.
 */
async function ensurePostSale(sale) {
  const exists = await PostSale.exists({ sale: sale._id });
  if (exists) return null;
  return PostSale.create({ sale: sale._id });
}

/**
 * Cierra comercialmente la venta (si no lo estaba), refresca el estatus del
 * cliente (regla de los 90 días) y abre su post-venta.
 */
async function closeSale(sale) {
  if (!sale) return;
  if (!sale.isClosed) {
    sale.isClosed = true;
    sale.closedAt = new Date();
    await sale.save();
  }
  await updateClientStatus(sale.client);
  await ensurePostSale(sale);
}

function datesRange(dates) {
  const valid = dates
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a - b);
  return { fechaInicio: valid[0], fechaFin: valid[valid.length - 1] };
}

/**
 * Genera la campaña de la venta a partir de los espacios de su cotización.
 */
async function createCampaignForSale(sale, userId) {
  if (!sale.quote) return null;

  const exists = await Campaign.exists({ sale: sale._id });
  if (exists) return null;

  const quote = await Quote.findById(sale.quote);
  if (!quote) return null;

  const espacios = [];

  (quote.tarifas || []).forEach((t) => {
    espacios.push({
      tipo: "tarifa",
      seccion: t.seccion || "",
      formato: t.formato || "",
      cantidad: (t.fechas || []).length,
      precio: t.totalLinea || 0,
      fechas: t.fechas || [],
    });
  });

  (quote.activaciones || [])
    .filter((a) => a && a.activo)
    .forEach((a) => {
      espacios.push({
        tipo: "activacion",
        formato: a.tipo || "",
        cantidad: a.cantidad || 0,
        precio: a.total || 0,
        fechas: a.fechas || [],
      });
    });

  if (quote.cortesias?.activo) {
    espacios.push({
      tipo: "otro",
      seccion: quote.cortesias.seccion || "Cortesías",
      formato: quote.cortesias.formato || "",
      cantidad: quote.cortesias.cantidad || 0,
      precio: 0,
      fechas: quote.cortesias.fechas || [],
    });
  }

  const { fechaInicio, fechaFin } = datesRange(espacios.flatMap((e) => e.fechas));

  return Campaign.create({
    client: sale.client,
    sale: sale._id,
    quote: quote._id,
    nombre: `Campaña ${sale.folio} · Cotización #${quote.folio}`,
    fechaInicio,
    fechaFin,
    espacios,
    formatos: [...new Set((quote.tarifas || []).map((t) => t.formato).filter(Boolean))],
    periodicidad: quote.tarifas?.[0]?.periodicidad || "",
    status: "planificada",
    createdBy: userId,
  });
}

module.exports = { closeSale, ensurePostSale, createCampaignForSale };
