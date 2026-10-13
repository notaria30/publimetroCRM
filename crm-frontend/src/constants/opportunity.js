// Catálogos del pipeline de oportunidades (deben coincidir con
// crm-backend/src/models/Opportunity.js).

export const STAGES = [
  { id: "prospeccion", label: "Prospección" },
  { id: "propuesta", label: "Propuesta" },
  { id: "negociacion", label: "Negociación" },
  { id: "cerrado_ganado", label: "Cerrado Ganado" },
  { id: "cerrado_perdido", label: "Cerrado Perdido" },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));

export const MOTIVOS_PERDIDA = [
  "Precio",
  "Sin presupuesto",
  "Eligió a la competencia",
  "Sin respuesta del cliente",
  "Fechas / disponibilidad",
  "Otro",
];

export const isClosedStage = (stage) =>
  stage === "cerrado_ganado" || stage === "cerrado_perdido";

