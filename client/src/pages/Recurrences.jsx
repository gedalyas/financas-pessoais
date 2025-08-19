import React, { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const toDateLabel = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '');
const FREQ_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly',  label: 'Semanal' },
  { value: 'daily',   label: 'Diária'  },
];

export default function RecurrencesPage() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);

  // form criar
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setIntervalN] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState('');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // confirmações / estado de ação
  const [toDelete, setToDelete] = useState(null);
  const [toRunForce, setToRunForce] = useState(null);
  const [runningId, setRunningId] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        fetch(`${API_URL}/api/recurrences`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/categories`, { cache: 'no-store' }),
      ]);
      const rows = await r.json();
      const cats = await c.json();
      setList(Array.isArray(rows) ? rows : []);
      setCategories(Array.isArray(cats) ? cats : []);
      if (!category && Array.isArray(cats) && cats.length) setCategory(cats[0].name);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, []);

  async function createRec(e) {
    e.preventDefault();
    setErr(null);
    const body = {
      description: description.trim(),
      category: category.trim(),
      type,
      amount: parseFloat(String(amount).replace(',', '.')),
      frequency,
      interval: Number(interval),
      start_date: startDate,
      end_date: endDate || null,
      active,
    };
    const res = await fetch(`${API_URL}/api/recurrences`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(j.error || 'Erro ao criar'); return; }
    setDescription(''); setAmount(''); setEndDate('');
    await fetchAll();
  }

  async function toggleActive(r) {
    setRunningId(r.id);
    const res = await fetch(`${API_URL}/api/recurrences/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !r.active })
    });
    setRunningId(null);
    if (res.ok) fetchAll();
  }

  // Gerar pendentes (comportamento original)
  async function runPending(r) {
    setRunningId(r.id);
    const res = await fetch(`${API_URL}/api/recurrences/${r.id}/run`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setRunningId(null);
    if (res.ok) fetchAll(); else alert(j.error || 'Falha ao executar');
  }

  // Lançar hoje (forçado, com dedupe no backend)
  async function runTodayConfirmed() {
    if (!toRunForce) return;
    const r = toRunForce;
    setRunningId(r.id);
    setToRunForce(null);
    const res = await fetch(`${API_URL}/api/recurrences/${r.id}/run?force=1`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    setRunningId(null);
    if (res.ok) {
      if (j.deduped) alert('Já havia um lançamento igual hoje. Próxima reapontada.');
      await fetchAll();
    } else {
      alert(j.error || 'Falha ao lançar hoje');
    }
  }

  async function deleteNow() {
    if (!toDelete) return;
    setRunningId(toDelete.id);
    const res = await fetch(`${API_URL}/api/recurrences/${toDelete.id}`, { method: 'DELETE' });
    setRunningId(null);
    setToDelete(null);
    if (res.ok) fetchAll();
  }

  const sorted = useMemo(() => {
    const arr = [...list];
    arr.sort((a,b) => {
      if (a.active !== b.active) return b.active - a.active;
      if (a.next_run !== b.next_run) return a.next_run.localeCompare(b.next_run);
      return a.id - b.id;
    });
    return arr;
  }, [list]);

  return (
    <div className="page">
      <header className="header">
        <div className="title">Recorrentes</div>
        <div className="helper">Crie e gerencie lançamentos automáticos</div>
      </header>

      <section className="form">
        <form className="form-grid" onSubmit={createRec}>
          <div>
            <label>Descrição</label>
            <input className="input" value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Ex.: Salário" required />
          </div>
          <div>
            <label>Categoria</label>
            <select className="select" value={category} onChange={(e)=>setCategory(e.target.value)} required>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Tipo</label>
            <select className="select" value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div>
            <label>Valor</label>
            <input className="input" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="Ex.: 2500.00" required />
          </div>

          <div>
            <label>Frequência</label>
            <select className="select" value={frequency} onChange={(e)=>setFrequency(e.target.value)}>
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label>Intervalo</label>
            <input className="input" type="number" min={1} value={interval} onChange={(e)=>setIntervalN(Number(e.target.value))} />
            <div className="helper">Ex.: 1 = todo período • 2 = a cada 2 períodos</div>
          </div>
          <div>
            <label>Início</label>
            <input className="input" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} required />
          </div>
          <div>
            <label>Fim (opcional)</label>
            <input className="input" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="active" type="checkbox" checked={active} onChange={(e)=>setActive(e.target.checked)} />
            <label htmlFor="active"> Ativo</label>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="button button-success" disabled={runningId !== null}>Criar recorrência</button>
            {err && <div className="helper">⚠ {err}</div>}
          </div>
        </form>
      </section>

      <section className="table-wrap" style={{ marginTop: 12 }}>
        {loading ? <div className="helper">Carregando…</div> : sorted.length === 0 ? (
          <div className="helper">Nenhuma recorrência cadastrada.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Próxima</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Frequência</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const freqLabel = FREQ_OPTIONS.find(o => o.value === r.frequency)?.label || r.frequency;
                return (
                  <tr key={r.id}>
                    <td data-label="Próxima">{toDateLabel(r.next_run)}</td>
                    <td data-label="Descrição" style={{ wordBreak: 'break-word' }} title={r.description}>{r.description}</td>
                    <td data-label="Categoria">{r.category}</td>
                    <td data-label="Tipo"><span className={`badge ${r.type}`}>{r.type === 'income' ? 'Receita' : 'Despesa'}</span></td>
                    <td data-label="Valor">{fmtBRL(r.amount)}</td>
                    <td data-label="Frequência">{freqLabel} ×{r.interval}</td>
                    <td data-label="Status">{r.active ? 'Ativo' : 'Pausado'}</td>
                    <td data-label="Ações">
                      <div className="row-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
                        <button
                          className="button"
                          onClick={() => runPending(r)}
                          disabled={runningId === r.id}
                          title="Gera todas as pendentes até hoje"
                        >
                          Pendentes
                        </button>
                        <button
                          className="button"
                          onClick={() => setToRunForce(r)}
                          disabled={runningId === r.id}
                          title="Cria um lançamento HOJE e reprograma a próxima"
                        >
                          Hoje
                        </button>
                        <button
                          className="button"
                          onClick={() => toggleActive(r)}
                          disabled={runningId === r.id}
                        >
                          {r.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          className="button button-danger"
                          onClick={() => setToDelete(r)}
                          disabled={runningId === r.id}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Confirm - Lançar hoje */}
      <ConfirmDialog
        open={!!toRunForce}
        title="Lançar hoje"
        message={toRunForce ? `Isto criará um lançamento HOJE de "${toRunForce.description}" e manterá a recorrência. Continuar?` : ''}
        confirmLabel="Lançar hoje"
        cancelLabel="Cancelar"
        onConfirm={runTodayConfirmed}
        onClose={() => setToRunForce(null)}
      />

      {/* Confirm - Excluir */}
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir recorrência"
        message={toDelete ? `Excluir "${toDelete.description}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={deleteNow}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
