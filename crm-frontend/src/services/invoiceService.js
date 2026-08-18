import api from "./api";

export const getInvoices = () => api.get("/invoices");
export const getInvoiceById = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post("/invoices", data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);
export const getSalesInvoiceStatus = () =>
  api.get("/invoices/sales-status", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
export const getQuoteInvoiceLimit = (quoteId) =>
  api.get(`/invoices/quote-limit/${quoteId}`);
