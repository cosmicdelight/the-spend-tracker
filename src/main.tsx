import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { purgeUserDataCaches } from "./lib/userDataCaches";
import "./index.css";

/** Never leave the user on a blank page because a wedged Cache API will not settle. */
const BOOT_PURGE_TIMEOUT_MS = 1000;

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Installs created by older builds still carry a "supabase-api" cache holding another
// session's rows. Clear it before the app can read anything, rather than racing it.
void Promise.race([
  purgeUserDataCaches(),
  new Promise<void>((resolve) => setTimeout(resolve, BOOT_PURGE_TIMEOUT_MS)),
]).then(renderApp, renderApp);

// The worker controlling this load may still be an older build carrying the caching
// rule, which would re-populate the cache after the purge above. Purge again when a new
// worker takes over, so the first visit after an upgrade also ends up clean.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void purgeUserDataCaches();
  });
}
