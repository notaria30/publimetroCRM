// src/services/dashboardService.js
import api from "./api";

export const getDashboardOverview = () => api.get("/dashboard/overview");
export const getDashboardPipeline = () => api.get("/dashboard/pipeline");
export const getDashboardBilling = () => api.get("/dashboard/billing");
export const getDashboardClients = () => api.get("/dashboard/clients");
export const getDashboardQuotes = () => api.get("/dashboard/quotes");
export const getDashboardActiveClients = () => api.get("/reports/active-clients");
