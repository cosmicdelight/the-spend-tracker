import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Fallback values in case .env is not loaded (these are publishable/anon keys, safe to include)
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL ?? 'https://tfkptixclpsdairmqmvx.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRma3B0aXhjbHBzZGFpcm1xbXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzA1NTUsImV4cCI6MjA4NjgwNjU1NX0.tA5YD0SqTA4dPKXQyzAddUSywCQzEfmT6kV6xEaFBNk'
    ),
    ...(process.env.VITE_DEMO_PASSWORD
      ? { 'import.meta.env.VITE_DEMO_PASSWORD': JSON.stringify(process.env.VITE_DEMO_PASSWORD) }
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
    VitePWA({
      registerType: "autoUpdate",
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
}));
