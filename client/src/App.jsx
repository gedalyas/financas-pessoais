// client/src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TransactionsPage from './pages/Transactions';
import StatsPage from './pages/Stats';
import RecurrencesPage from './pages/Recurrences';
import GoalsPage from './pages/Goals';
import AuthPage from './pages/Auth';
import ResetPasswordPage from './pages/ResetPassword';
import LimitsPage from './pages/Limits';

function isAuthed() {
  return Boolean(localStorage.getItem('pf_token'));
}

function ProtectedRoute() {
  if (!isAuthed()) return <Navigate to="/auth" replace />;
  return <Outlet />;
}

function LayoutWithSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loc = useLocation();

  // fecha a sidebar ao trocar de rota (experiência melhor no mobile)
  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);

  return (
    <div className="app-shell">
      {/* Botão hambúrguer (mostra só em <=900px pelo CSS) */}
      <button
        className="sidebar-toggle"
        aria-label="Abrir menu"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      {/* Backdrop para clicar fora e fechar */}
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' show' : '')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* Sidebar controlada */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutWithSidebar />}>
          <Route path="/" element={<TransactionsPage />} />
          <Route path="/estatisticas" element={<StatsPage />} />
          <Route path="/recorrentes" element={<RecurrencesPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/limites" element={<LimitsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthed() ? '/' : '/auth'} replace />} />
    </Routes>
  );
}
