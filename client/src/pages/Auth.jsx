// client/src/pages/Auth.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AuthPage() {
  const nav = useNavigate();
  const [tab, setTab] = useState('login');

  // login/register fields
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [pass, setPass]   = useState('');
  const [pass2, setPass2] = useState('');
  const [purchaseToken, setPurchaseToken] = useState(''); // << NOVO

  // ui state
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Forgot password
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpMsg, setFpMsg] = useState('');
  const [fpLink, setFpLink] = useState(''); // guarda dev_link sem quebrar layout

  function saveSession(token, profile) {
    localStorage.setItem('pf_token', token || '');
    if (profile) localStorage.setItem('pf_user', JSON.stringify(profile));
  }

  function mapErrorToMsg(code) {
    const map = {
      purchase_token_required: 'Informe o token de compra para concluir o cadastro.',
      invalid_purchase_token:  'Token de compra inválido.',
      token_revoked:           'Este token foi revogado.',
      token_expired:           'Este token expirou.',
      token_exhausted:         'Este token atingiu o limite de uso.',
      token_email_mismatch:    'Este token está vinculado a outro e-mail.',
      token_race_condition:    'Token já utilizado simultaneamente. Tente outro token.',
      'E-mail já cadastrado.': 'E-mail já cadastrado.',
    };
    return map[code] || code || 'Falha ao criar conta';
  }

  async function onLogin(e) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const j = await res.json().catch(()=> ({}));
      if (!res.ok) { setErr(j.error || 'Falha ao entrar'); return; }
      saveSession(j.token, j.user);
      nav('/');
    } finally { setLoading(false); }
  }

  async function onRegister(e) {
    e.preventDefault();
    setErr('');
    if (pass !== pass2) { setErr('Senhas não conferem.'); return; }
    if (!purchaseToken.trim()) { setErr('Informe o token de compra.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: pass,
          purchase_token: purchaseToken.trim(), // << ENVIA TOKEN
        })
      });
      const j = await res.json().catch(()=> ({}));
      if (!res.ok) {
        setErr(mapErrorToMsg(j.error));
        return;
      }
      saveSession(j.token, j.user);
      nav('/');
    } finally { setLoading(false); }
  }

  async function onForgot(e) {
    e.preventDefault();
    setFpMsg('Enviando…');
    setFpLink('');
    const res = await fetch(`${API_URL}/api/auth/forgot`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fpEmail })
    });
    const j = await res.json().catch(()=> ({}));
    if (res.ok) {
      setFpMsg(j.dev_link
        ? 'Link de redefinição (modo dev) gerado abaixo.'
        : 'Se o e-mail existir, enviaremos um link de redefinição.'
      );
      if (j.dev_link) setFpLink(j.dev_link);
    } else {
      setFpMsg(j.error || 'Falha ao solicitar redefinição.');
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">💸</div>
          <div className="auth-name">Minhas Finanças</div>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            className={'auth-tab' + (tab === 'login' ? ' is-active' : '')}
            onClick={() => { setTab('login'); setErr(''); }}
          >
            Entrar
          </button>
          <button
            className={'auth-tab' + (tab === 'register' ? ' is-active' : '')}
            onClick={() => { setTab('register'); setErr(''); }}
          >
            Criar conta
          </button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={onLogin}>
            <label className="auth-field">
              <span>E-mail</span>
              <input className="auth-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <div className="auth-input has-icon">
                <input type={show ? 'text' : 'password'} value={pass} onChange={(e)=>setPass(e.target.value)} required />
                <button type="button" className="auth-eye" onClick={()=>setShow(s=>!s)}>{show ? '🙈' : '👁️'}</button>
              </div>
            </label>

            {err && <div className="auth-error">⚠ {err}</div>}

            <button className="auth-btn primary" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>

            <div className="auth-minor" style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
              <Link to="#" onClick={(e)=>{e.preventDefault(); setFpOpen(true); setFpEmail(email);}}>Esqueci minha senha</Link>
            </div>

            {fpOpen && (
              <div className="auth-form" style={{marginTop:10}}>
                <div className="auth-field">
                  <span>Seu e-mail</span>
                  <input className="auth-input" type="email" value={fpEmail} onChange={(e)=>setFpEmail(e.target.value)} required />
                </div>
                <button className="auth-btn" onClick={onForgot} type="button">Enviar link de redefinição</button>

                {fpMsg && <div className="auth-info">{fpMsg}</div>}

                {fpLink && (
                  <div className="dev-link" style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                    <code className="code-clip" title={fpLink}>{fpLink}</code>
                    <button
                      type="button"
                      className="auth-btn"
                      onClick={() => navigator.clipboard.writeText(fpLink)}
                      style={{width:'auto', padding:'10px 12px'}}
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          <form className="auth-form" onSubmit={onRegister}>
            <label className="auth-field">
              <span>Nome</span>
              <input className="auth-input" value={name} onChange={(e)=>setName(e.target.value)} required />
            </label>
            <label className="auth-field">
              <span>E-mail</span>
              <input className="auth-input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </label>
            <label className="auth-field">
              <span>Senha</span>
              <div className="auth-input has-icon">
                <input type={show ? 'text' : 'password'} value={pass} onChange={(e)=>setPass(e.target.value)} required />
                <button type="button" className="auth-eye" onClick={()=>setShow(s=>!s)}>{show ? '🙈' : '👁️'}</button>
              </div>
            </label>
            <label className="auth-field">
              <span>Confirmar senha</span>
              <input className="auth-input" type="password" value={pass2} onChange={(e)=>setPass2(e.target.value)} required />
            </label>

            {/* NOVO: Token de compra */}
            <label className="auth-field">
              <span>Token de compra</span>
              <input
                className="auth-input"
                value={purchaseToken}
                onChange={(e)=>setPurchaseToken(e.target.value)}
                placeholder="Cole aqui o token recebido após a compra"
                required
              />
            </label>

            {err && <div className="auth-error">⚠ {err}</div>}
            <button className="auth-btn primary" disabled={loading}>{loading ? 'Criando…' : 'Criar conta'}</button>
          </form>
        )}

        <div className="auth-footer">
          Ao continuar, você concorda com os <a href="#">Termos</a> e <a href="#">Política de Privacidade</a>.
        </div>
      </div>
    </div>
  );
}
