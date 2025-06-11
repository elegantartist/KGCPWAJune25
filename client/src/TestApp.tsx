import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Keep Going Care</h1>
      <p>Application is loading...</p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => window.location.href = '/login'}>
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default TestApp;