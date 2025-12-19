import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    // necessário pro Cloudflare Tunnel não bloquear o host
    allowedHosts: true,
  },
});
