// Shim global for libraries that expect it
Object.defineProperty(window, "global", { value: window });

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import "./index.css";
import App from "./App.tsx";

console.log("[DietCode:Bootstrap] Bundle execution started");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[DietCode:Bootstrap] Root element '#root' not found in document");
  throw new Error("Root element not found");
}

try {
  console.log("[DietCode:Bootstrap] Mounting React root...");
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log("[DietCode:Bootstrap] Initial render triggered");
} catch (error) {
  console.error("[DietCode:Bootstrap] Fatal error during initialization:", error);
}
