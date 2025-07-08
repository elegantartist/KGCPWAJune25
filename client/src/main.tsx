import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { BadgeAwardProvider } from "@/context/BadgeAwardContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BadgeAwardProvider>
        <App />
      </BadgeAwardProvider>
    </AuthProvider>
  </React.StrictMode>
);
