import api from "./api";

export const getUsers = () => api.get("/auth/users");
export const createWorker    = (data)     => api.post("/auth/create-worker", data);
export const updateUser      = (id, data) => api.put(`/auth/users/${id}`, data);
export const deleteUser      = (id)       => api.delete(`/auth/users/${id}`);
