import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getPackageName = (id: string) => {
  const normalizedId = id.replace(/\\/g, "/");
  const nodeModulesIndex = normalizedId.lastIndexOf("/node_modules/");

  if (nodeModulesIndex === -1) {
    return undefined;
  }

  const packagePath = normalizedId.slice(nodeModulesIndex + "/node_modules/".length);
  const segments = packagePath.split("/");

  return packagePath.startsWith("@") ? `${segments[0]}/${segments[1]}` : segments[0];
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("commonjsHelpers")) {
            return "vendor-common";
          }

          const packageName = getPackageName(id);

          if (!packageName) {
            return;
          }

          if (["react", "react-dom", "react-router-dom", "scheduler"].includes(packageName)) {
            return "vendor-react";
          }

          if (packageName === "@tanstack/react-query") {
            return "vendor-query";
          }

          if (
            packageName === "recharts" ||
            packageName === "react-smooth" ||
            packageName === "react-resize-detector" ||
            packageName === "recharts-scale" ||
            packageName === "victory-vendor" ||
            packageName.startsWith("d3-")
          ) {
            return "vendor-charts";
          }

          if (packageName.startsWith("@radix-ui/") || packageName === "cmdk" || packageName === "vaul") {
            return "vendor-radix";
          }

          if (packageName === "framer-motion") {
            return "vendor-motion";
          }

          if (packageName === "lucide-react") {
            return "vendor-icons";
          }

          if (packageName === "date-fns") {
            return "vendor-date";
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
});
