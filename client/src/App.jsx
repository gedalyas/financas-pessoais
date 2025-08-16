import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TransactionsPage from './pages/Transactions';
import StatsPage from './pages/Stats';
import RecurrencesPage from './pages/Recurrences'; // << novo

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<TransactionsPage />} />
          <Route path="/estatisticas" element={<StatsPage />} />
          <Route path="/recorrentes" element={<RecurrencesPage />} /> {/* novo */}
          <Route path="*" element={<TransactionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
