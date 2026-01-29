/**
 * @fileoverview Vite Configuration for Shopify App Frontend
 *
 * This module configures the Vite build tool for the React frontend.
 * It handles development server settings, proxying requests to the backend,
 * and defining environment variables for the frontend application.
 *
 * Key Configurations:
 * - React Plugin: Enables React support including Fast Refresh
 * - Proxy: Routes /api requests to the backend Express server
 * - HMR: Configures Hot Module Replacement for local and cloud environments
 * - Environment: Injects SHOPIFY_API_KEY into the frontend
 *
 * @module vite.config
 * @requires vite
 * @requires @vitejs/plugin-react
 */

import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

// Warn if building without API key (except in CI)
if (
  process.env.npm_lifecycle_event === "build" &&
  !process.env.CI &&
  !process.env.SHOPIFY_API_KEY
) {
  console.warn(
    "\nBuilding the frontend app without an API key. The frontend build will not run without an API key. Set the SHOPIFY_API_KEY environment variable when running the build command.\n"
  );
}

/**
 * Proxy configuration for backend requests
 * Redirects API calls to the local Express server
 *
 * @constant {Object}
 */
const proxyOptions = {
  target: `http://127.0.0.1:${process.env.BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false,
};

// Determine host URL (local or cloud)
const host = process.env.HOST
  ? process.env.HOST.replace(/https?:\/\//, "")
  : "localhost";

// Configure Hot Module Replacement (HMR) based on environment
let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: process.env.FRONTEND_PORT,
    clientPort: 443,
  };
}

/**
 * Export Vite configuration
 */
export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  define: {
    "process.env.SHOPIFY_API_KEY": JSON.stringify(process.env.SHOPIFY_API_KEY),
  },
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    host: "localhost",
    port: process.env.FRONTEND_PORT,
    hmr: hmrConfig,
    proxy: {
      "^/(\\?.*)?$": proxyOptions,
      "^/api(/|(\\?.*)?$)": proxyOptions,
    },
  },
});
