// client/src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TransactionsPage from './pages/Transactions';
import StatsPage from './pages/Stats';
import RecurrencesPage from './pages/Recurrences';
import GoalsPage from './pages/Goals';
import AuthPage from './pages/Auth'; 
import ResetPasswordPage from './pages/ResetPassword';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<TransactionsPage />} />
          <Route path="/estatisticas" element={<StatsPage />} />
          <Route path="/recorrentes" element={<RecurrencesPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/auth" element={<AuthPage />} /> 
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          <Route path="*" element={<TransactionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
