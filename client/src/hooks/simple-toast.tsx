import React, { createContext, useContext, useState, ReactNode } from "react";

type ToastContextType = {
  message: string | null;
  showToast: (msg: string, timeout?: number) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = (msg: string, timeout = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), timeout);
  };

  return (
    <ToastContext.Provider value={{ message, showToast }}>
      {children}
      {message && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            padding: "0.5rem 1rem",
            background: "#333",
            color: "#fff",
            borderRadius: "8px",
            zIndex: 1000
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useSimpleToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useSimpleToast must be used within a ToastProvider");
  }
  return ctx;
}
