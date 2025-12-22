// client/src/components/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Logo from '../assets/prospera_logo.png';

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
    <aside className={'sidebar' + (open ? ' open' : '')} aria-label="Menu lateral">
      {/* Header da sidebar (apenas brand; sem botão X) */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img src={Logo} alt="Logo da marca" className="brand-logo" />
          <span>Minhas Finanças</span>
        </div>
      </div>

      <nav className="nav" role="navigation">
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
        <NavLink to="/limites" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          💳 Limites
        </NavLink>
        <NavLink to="/investimentos" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          💰 Investimentos
        </NavLink>
        <NavLink to="/configuracoes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')} onClick={closeOnClick}>
          ⚙️ Configurações
        </NavLink>

        <button type="button" className="nav-item logout-btn" onClick={logout}>
          🚪 Sair
        </button>
      </nav>

      <div className="sidebar-footer">
        Para dúvidas e sugestões favor contatar o nosso suporte: 3199311-2726
      </div>
    </aside>
  );
}
