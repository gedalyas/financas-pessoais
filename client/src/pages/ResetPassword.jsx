// client/src/pages/ResetPassword.jsx
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.prosperafinancas.com';

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const emailParam = sp.get('email') || '';
  const tokenParam = sp.get('token') || '';

  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [msg, setMsg] = useState('');

  async function onSubmit(e){
    e.preventDefault();
    if (pass !== pass2) { setMsg('Senhas não conferem.'); return; }
    const res = await fetch(`${API_URL}/api/auth/reset`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password: pass })
    });
    const j = await res.json().catch(()=> ({}));
    if (res.ok) {
      localStorage.setItem('pf_token', j.token || '');
      localStorage.setItem('pf_user', JSON.stringify(j.user || {}));
      nav('/');
    } else {
      setMsg(j.error || 'Falha ao redefinir senha.');
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden />
      <div className="auth-card">
        <div className="auth-brand"><div className="auth-logo">🔐</div><div className="auth-name">Redefinir senha</div></div>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-field">
            <span>E-mail</span>
            <input className="auth-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Token</span>
            <input className="auth-input" value={token} onChange={(e)=>setToken(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Nova senha</span>
            <input className="auth-input" type="password" value={pass} onChange={(e)=>setPass(e.target.value)} required />
          </label>
          <label className="auth-field">
            <span>Confirmar senha</span>
            <input className="auth-input" type="password" value={pass2} onChange={(e)=>setPass2(e.target.value)} required />
          </label>
          {msg && <div className="auth-error">⚠ {msg}</div>}
          <button className="auth-btn primary">Redefinir e entrar</button>
        </form>
      </div>
    </div>
  );
}
