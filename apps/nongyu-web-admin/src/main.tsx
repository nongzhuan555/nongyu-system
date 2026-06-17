import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

const App = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold">Nongyu Web Admin</h1>
    <p className="mt-4">Welcome to the management system.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
