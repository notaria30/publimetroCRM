// src/jobs/statusCron.js
//
// Job programado diario que actualiza el estatus de todos los clientes
// según la regla de los 90 días definida en clientStatus.service.js.
//
// Horario: todos los días a las 02:00 AM (hora del servidor).

const cron = require("node-cron");
const { refreshAllClientStatuses } = require("../services/clientStatus.service");

function startStatusCron() {
  // Expresión cron: segundos(0) minutos(0) hora(2) * * *  → 02:00 AM diario
  cron.schedule("0 2 * * *", async () => {
    console.log(`[statusCron] Iniciando evaluación de estatus de clientes... ${new Date().toISOString()}`);
    try {
      const { total, updated } = await refreshAllClientStatuses();
      console.log(`[statusCron] Evaluación completada. Total: ${total} | Actualizados: ${updated}`);
    } catch (err) {
      console.error("[statusCron] Error durante la evaluación de estatus:", err.message);
    }
  });

  console.log("[statusCron] Job de estatus de clientes registrado (02:00 AM diario).");
}

module.exports = { startStatusCron };
