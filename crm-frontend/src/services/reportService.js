import api from "./api";

// Reporte de ventas con filtros
export const getSalesReport = (params) =>
  api.get("/reports/sales", { params });

// Proyecciones
export const getProjections = () =>
  api.get("/reports/projections");

// Clientes activos
export const getActiveClients = () =>
  api.get("/reports/clientes-activos");

// Publicidad
export const getPublicidadReport = () =>
  api.get("/reports/publicidad");

// Activaciones
export const getActivacionesReport = () =>
  api.get("/reports/activaciones");

// Analytics
export const getAnalytics = () =>
  api.get("/reports/analytics");

// Metas vendedores
export const getMetas = (params) => api.get("/reports/metas", { params });

