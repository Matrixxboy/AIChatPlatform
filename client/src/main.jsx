import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/ai-chat-platform/sw.js")
      .then((reg) => {
        console.log("Service Worker registered:", reg.scope);
      })
      .catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
  });
}
