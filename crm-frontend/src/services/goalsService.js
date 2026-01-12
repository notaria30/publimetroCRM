import api from "./api";

export const getWorkers = () => api.get("/goals/workers");
export const upsertGoal = (payload) => api.post("/goals", payload);
export const getGoals = () => api.get("/goals");
