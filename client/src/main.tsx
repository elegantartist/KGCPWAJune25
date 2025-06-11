import React from "react";
import { createRoot } from "react-dom/client";
import TestApp from "./TestApp";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(<TestApp />);

// PERMANENTLY DISABLED: Service worker has been completely removed
// The application now requires an internet connection to function properly
// This was done to ensure application stability after multiple issues with offline mode
console.log('Service worker permanently disabled for application stability');
serviceWorkerRegistration.unregister();
