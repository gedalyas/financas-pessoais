// client/src/CategoriesPanel.jsx
import React, { useEffect, useState } from 'react';
import ConfirmDialog from './ui/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('pf_token') || '';
}

function authHeaders(extra = {}) {
  const t = getToken();
  return {
    ...(extra || {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

export default function CategoriesPanel({ onChanged }) {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(''); // vazio => backend escolhe automático
  const [err, setErr] = useState(null);

  // modal de remoção
  const [catToDelete, setCatToDelete] = useState(null); // {id, name}

  async function load() {
    setErr(null);
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        cache: 'no-store',
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setErr('⚠ Autenticação obrigatória.');
        setList([]);
        return;
      }
      const data = await res.json().catch(() => []);
      const arr = Array.isArray(data) ? data : [];
      setList(arr);
      onChanged && onChanged();
    } catch (e) {
      setErr('Falha ao carregar categorias.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setErr(null);
    const payload = { name: name.trim() };
    if (color && color.trim()) payload.color = color.trim(); // nome PT ou #hex

    const res = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));

    if (res.status === 401) { setErr('⚠ Autenticação obrigatória.'); return; }
    if (!res.ok) { setErr(j.error || 'Erro ao criar'); return; }

    setName('');
    setColor('');
    await load();
  }

  async function onUpdate(id, fields) {
    setErr(null);
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(fields),
    });
    const j = await res.json().catch(() => ({}));

    if (res.status === 401) { setErr('⚠ Autenticação obrigatória.'); return; }
    if (!res.ok) { alert(j.error || 'Erro ao atualizar'); return; }

    await load();
  }

  async function deleteCategoryNow() {
    if (!catToDelete) return;
    setErr(null);
    const res = await fetch(`${API_URL}/api/categories/${catToDelete.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const j = await res.json().catch(() => ({}));
    setCatToDelete(null);

    if (res.status === 401) { setErr('⚠ Autenticação obrigatória.'); return; }
    if (!res.ok) { alert(j.error || 'Erro ao excluir'); return; }

    await load();
  }

  return (
    <section className="form" style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>Gerenciar Categorias</h3>

      <form onSubmit={onCreate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Cor (opcional: azul / #22c55e)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Digite nome PT (ex.: azul) ou #hex. Vazio = cor automática."
        />
        <button className="button button-success">Adicionar</button>
        {err && <div className="helper">{err}</div>}
      </form>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Cor</th>
              <th>Nome</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="category-dot" style={{ background: c.color }} />
                  <input
                    className="input"
                    style={{ width: 180, display: 'inline-block', marginLeft: 6 }}
                    placeholder="azul / #22c55e"
                    defaultValue={c.color}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== c.color) onUpdate(c.id, { color: val });
                    }}
                    title="Digite nome PT (ex.: azul) ou #hex"
                  />
                  <span className="helper" style={{ marginLeft: 8 }}>{c.color}</span>
                </td>
                <td>
                  <input
                    className="input"
                    defaultValue={c.name}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val && val !== c.name) onUpdate(c.id, { name: val });
                    }}
                    title="Renomear categoria"
                  />
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="button button-danger"
                      onClick={() => setCatToDelete({ id: c.id, name: c.name })}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={3}>
                  <div className="helper">Nenhuma categoria ainda.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmação */}
      <ConfirmDialog
        open={!!catToDelete}
        title="Excluir categoria"
        message={catToDelete ? `Tem certeza que deseja excluir a categoria "${catToDelete.name}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={deleteCategoryNow}
        onClose={() => setCatToDelete(null)}
      />
    </section>
  );
}
