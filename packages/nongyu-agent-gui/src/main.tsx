import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => (
  <div>
    <h1>Nongyu Agent GUI</h1>
    <p>Visual interface for Nongyu Agent.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
