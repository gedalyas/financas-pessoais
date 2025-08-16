import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const API_URL = 'http://localhost:5000';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

export default function StatsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState({ byCategory: [], income: 0, expense: 0, balance: 0 });
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);

      const [sumRes, txRes] = await Promise.all([
        fetch(`${API_URL}/api/summary?${q.toString()}`, { cache: 'no-store' }),
        fetch(`${API_URL}/api/transactions?${q.toString()}`, { cache: 'no-store' }),
      ]);
      const sum = await sumRes.json();
      const rows = await txRes.json();

      setSummary(sum);
      setTx(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, []);

  // Pie: despesas por categoria
  const pieData = useMemo(() => {
    const arr = (summary.byCategory || [])
      .map(c => ({ name: c.category, value: Math.max(0, c.expense || 0), color: c.color || '#64748b' }))
      .filter(d => d.value > 0);
    // ordena por valor desc
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [summary]);

  // Line: por mês (income, expense, balance)
  const monthly = useMemo(() => {
    const map = new Map(); // key YYYY-MM
    for (const t of tx) {
      const d = new Date(t.date + 'T00:00:00');
      if (isNaN(d)) continue;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const obj = map.get(ym) || { ym, income: 0, expense: 0 };
      if (t.type === 'income') obj.income += t.amount;
      else obj.expense += t.amount;
      map.set(ym, obj);
    }
    const list = Array.from(map.values());
    list.sort((a, b) => a.ym.localeCompare(b.ym));
    return list.map(r => ({ ...r, balance: r.income - r.expense, label: monthLabel(r.ym) }));
  }, [tx]);

  return (
    <div className="page">
      <header className="header">
        <div className="title">Estatísticas</div>
        <div className="helper">Filtros por data afetam os gráficos</div>
      </header>

      <section className="filters">
        <div className="filters-grid">
          <div><label>De</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label>Até</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="button" onClick={fetchAll}>Aplicar filtros</button>
          <button className="button" onClick={() => { setFrom(''); setTo(''); fetchAll(); }}>Limpar</button>
        </div>
      </section>

      {/* Kpis */}
      <section className="summary">
        <div className="summary-cards">
          <div className="card income"><h3>Receitas</h3><div className="value">{fmtBRL(summary.income)}</div></div>
          <div className="card expense"><h3>Despesas</h3><div className="value">{fmtBRL(summary.expense)}</div></div>
          <div className="card balance"><h3>Saldo</h3><div className="value">{fmtBRL(summary.balance)}</div></div>
        </div>
      </section>

      {/* Charts */}
      <section className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Despesas por categoria</h3>
          {loading ? <div className="helper">Carregando…</div> : pieData.length === 0 ? (
            <div className="helper">Sem dados de despesas no período.</div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Evolução mensal</h3>
          {loading ? <div className="helper">Carregando…</div> : monthly.length === 0 ? (
            <div className="helper">Sem dados no período.</div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Receitas" />
                  <Line type="monotone" dataKey="expense" name="Despesas" />
                  <Line type="monotone" dataKey="balance" name="Saldo" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
