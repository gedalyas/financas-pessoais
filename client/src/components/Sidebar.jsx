// client/src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export default function Sidebar({ open = false, onClose }) {
  const nav = useNavigate();

  function logout() {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    nav('/auth');
    onClose?.();
  }

  const closeOnClick = () => onClose?.();

  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <div className="sidebar-brand">Minhas Finanças</div>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          📒 Dashboard
        </NavLink>
        <NavLink to="/estatisticas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          📈 Estatísticas
        </NavLink>
        <NavLink to="/recorrentes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          🔁 Recorrentes
        </NavLink>
        <NavLink to="/metas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          🎯 Metas
        </NavLink>

        <button className="nav-item logout-btn" onClick={logout}>
          🚪 Sair
        </button>
      </nav>
      <div className="sidebar-footer">
        Para duvidas e sugestões favor contatar o nosso suporte: 3199311-2726
      </div>
    </aside>
  );
}
