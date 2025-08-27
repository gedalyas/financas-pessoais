// client/src/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('pf_token') || '';
  const location = useLocation();

  if (!token) {
    // sem token -> manda para /auth
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // com token -> libera as rotas filhas
  return <Outlet />;
}
