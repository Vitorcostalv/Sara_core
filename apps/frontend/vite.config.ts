import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5180,
    // Falha alto se a 5180 estiver ocupada, em vez de escorregar pra 5181 (que o
    // CORS do backend bloqueia). O predev libera a porta antes, então não conflita.
    strictPort: true
  }
});
