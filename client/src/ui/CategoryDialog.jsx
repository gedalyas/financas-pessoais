// client/src/ui/CategoryDialog.jsx
import React, { useEffect, useState } from 'react';
import Modal from './Modal';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.prosperafinancas.com';

function getToken() {
  return localStorage.getItem('pf_token') || '';
}

export default function CategoryDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(''); // vazio => backend escolhe automático
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setName(''); setColor(''); setErr(''); }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Informe um nome.'); return; }

    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          ...(color.trim() ? { color: color.trim() } : {}),
        }),
      });

      const j = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setErr('⚠ Autenticação obrigatória. Faça login novamente.');
        return;
      }
      if (!res.ok) {
        setErr(j.error || 'Erro ao criar categoria');
        return;
      }

      onCreated?.(j);        // { id, name, color }
      setName(''); setColor('');
      onClose?.();
    } catch (e) {
      setErr(e.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova categoria">
      <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>Nome</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Alimentação"
          autoFocus
        />

        <label>Cor (opcional)</label>
        <input
          className="input"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="azul / vermelho / #22c55e"
          title="Nome PT (ex.: azul) ou #hex; vazio = cor automática."
        />

        {err && <div className="helper">⚠ {err}</div>}

        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="button button-success" disabled={loading}>{loading ? 'Salvando…' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  );
}
