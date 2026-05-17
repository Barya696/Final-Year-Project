import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

console.log("[Main] - Initializing React app");

const container = document.getElementById('root');
if (!container) {
  console.error("[Main] - Root element not found!");
} else {
  console.log("[Main] - Root element found, creating React root");
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
  console.log("[Main] - React app rendered");
}
