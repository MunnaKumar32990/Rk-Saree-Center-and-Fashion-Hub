import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite config.
 *
 * Two important changes:
 *
 * 1. Production builds now FAIL if VITE_API_URL is missing.
 *    Vite inlines `import.meta.env.*` at build time, so a deploy without the
 *    env var silently shipped a bundle hardcoded to
 *    `http://localhost:5000/api` — every request fails, with no build error and
 *    no runtime warning. Failing the build turns a silent production outage into
 *    an obvious deployment failure.
 *
 * 2. `jspdf` and `recharts` are moved into lazy chunks.
 *    `OrderDetails.jsx` statically imported jspdf and `AdminDashboard.jsx`
 *    statically imported recharts, which pulled a PDF library and a charting
 *    library into the entry chunk that every first-time visitor downloads —
 *    before they have even seen a product. On a budget Android phone over 4G
 *    that is the difference between a page that renders and one that doesn't.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (mode === "production" && !env.VITE_API_URL) {
    throw new Error(
      "\nVITE_API_URL is required for a production build.\n" +
        "Set it in your deployment environment, e.g. VITE_API_URL=https://api.example.com/api\n"
    );
  }

  if (mode === "production" && /^http:\/\/localhost/i.test(env.VITE_API_URL || "")) {
    throw new Error(
      "\nVITE_API_URL points at localhost in a production build. " +
        "This will ship a bundle that cannot reach your API.\n"
    );
  }

  return {
    plugins: [react()],

    build: {
      // Reasonable ceiling; the point is to catch accidental bloat.
      chunkSizeWarningLimit: 600,
      target: "es2020",

      // Images and fonts are content-hashed and cacheable for a year.
      assetsInlineLimit: 4096,

      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            // React core — changes rarely, caches for a long time.
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
              return "vendor-react";
            }
            // PDF generation — only reachable from the order-details route.
            if (/node_modules\/(jspdf|html2canvas|dompurify|canvg|fflate)\//.test(id)) {
              return "vendor-pdf";
            }
            // SEO head manager.
            if (/node_modules\/(react-helmet|react-helmet-async|react-side-effect)\//.test(id)) {
              return "vendor-seo";
            }
            if (/node_modules\/(react-hot-toast|react-icons|@radix-ui)\//.test(id)) {
              return "vendor-ui";
            }
            if (/node_modules\/(axios|follow-redirects|form-data|proxy-from-env)\//.test(id)) {
              return "vendor-http";
            }
            // Anything else large becomes its own chunk instead of bloating
            // the entry bundle.
            if (id.includes("node_modules")) return "vendor-misc";
            return undefined;
          },
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },

    server: {
      port: 5173,
      // Proxying /api in dev avoids CORS entirely and means the app works
      // locally even if VITE_API_URL isn't set.
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },

    preview: { port: 4173 },
  };
});