import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoriesPanel from '../CategoriesPanel';
import ConfirmDialog from '../ui/ConfirmDialog';
import CategoryDialog from '../ui/CategoryDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const toDateLabel = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '');
const d2iso = (d) => d.toISOString().slice(0, 10);

// helpers de recorrência (para definir início padrão como a PRÓXIMA ocorrência)
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d2iso(d); }
function addMonthsClamp(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth() + n, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d2iso(d);
}
function nextFrom(dateISO, frequency, interval) {
  if (frequency === 'daily') return addDays(dateISO, Math.max(1, interval));
  if (frequency === 'weekly') return addDays(dateISO, 7 * Math.max(1, interval));
  return addMonthsClamp(dateISO, Math.max(1, interval)); // monthly
}

export default function TransactionsPage() {
  // filtros
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tType, setTType] = useState('expense');
  const [amount, setAmount] = useState('');

  // Meta (opcional)
  const [goalId, setGoalId] = useState('');
  const [goals, setGoals] = useState([]);

  // 🔁 recorrência (opcional)
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recFreq, setRecFreq] = useState('monthly'); // daily | weekly | monthly
  const [recInterval, setRecInterval] = useState(1); // a cada N períodos
  const [recStart, setRecStart] = useState(() => nextFrom(new Date().toISOString().slice(0,10), 'monthly', 1));
  const [recEnd, setRecEnd] = useState('');
  const [onlyRecurring, setOnlyRecurring] = useState(false); // << NOVO

  // dados
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0, byCategory: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [categoriesAll, setCategoriesAll] = useState([]);

  // modais
  const [showCats, setShowCats] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null); // {id, description}

  // query param (drill-down)
  const [searchParams, setSearchParams] = useSearchParams();

  const didInit = useRef(false);

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_URL}/api/categories`, { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        setCategoriesAll(Array.isArray(list) ? list : []);
      }
    } catch {}
  }
  async function fetchGoals() {
    try {
      const r = await fetch(`${API_URL}/api/goals`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      setGoals((Array.isArray(j) ? j : []).filter(g => g.status === 'active'));
    } catch {}
  }

  async function fetchData() {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      if (type !== 'all') q.set('type', type);
      if (categoryFilter !== 'all') q.set('category', categoryFilter);

      const [txRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions?${q.toString()}`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/summary?${q.toString()}`, { cache: 'no-store' }),
      ]);

      if (!txRes.ok) throw new Error('Erro ao buscar transações');
      if (!sumRes.ok) throw new Error('Erro ao buscar resumo');

      setItems(await txRes.json());
      setSummary(await sumRes.json());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function reloadAll() {
    await Promise.all([fetchCategories(), fetchGoals(), fetchData()]);
  }

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    reloadAll();
  }, []);

  // se a categoria atual sumir da lista, ajusta seleção
  useEffect(() => {
    if (!categoriesAll.length) { setCategory(''); return; }
    if (!category || !categoriesAll.some((c) => c.name === category)) {
      setCategory(categoriesAll[0].name);
    }
  }, [categoriesAll]); // eslint-disable-line

  // ler cat=? da URL (drill-down vindo do gráfico) quando as categorias já estão carregadas
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat && categoriesAll.some(c => c.name === cat)) {
      setCategoryFilter(cat);
      fetchData();
      setSearchParams({}, { replace: true });
    }
  }, [categoriesAll]); // eslint-disable-line

  // ao marcar "tornar recorrente", definir início padrão como a PRÓXIMA ocorrência
  useEffect(() => {
    if (makeRecurring) {
      setRecStart(nextFrom(date, recFreq, recInterval));
    } else {
      setOnlyRecurring(false); // desmarca quando não é recorrente
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeRecurring, date, recFreq, recInterval]);

  // auto-marcar "apenas agendar" quando o início é futuro em relação à data do lançamento
  useEffect(() => {
    if (makeRecurring && recStart && date && recStart > date) {
      setOnlyRecurring(true);
    }
    // não força desmarcar se o usuário definiu manualmente
  }, [makeRecurring, recStart, date]);

  // atalhos de período
  function setThisMonth() {
    const now = new Date();
    const f = new Date(now.getFullYear(), now.getMonth(), 1);
    const t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFrom(d2iso(f)); setTo(d2iso(t)); fetchData();
  }
  function setLast3Months() {
    const now = new Date();
    const f = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const t = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFrom(d2iso(f)); setTo(d2iso(t)); fetchData();
  }
  function setThisYear() {
    const now = new Date();
    const f = new Date(now.getFullYear(), 0, 1);
    const t = new Date(now.getFullYear(), 11, 31);
    setFrom(d2iso(f)); setTo(d2iso(t)); fetchData();
  }

  async function onAdd(e) {
    e.preventDefault();
    setErr(null);
    const value = parseFloat(String(amount).replace(',', '.'));
    if (!date || !description) { setErr('Preencha data e descrição.'); return; }
    if (!Number.isFinite(value) || value <= 0) { setErr('Valor inválido.'); return; }
    if (!categoriesAll.some((c) => c.name === category)) {
      setErr('Categoria inválida. Escolha uma categoria existente.');
      return;
    }

    // Se for "apenas agendar recorrência", NÃO cria transação agora.
    if (makeRecurring && onlyRecurring) {
      const recurPayload = {
        description: description.trim(),
        category: category.trim(),
        type: tType,
        amount: value,
        frequency: recFreq,              // 'daily' | 'weekly' | 'monthly'
        interval: Number(recInterval) || 1,
        start_date: recStart || nextFrom(date, recFreq, recInterval),
        end_date: recEnd || null,
        active: true,
        goal_id: goalId || undefined,
      };
      const rr = await fetch(`${API_URL}/api/recurrences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recurPayload),
      });
      const rj = await rr.json().catch(() => ({}));
      if (!rr.ok) {
        setErr(rj.error || 'Erro ao criar recorrência.');
        return;
      }
      // limpa form
      setDescription('');
      setAmount('');
      setGoalId('');
      setMakeRecurring(false);
      setRecFreq('monthly');
      setRecInterval(1);
      setRecStart(nextFrom(date, 'monthly', 1));
      setRecEnd('');
      setOnlyRecurring(false);

      await reloadAll();
      return;
    }

    // 1) cria a transação normalmente (lança agora)
    const body = {
      date,
      description: description.trim(),
      category: category.trim(),
      type: tType,
      amount: value,
      goal_id: goalId || undefined,
    };
    const res = await fetch(`${API_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || 'Erro ao salvar');
      return;
    }

    // 2) se marcado, cria a regra de recorrência (início = próxima ocorrência para NÃO duplicar hoje)
    if (makeRecurring) {
      const recurPayload = {
        description: description.trim(),
        category: category.trim(),
        type: tType,
        amount: value,
        frequency: recFreq,
        interval: Number(recInterval) || 1,
        start_date: recStart || nextFrom(date, recFreq, recInterval),
        end_date: recEnd || null,
        active: true,
        goal_id: goalId || undefined, // vincula à meta (se houver)
      };
      const rr = await fetch(`${API_URL}/api/recurrences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recurPayload),
      });
      const rj = await rr.json().catch(() => ({}));
      if (!rr.ok) {
        // não bloqueia o lançamento; apenas informa erro de criar recorrência
        alert(rj.error || 'Transação salva, mas falhou ao criar recorrência.');
      }
    }

    // limpa form
    setDescription('');
    setAmount('');
    setGoalId('');
    setMakeRecurring(false);
    setRecFreq('monthly');
    setRecInterval(1);
    setRecStart(nextFrom(date, 'monthly', 1));
    setRecEnd('');
    setOnlyRecurring(false);

    await reloadAll();
  }

  async function deleteTxNow() {
    if (!txToDelete) return;
    const res = await fetch(`${API_URL}/api/transactions/${txToDelete.id}`, { method: 'DELETE' });
    setTxToDelete(null);
    if (res.ok) fetchData();
  }

  return (
    <div className="page">
      <header className="header">
        <div className="title">Dashboard</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button" onClick={() => { setShowCats((v) => !v); if (!showCats) fetchCategories(); }}>
            {showCats ? 'Fechar Categorias' : 'Gerenciar Categorias'}
          </button>
          <div className="helper">Para duvidas e sugestões favor contatar o nosso suporte: 3199311-2726</div>
        </div>
      </header>

      {/* Resumo */}
      <section className="summary">
        <div className="summary-cards">
          <div className="card income"><h3>Receitas</h3><div className="value">{fmtBRL(summary.income)}</div></div>
          <div className="card expense"><h3>Despesas</h3><div className="value">{fmtBRL(summary.expense)}</div></div>
          <div className="card balance"><h3>Saldo</h3><div className="value">{fmtBRL(summary.balance)}</div></div>
        </div>
      </section>

      {/* Filtros */}
      <section className="filters">
        <div className="filters-grid">
          <div><label>De</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label>Até</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <label>Tipo</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">Todos</option>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div>
            <label>Categoria</label>
            <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Todas</option>
              {categoriesAll.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="button" onClick={fetchData}>Aplicar filtros</button>
          <button className="button" onClick={() => { setFrom(''); setTo(''); setType('all'); setCategoryFilter('all'); fetchData(); }}>Limpar</button>
          <button className="button" onClick={setThisMonth}>Este mês</button>
          <button className="button" onClick={setLast3Months}>Últimos 3 meses</button>
          <button className="button" onClick={setThisYear}>Este ano</button>
        </div>
      </section>

      {/* Formulário */}
      <section className="form">
        <form className="form-grid" onSubmit={onAdd}>
          <div>
            <label>Data</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label>Descrição</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Mercado / Salário"
              required
            />
          </div>
          <div>
            <label>Categoria</label>
            <select
              className="select"
              value={category}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__new__') setShowNewCat(true);
                else setCategory(v);
              }}
              required
            >
              {category ? null : <option value="">Selecione…</option>}
              {categoriesAll.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value="__new__">+ Nova categoria…</option>
            </select>
          </div>
          <div>
            <label>Tipo</label>
            <select className="select" value={tType} onChange={(e) => setTType(e.target.value)}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>
          <div>
            <label>Valor</label>
            <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex.: 123.45" required />
          </div>

          {/* Meta (opcional) */}
          <div>
            <label>Meta (opcional)</label>
            <select className="select" value={goalId} onChange={(e)=> setGoalId(e.target.value)}>
              <option value="">— Sem meta —</option>
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div className="helper">Se vincular, será criada uma contribuição: despesa = depósito (+), receita = retirada (−).</div>
          </div>

          {/* 🔁 tornar recorrente */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={makeRecurring}
                onChange={(e) => setMakeRecurring(e.target.checked)}
              />
              Tornar recorrente
            </label>

            {makeRecurring && (
              <>
                <div className="filters-grid" style={{ marginTop: 4 }}>
                  <div>
                    <label>Frequência</label>
                    <select className="select" value={recFreq} onChange={(e) => setRecFreq(e.target.value)}>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="daily">Diária</option>
                    </select>
                  </div>
                  <div>
                    <label>Intervalo</label>
                    <input className="input" type="number" min={1} value={recInterval} onChange={(e) => setRecInterval(Math.max(1, Number(e.target.value) || 1))} />
                    <div className="helper">Ex.: 1 = todo período, 2 = a cada 2 períodos</div>
                  </div>
                  <div>
                    <label>Início</label>
                    <input className="input" type="date" value={recStart} onChange={(e) => setRecStart(e.target.value)} />
                    <div className="helper">Padrão: próxima após {toDateLabel(date)}</div>
                  </div>
                  <div>
                    <label>Fim (opcional)</label>
                    <input className="input" type="date" value={recEnd} onChange={(e) => setRecEnd(e.target.value)} />
                  </div>
                </div>

                <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                  <input
                    type="checkbox"
                    checked={onlyRecurring}
                    onChange={(e)=> setOnlyRecurring(e.target.checked)}
                  />
                  Não lançar agora (apenas agendar a recorrência)
                </label>
                <div className="helper">
                  Se marcado, **nenhuma** transação será criada agora; só a regra recorrente será salva.
                </div>
              </>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="button button-success"
              type="submit"
              disabled={!category || !categoriesAll.length || !categoriesAll.some((c) => c.name === category)}
            >
              {makeRecurring && onlyRecurring ? 'Agendar recorrência' : 'Adicionar'}
            </button>
            {err && <div className="helper">⚠ {err}</div>}
          </div>
        </form>
      </section>

      {/* Tabela */}
      <section className="table-wrap">
        {loading ? (
          <div className="helper">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="helper">Nenhuma transação encontrada.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td>{toDateLabel(t.date)}</td>
                  <td>{t.description}</td>
                  <td>
                    <span className="category-dot" style={{ background: t.category_color || '#64748b' }} title={t.category} />
                    {t.category}
                  </td>
                  <td><span className={`badge ${t.type}`}>{t.type === 'income' ? 'Receita' : 'Despesa'}</span></td>
                  <td>{fmtBRL(t.amount)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-danger" onClick={() => setTxToDelete({ id: t.id, description: t.description })}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Painel de Categorias */}
      {showCats && <CategoriesPanel onChanged={reloadAll} />}

      {/* Dialogs */}
      <CategoryDialog
        open={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreated={async (cat) => { await fetchCategories(); setCategory(cat.name); }}
      />

      <ConfirmDialog
        open={!!txToDelete}
        title="Excluir transação"
        message={txToDelete ? `Tem certeza que deseja excluir "${txToDelete.description}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={deleteTxNow}
        onClose={() => setTxToDelete(null)}
      />
    </div>
  );
}
