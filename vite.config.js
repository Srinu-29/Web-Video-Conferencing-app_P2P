import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/Web-Video-Conferencing-app_P2P/",
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
