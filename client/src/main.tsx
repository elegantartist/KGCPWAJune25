import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from "./App";
import { AuthProvider } from "@/hooks/useAuth";
import { BadgeAwardProvider } from "@/context/BadgeAwardContext";
import { MotivationalImageProvider } from "@/context/MotivationalImageContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotivationalImageProvider>
          <BadgeAwardProvider>
            <App />
          </BadgeAwardProvider>
        </MotivationalImageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
