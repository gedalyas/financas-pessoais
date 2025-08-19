import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Botão hambúrguer (mostrado só no mobile via CSS) */}
      <button
        className="sidebar-toggle"
        onClick={() => setOpen(v => !v)}
        aria-label="Abrir menu"
      >
        ☰
      </button>

      {/* Backdrop */}
      <div
        className={'sidebar-backdrop' + (open ? ' show' : '')}
        onClick={close}
      />

      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="sidebar-brand">Minhas Finanças</div>
        <nav className="nav" onClick={close}>
          <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📒 Dashboard</NavLink>
          <NavLink to="/estatisticas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>📈 Estatísticas</NavLink>
          <NavLink to="/recorrentes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>🔁 Recorrentes</NavLink>
          <NavLink to="/metas" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>🎯 Metas</NavLink>
        </nav>
        <div className="sidebar-footer">Para dúvidas e sugestões: 31 99311-2726</div>
      </aside>
    </>
  );
}
