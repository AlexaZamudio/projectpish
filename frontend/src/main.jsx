import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Admin from './pages/Admin.jsx';
import Participante from './pages/Participante.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/participante" element={<Participante />} />
        {/* Cualquier otra ruta lleva a la vista del participante */}
        <Route path="*" element={<Navigate to="/participante" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
