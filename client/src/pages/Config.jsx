// client/src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');

  const [msg, setMsg] = useState(null); // {type:'success'|'error'|'info', text:string}

  const token = localStorage.getItem('pf_token') || '';

  function notify(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function fetchMe() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/settings/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        notify('error', 'Sessão expirada. Faça login novamente.');
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao carregar perfil');
      }

      setName(data.name || '');
      setEmail(data.email || '');
    } catch (e) {
      notify('error', e.message || 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveName(e) {
    e?.preventDefault();
    if (!name.trim()) return notify('error', 'O nome não pode ficar vazio.');
    try {
      setSavingName(true);
      const res = await fetch(`${API_URL}/api/settings/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error === 'invalid_name' ? 'Nome inválido.' : 'Falha ao salvar nome.');
      }
      try {
        const u = JSON.parse(localStorage.getItem('pf_user') || '{}');
        localStorage.setItem('pf_user', JSON.stringify({ ...u, name: name.trim() }));
      } catch {}
      notify('success', 'Nome atualizado com sucesso!');
    } catch (e) {
      notify('error', e.message || 'Falha ao atualizar nome.');
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e) {
    e?.preventDefault();
    if (!currPass || !newPass) return notify('error', 'Preencha as senhas.');
    if (newPass.length < 6) return notify('error', 'A nova senha deve ter pelo menos 6 caracteres.');
    if (newPass !== newPass2) return notify('error', 'As senhas não conferem.');

    try {
      setChangingPass(true);
      const res = await fetch(`${API_URL}/api/settings/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currPass,
          new_password: newPass
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map = {
          invalid_payload: 'Envie a senha atual e a nova senha.',
          weak_password: 'A nova senha é muito curta.',
          current_password_mismatch: 'Senha atual incorreta.',
          not_found: 'Usuário não encontrado.',
          db_error: 'Erro no banco de dados.'
        };
        throw new Error(map[j?.error] || 'Falha ao alterar senha.');
      }
      setCurrPass('');
      setNewPass('');
      setNewPass2('');
      notify('success', 'Senha alterada com sucesso!');
    } catch (e) {
      notify('error', e.message || 'Falha ao alterar senha.');
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <div className="container page">
      <div className="header">
        <h1 className="title">Configurações</h1>
      </div>

      {msg && (
        <div
          className="card"
          role="status"
          aria-live="polite"
          style={{
            borderColor:
              msg.type === 'success' ? '#bbf7d0' : msg.type === 'error' ? '#fecaca' : '#e5e7eb',
            background:
              msg.type === 'success' ? '#f0fdf4' : msg.type === 'error' ? '#fef2f2' : '#ffffff'
          }}
        >
          {msg.text}
        </div>
      )}

      <div className="form" aria-busy={loading ? 'true' : 'false'}>
        <h2 className="page title" style={{ fontSize: 18 }}>Perfil</h2>
        <div className="form-grid">
          <div>
            <label className="helper">Nome</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              disabled={loading}
            />
          </div>
          <div>
            <label className="helper">E-mail (somente leitura)</label>
            <input className="input" value={email} disabled readOnly />
          </div>
        </div>
        <div className="header-actions" style={{ marginTop: 12 }}>
          <button className="button button-success" onClick={saveName} disabled={savingName || loading}>
            {savingName ? 'Salvando...' : 'Salvar nome'}
          </button>
        </div>
      </div>

      <div className="form">
        <h2 className="page title" style={{ fontSize: 18 }}>Trocar senha</h2>
        <div className="form-grid">
          <div>
            <label className="helper">Senha atual</label>
            <input
              className="input"
              type="password"
              value={currPass}
              onChange={(e) => setCurrPass(e.target.value)}
              placeholder="Sua senha atual"
            />
          </div>
          <div>
            <label className="helper">Nova senha</label>
            <input
              className="input"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="helper">Confirmar nova senha</label>
            <input
              className="input"
              type="password"
              value={newPass2}
              onChange={(e) => setNewPass2(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
        </div>

        <div className="header-actions" style={{ marginTop: 12 }}>
          <button className="button button-success" onClick={changePassword} disabled={changingPass}>
            {changingPass ? 'Alterando...' : 'Alterar senha'}
          </button>
        </div>
      </div>
    </div>
  );
}
