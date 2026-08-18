// src/services/clientStatus.service.js
//
// Lógica de negocio centralizada para el estatus automático del cliente.
//
// Regla:
//   - "prospecto"  → nunca ha tenido una venta cerrada (isClosed = true)
//   - "activo"     → tiene al menos 1 venta cerrada con closedAt en los últimos 90 días
//   - "inactivo"   → tiene ventas cerradas, pero ninguna dentro de los últimos 90 días

const Client = require("../models/Client");
const Sale = require("../models/Sale");

const DAYS_WINDOW = 90;

/**
 * Evalúa el estatus de UN cliente y lo actualiza en base de datos.
 *
 * @param {string|ObjectId} clientId  - ID del cliente a evaluar.
 * @returns {Promise<{ clientId, previousStatus, newStatus, updated: boolean }>}
 */
async function updateClientStatus(clientId) {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error(`Cliente no encontrado: ${clientId}`);
  }

  const previousStatus = client.status;

  // Buscar TODAS las ventas cerradas del cliente
  const closedSales = await Sale.find({
    client: clientId,
    isClosed: true,
  }).select("closedAt");

  let newStatus;

  if (closedSales.length === 0) {
    // Sin ninguna venta cerrada → Prospecto
    newStatus = "prospecto";
  } else {
    // Verificar si alguna venta fue cerrada en los últimos 90 días
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_WINDOW);

    const hasRecentSale = closedSales.some(
      (sale) => sale.closedAt && sale.closedAt >= cutoffDate
    );

    newStatus = hasRecentSale ? "activo" : "inactivo";
  }

  const updated = previousStatus !== newStatus;

  if (updated) {
    client.status = newStatus;
    await client.save();
  }

  return { clientId, previousStatus, newStatus, updated };
}

/**
 * Recorre TODOS los clientes y actualiza su estatus según la regla de 90 días.
 * Pensado para ser ejecutado por el cron diario o el endpoint manual.
 *
 * @returns {Promise<{ total, updated, results[] }>}
 */
async function refreshAllClientStatuses() {
  const clients = await Client.find().select("_id status");

  const results = [];
  let updatedCount = 0;

  for (const client of clients) {
    try {
      const result = await updateClientStatus(client._id);
      results.push(result);
      if (result.updated) updatedCount++;
    } catch (err) {
      console.error(`[clientStatus] Error evaluando cliente ${client._id}:`, err.message);
      results.push({ clientId: client._id, error: err.message });
    }
  }

  return { total: clients.length, updated: updatedCount, results };
}

module.exports = { updateClientStatus, refreshAllClientStatuses, DAYS_WINDOW };
