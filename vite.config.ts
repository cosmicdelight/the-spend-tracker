import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const FALLBACK_SUPABASE_URL = "https://tfkptixclpsdairmqmvx.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3B0aXhjbHBzZGFpcm1xbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzA1NTUsImV4cCI6MjA4NjgwNjU1NX0.tA5YD0SqTA4dPKXQyzAddUSywCQzEfmT6kV6xEaFBNk";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  const demoPassword = env.VITE_DEMO_PASSWORD || process.env.VITE_DEMO_PASSWORD;
  const enablePwa =
    (env.VITE_ENABLE_PWA || process.env.VITE_ENABLE_PWA || "false").toLowerCase() === "true";

  return {
    define: {
      // These are public values (URL + anon key), and fallback prevents blank-screen boot failures.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      ...(demoPassword
        ? { "import.meta.env.VITE_DEMO_PASSWORD": JSON.stringify(demoPassword) }
        : {}),
    },
    optimizeDeps: {
      force: false,
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      enablePwa &&
        VitePWA({
          registerType: "autoUpdate",
          // Work around intermittent Workbox/Terser renderChunk early-exit in CI/local builds.
          minify: false,
          workbox: {
            navigateFallbackDenylist: [/^\/~oauth/],
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: "NetworkFirst",
                options: {
                  cacheName: "supabase-api",
                  expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                },
              },
            ],
          },
          manifest: {
            name: "SpendTracker",
            short_name: "SpendTracker",
            description: "Track your spending and manage credit cards",
            theme_color: "#4f46e5",
            background_color: "#f5f6fa",
            display: "standalone",
            start_url: "/",
            icons: [
              {
                src: "/pwa-icon-192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: "/pwa-icon-512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any maskable",
              },
            ],
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
