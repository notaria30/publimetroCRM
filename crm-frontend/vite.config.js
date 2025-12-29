import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  
  // Configuración del servidor de desarrollo
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000", // tu backend dev
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Para que funcione bien en producción (Nginx)
  build: {
    outDir: "dist",
  },
});
