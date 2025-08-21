import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const nav = useNavigate();
  function logout() {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    nav('/auth');
  }
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Minhas Finanças</div>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📒 Dashboard</NavLink>
        <NavLink to="/estatisticas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📈 Estatísticas</NavLink>
        <NavLink to="/recorrentes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>🔁 Recorrentes</NavLink>
        <NavLink to="/metas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>🎯 Metas</NavLink>
        <button className="nav-item" onClick={logout} style={{ textAlign: 'left', marginTop: 8 }}>🚪 Sair</button>
      </nav>
      <div className="sidebar-footer">Para duvidas e sugestões favor contatar o nosso suporte: 3199311-2726</div>
    </aside>
  );
}
