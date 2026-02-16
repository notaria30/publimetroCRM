import api from "./api";

// Reporte de ventas con filtros
export const getSalesReport = (params) =>
  api.get("/reports/sales", { params });

// Proyecciones
export const getProjections = (options = {}) =>
  api.get("/reports/projections", options);

// Clientes activos
export const getActiveClients = () =>
  api.get("/reports/clientes-activos");

// Publicidad
export const getPublicidadReport = (options = {}) =>
  api.get("/reports/publicidad", options);

// Activaciones
export const getActivacionesReport = (options = {}) =>
  api.get("/reports/activaciones", options);

// Analytics
export const getAnalytics = () =>
  api.get("/reports/analytics");

// Metas vendedores
export const getMetas = (params) => api.get("/reports/metas", { params });

