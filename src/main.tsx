import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { purgeUserDataCaches } from "./lib/userDataCaches";
import "./index.css";

// Installs created by older builds still carry a "supabase-api" cache holding another
// session's rows. Purge it on boot so upgrading is enough to clear it.
void purgeUserDataCaches();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
