import api from "./api";

export const getOpportunities = () => {
  return api.get("/opportunities");
};

export const getOpportunityById = (id) => {
  return api.get(`/opportunities/${id}`);
};

export const createOpportunity = (data) => {
  return api.post("/opportunities", data);
};

// extra: { motivoPerdida, comentarioPerdida } al cerrar como perdida
export const updateOpportunityStage = (id, stage, extra = {}) => {
  return api.patch(`/opportunities/${id}/stage`, { stage, ...extra });
};

export const convertOpportunityToSale = (id) => {
  return api.post(`/opportunities/${id}/convert-to-sale`);
};

export const deleteOpportunity = (id) => {
  return api.delete(`/opportunities/${id}`);
};
