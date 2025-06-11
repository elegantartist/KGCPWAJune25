import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Simple test component to verify React is working
function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#2E8BC0' }}>Keep Going Care</h1>
      <p>React frontend is now working!</p>
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{ 
            backgroundColor: '#2E8BC0', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
          onClick={() => window.location.href = '/temp'}
        >
          Backend Test Interface
        </button>
        <button 
          style={{ 
            backgroundColor: '#2E8BC0', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            margin: '10px'
          }}
          onClick={() => fetch('/api/health').then(r => r.json()).then(d => alert(JSON.stringify(d)))}
        >
          Test API
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(<TestApp />);
