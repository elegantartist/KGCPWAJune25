import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { BadgeAwardProvider } from "@/context/BadgeAwardContext";
import { MotivationalImageProvider } from "@/context/MotivationalImageContext"; // Added import
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <MotivationalImageProvider> {/* Added provider */}
        <BadgeAwardProvider>
          <App />
        </BadgeAwardProvider>
      </MotivationalImageProvider>
    </AuthProvider>
  </React.StrictMode>
);
