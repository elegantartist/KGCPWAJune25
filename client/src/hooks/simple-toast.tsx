import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  title: string;
  description: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning';
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  toast: (props: Omit<ToastMessage, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((props: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...props, id };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    if (props.duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, props.duration || 5000);
    }
    
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    return null;
  }
  
  const { toasts, dismiss } = context;
  
  if (toasts.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-4 max-w-md">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`rounded-md shadow-lg p-4 ${
            toast.variant === 'destructive' 
              ? 'bg-red-600 text-white' 
              : toast.variant === 'warning'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-white text-gray-900 border'
          } transition-all duration-300 transform`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{toast.title}</h4>
              <div className="mt-1 text-sm">{toast.description}</div>
            </div>
            <button 
              onClick={() => dismiss(toast.id)}
              className="ml-4 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export function useSimpleToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useSimpleToast must be used within a ToastProvider');
  }
  
  return context;
}