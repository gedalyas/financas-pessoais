import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Minhas Finanças</div>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📒 Dashboard</NavLink>
        <NavLink to="/estatisticas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📈 Estatísticas</NavLink>
        <NavLink to="/recorrentes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>🔁 Recorrentes</NavLink>
      </nav>
      <div className="sidebar-footer">Para duvidas e sugestões favor contatar o nosso suporte: 3199311-2726</div>
    </aside>
  );
}
