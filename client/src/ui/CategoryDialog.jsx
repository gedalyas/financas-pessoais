import React, { useState } from 'react';
import Modal from './Modal';

const API_URL = 'http://localhost:5000';

export default function CategoryDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(''); // vazio => backend escolhe automático
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) { setErr('Informe um nome.'); return; }
    setLoading(true);
    try {
      const payload = { name: name.trim() };
      if (color.trim()) payload.color = color.trim(); // nome PT ou #hex
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || 'Erro ao criar categoria'); return; }
      onCreated?.(j); // j = {id,name,color}
      setName(''); setColor('');
      onClose?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova categoria">
      <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>Nome</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Alimentação" autoFocus />
        <label>Cor (opcional)</label>
        <input className="input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="azul / vermelho / #22c55e" />
        {err && <div className="helper">⚠ {err}</div>}
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="button button-success" disabled={loading}>{loading ? 'Salvando…' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  );
}
