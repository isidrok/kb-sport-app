import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [preact(), basicSsl()],
  server: {
    https: {},
    host: "0.0.0.0", // This allows access from other devices on the network
  },
});
