import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.tsx";

// PR #37 — Vercel Web Analytics. Mounted at the root so it counts
// visits across every surface (marketing landing at /, the app at
// /app, and the /press pages). Cookieless and privacy-preserving by
// default — no consent banner required, POPIA-friendly. Data shows up
// in the Vercel dashboard under the project's Analytics tab once
// this is deployed AND Analytics is enabled for the project there.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
