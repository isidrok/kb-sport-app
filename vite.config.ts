import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: "/kb-sport-app/",
  plugins: [preact()],
});
