import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const FALLBACK_SUPABASE_URL = "https://tfkptixclpsdairmqmvx.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3B0aXhjbHBzZGFpcm1xbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzA1NTUsImV4cCI6MjA4NjgwNjU1NX0.tA5YD0SqTA4dPKXQyzAddUSywCQzEfmT6kV6xEaFBNk";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const versionFilePath = path.resolve(process.cwd(), "public/version.json");
  let versionMeta: { version?: string; buildId?: string; buildTime?: string } = {};
  if (fs.existsSync(versionFilePath)) {
    try {
      versionMeta = JSON.parse(fs.readFileSync(versionFilePath, "utf-8"));
    } catch {
      versionMeta = {};
    }
  }

  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  // PWA is on by default so every deploy regenerates sw.js; a stale sw.js left on the
  // host pins installed PWAs to an old build. Set VITE_ENABLE_PWA=false to opt out.
  const enablePwa =
    (env.VITE_ENABLE_PWA || process.env.VITE_ENABLE_PWA || "true").toLowerCase() === "true";

  return {
    define: {
      // These are public values (URL + anon key), and fallback prevents blank-screen boot failures.
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
      __APP_VERSION__: JSON.stringify(versionMeta.version || process.env.npm_package_version || "0.0.0"),
      __APP_BUILD_ID__: JSON.stringify(versionMeta.buildId || "dev"),
      __APP_BUILD_TIME__: JSON.stringify(versionMeta.buildTime || new Date().toISOString()),
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
      VitePWA({
          disable: !enablePwa,
          registerType: "autoUpdate",
          // Work around intermittent Workbox/Terser renderChunk early-exit in CI/local builds.
          minify: false,
          workbox: {
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            navigateFallbackDenylist: [/^\/~oauth/],
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            // No runtimeCaching for Supabase. A NetworkFirst rule here used to cache
            // every *.supabase.co response — including authenticated /rest/v1 rows and
            // /auth/v1 token payloads — in a "supabase-api" cache keyed by URL alone.
            // The signed-in user is carried in the Authorization header, which is not
            // part of the cache key, so on a shared device one account's transactions
            // could be served to the next from disk whenever the network dropped.
            // Nothing cleared it on sign-out either. The precache above still gives the
            // PWA its offline shell; the 5-minute API cache bought almost nothing.
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
