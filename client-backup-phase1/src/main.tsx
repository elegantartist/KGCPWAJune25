import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ToastProvider } from "@/hooks/simple-toast";
import * as serviceWorkerRegistration from "@/lib/serviceWorkerRegistration";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);

// PERMANENTLY DISABLED: Service worker has been completely removed
// The application now requires an internet connection to function properly
// This was done to ensure application stability after multiple issues with offline mode
console.log('Service worker permanently disabled for application stability');
serviceWorkerRegistration.unregister();
