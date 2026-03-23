import api from "./api";

// ============================================
// REPORTE 1: Ventas mensuales
// ============================================
export const getSalesMonthlyReport = (params) => {
  return api.get("/reports/sales-monthly", { params });
};

// ============================================
// REPORTE 2: Ventas por ejecutivo
// ============================================
export const getExecutiveReport = (params) => {
  return api.get("/reports/executive", { params });
};

// ============================================
// REPORTE 3: Comparativo ventas
// ============================================
export const getComparativeReport = (params) => {
  return api.get("/reports/comparative", { params });
};

// ============================================
// REPORTE 4: Publicidad
// ============================================
export const getAdvertisingReport = (params) => {
  return api.get("/reports/advertising", { params });
};

// ============================================
// REPORTE 5: Clientes activos
// ============================================
export const getActiveClientsReport = () => {
  return api.get("/reports/active-clients");
};

// ============================================
// SERVICIOS COMUNES (filtros)
// ============================================
export const getReportClients = () => {
  return api.get("/reports/clients");
};

export const getReportExecutives = () => {
  return api.get("/reports/executives");
};

// ============================================
// METAS DE VENTAS
// ============================================
export const getSalesGoals = (params) => {
  return api.get("/reports/goals", { params });
};

export const createOrUpdateGoal = (data) => {
  return api.post("/reports/goals", data);
};