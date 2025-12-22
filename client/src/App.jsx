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
import InvestPage from './pages/invest';
import Config from './pages/Config';

function isAuthed() {
  return Boolean(localStorage.getItem('pf_token'));
}

function ProtectedRoute() {
  const location = useLocation();
  if (!isAuthed()) {
    // envia a rota atual em `state.from` para pós-login voltar para cá
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Apenas para rotas públicas de autenticação: se já estiver logado, manda pra home (ou para `from`)
function UnauthOnly() {
  const location = useLocation();
  if (isAuthed()) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
}

function LayoutWithSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const loc = useLocation();

  // fecha a sidebar ao trocar de rota (melhor UX no mobile)
  useEffect(() => { setSidebarOpen(false); }, [loc.pathname]);

  return (
    <div className="app-shell">
      {/* Botão hambúrguer (visível no mobile via CSS) */}
      <button
        className="sidebar-toggle"
        aria-label="Abrir menu"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>

      {/* Backdrop para fechar clicando fora */}
      <div
        className={'sidebar-backdrop' + (sidebarOpen ? ' show' : '')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* Sidebar controlada (certifique-se de que o componente usa `open` para aplicar a classe `.open`) */}
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
      {/* Rotas públicas de auth. Se já estiver logado, redireciona para a rota anterior ou `/` */}
      <Route element={<UnauthOnly />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>
      {/* Reset pode ficar público mesmo logado */}
      <Route path="/auth/reset" element={<ResetPasswordPage />} />

      {/* Rotas protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<LayoutWithSidebar />}>
          <Route path="/" element={<TransactionsPage />} />
          <Route path="/estatisticas" element={<StatsPage />} />
          <Route path="/recorrentes" element={<RecurrencesPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/limites" element={<LimitsPage />} />
          <Route path="/investimentos" element={<InvestPage />} />
          <Route path="/configuracoes" element={<Config />} />
        </Route>
      </Route>

      {/* Fallback: manda para a home (que é protegida) ou para /auth se não tiver token */}
      <Route path="*" element={<Navigate to={isAuthed() ? '/' : '/auth'} replace />} />
    </Routes>
  );
}
