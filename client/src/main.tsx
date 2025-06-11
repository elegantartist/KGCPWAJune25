import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import { ToastProvider } from "@/hooks/simple-toast";
import * as serviceWorkerRegistration from "@/lib/serviceWorkerRegistration";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);

// PERMANENTLY DISABLED: Service worker has been completely removed
// The application now requires an internet connection to function properly
// This was done to ensure application stability after multiple issues with offline mode
console.log('Service worker permanently disabled for application stability');
serviceWorkerRegistration.unregister();
