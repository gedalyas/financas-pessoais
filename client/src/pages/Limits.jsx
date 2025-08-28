// client/src/pages/Limits.jsx
import React, { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { apiFetch } from '../lib/api';

const fmtBRL = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtDate = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '');

const PERIOD_OPTIONS = [
  { value: '1d', label: '1 dia' },
  { value: '1w', label: '1 semana' },
  { value: '2w', label: '2 semanas' },
  { value: '1m', label: '1 mês' },
  { value: '2m', label: '2 meses' },
  { value: '4m', label: '4 meses' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 ano' },
];

export default function LimitsPage() {
  // lista / carregamento
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // form criar
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('1m');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [active, setActive] = useState(true);

  // confirmações
  const [toDelete, setToDelete] = useState(null);
  const [runningId, setRunningId] = useState(null);

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/limits', { cache: 'no-store' });
      const rows = await res.json().catch(() => []);
      if (!res.ok) {
        setErr(rows?.error || 'Falha ao carregar limites.');
        setList([]);
      } else {
        setList(Array.isArray(rows) ? rows : []);
      }
    } catch {
      setErr('Falha ao carregar limites.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setErr('');

    const max_amount = parseFloat(String(amount).replace(',', '.'));
    if (!title.trim() || !Number.isFinite(max_amount) || max_amount <= 0) {
      setErr('Preencha título e valor (número > 0).');
      return;
    }

    // 🔑 Campos alinhados ao backend
    const body = {
      title: title.trim(),
      max_amount,                       // (antes era "amount")
      duration_code: period,            // (antes era "period_code")
      start_date: startDate,
      status: active ? 'active' : 'paused',
    };

    const res = await apiFetch('/api/limits', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || 'Erro ao criar limite.');
      return;
    }

    // limpa e recarrega
    setTitle('');
    setAmount('');
    setActive(true);
    await load();
  }

  async function toggleActive(lim) {
    setRunningId(lim.id);
    const nextStatus = lim.status === 'active' ? 'paused' : 'active';
    const res = await apiFetch(`/api/limits/${lim.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }), // backend aceita "status"
    });
    setRunningId(null);
    if (res.ok) load();
  }

  async function deleteNow() {
    if (!toDelete) return;
    setRunningId(toDelete.id);
    const res = await apiFetch(`/api/limits/${toDelete.id}`, { method: 'DELETE' });
    setRunningId(null);
    setToDelete(null);
    if (res.ok) load();
  }

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a, b) => {
      const aAct = a.status === 'active' ? 1 : 0;
      const bAct = b.status === 'active' ? 1 : 0;
      if (aAct !== bAct) return bAct - aAct;
      // depois, por data de término mais próxima
      return String(a.end_date || '').localeCompare(String(b.end_date || ''));
    });
    return arr;
  }, [list]);

  const statusPill = (status) =>
    status === 'active' ? 'Ativo' : status === 'paused' ? 'Pausado' : 'Arquivado';

  const barColorByUsage = (spent, cap) => {
    if (cap <= 0) return 'var(--accent)';
    if (spent > cap) return 'var(--accent-2)';   // estourou
    if (spent > cap * 0.8) return '#f59e0b';     // 80%+
    return 'var(--brand)';                       // ok (laranja)
  };

  return (
    <div className="page">
      <header className="header">
        <div className="title">Limites de gastos</div>
        <div className="helper">Defina limites por período e acompanhe o consumo.</div>
      </header>

      {/* Criar novo limite */}
      <section className="form">
        <form className="form-grid" onSubmit={onCreate}>
          <div>
            <label>Título</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Mercado, Restaurantes, Lazer…"
              required
            />
          </div>
          <div>
            <label>Valor do limite</label>
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex.: 800.00"
              inputMode="decimal"
              required
            />
          </div>
          <div>
            <label>Período</label>
            <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Início</label>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="active"> Ativo</label>
          </div>
          <div className="full" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="button button-success">Criar limite</button>
            {err && <div className="helper">⚠ {err}</div>}
          </div>
        </form>
      </section>

      {/* Cards */}
      <section className="cards-grid">
        {loading ? (
          <div className="helper">Carregando…</div>
        ) : sorted.length === 0 ? (
          <div className="helper">Nenhum limite cadastrado.</div>
        ) : (
          sorted.map((l) => {
            const cap = Number(l.max_amount ?? 0);      // <- vem como max_amount da API
            const spent = Number(l.spent ?? 0);         // <- calculado no backend
            const remaining = cap - spent;
            const pct = cap > 0 ? Math.min(100, Math.max(0, Math.round((spent / cap) * 100))) : 0;
            const barColor = barColorByUsage(spent, cap);

            return (
              <div className="card" key={l.id}>
                <div className="goal-head" style={{ alignItems: 'flex-start' }}>
                  <div className="goal-title" style={{ fontWeight: 700, fontSize: 16 }}>{l.title}</div>
                  <span className="badge" style={{ borderColor: 'var(--panel-border)', color: barColor }}>
                    {statusPill(l.status)}
                  </span>
                </div>

                <div className="goal-line">
                  <div className="helper">
                    Período: {fmtDate(l.start_date)} {l.end_date ? `→ ${fmtDate(l.end_date)}` : ''}
                    {typeof l.days_left === 'number' ? ` • ${l.days_left}d restantes` : ''}
                  </div>
                </div>

                <div className="goal-line">
                  <div className="helper">Limite</div>
                  <div className="value">{fmtBRL(cap)}</div>
                </div>

                <div className="progress" title={`${pct}%`}>
                  <div className="progress-bar" style={{ width: `${pct}%`, background: barColor }} />
                </div>

                <div className="goal-line">
                  <div className="helper">Gasto</div>
                  <div>{fmtBRL(spent)}</div>
                </div>
                <div className="goal-line">
                  <div className="helper">Restante</div>
                  <div style={{ color: remaining < 0 ? 'var(--accent-2)' : 'var(--text)' }}>
                    {fmtBRL(remaining)}
                  </div>
                </div>

                <div className="row-actions" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="button"
                    onClick={() => toggleActive(l)}
                    disabled={runningId === l.id}
                  >
                    {l.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    className="button button-danger"
                    onClick={() => setToDelete(l)}
                    disabled={runningId === l.id}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir limite"
        message={toDelete ? `Excluir o limite "${toDelete.title}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={deleteNow}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
