// client/src/pages/Stats.jsx (ou StatsPage.jsx)
import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('pf_token') || '';
}
function authHeaders(extra = {}) {
  const t = getToken();
  return { ...(extra || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function StatsPage() {
  const navigate = useNavigate();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState({ byCategory: [], income: 0, expense: 0, balance: 0 });
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function fetchAll() {
    setLoading(true);
    setErr('');
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);

      const [sumRes, txRes] = await Promise.all([
        fetch(`${API_URL}/api/summary?${q.toString()}`, { cache: 'no-store', headers: authHeaders() }),
        fetch(`${API_URL}/api/transactions?${q.toString()}`, { cache: 'no-store', headers: authHeaders() }),
      ]);

      if (sumRes.status === 401 || txRes.status === 401) {
        setErr('⚠ Autenticação obrigatória.');
        setSummary({ byCategory: [], income: 0, expense: 0, balance: 0 });
        setTx([]);
        return;
      }

      if (!sumRes.ok || !txRes.ok) {
        setErr('Falha ao carregar dados.');
        return;
      }

      const sum = await sumRes.json();
      const rows = await txRes.json();

      setSummary(sum);
      setTx(Array.isArray(rows) ? rows : []);
    } catch {
      setErr('Falha ao carregar dados.');
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

  // Média móvel 3 meses do saldo (tendência)
  const monthlyWithMA = useMemo(() => {
    const k = 3;
    const out = monthly.map((r, i) => {
      const start = Math.max(0, i - (k - 1));
      const slice = monthly.slice(start, i + 1);
      const ma = slice.reduce((s, x) => s + x.balance, 0) / Math.max(1, slice.length);
      return { ...r, balanceMA: ma };
    });
    return out;
  }, [monthly]);

  // Heatmap: despesas por dia da semana
  const heatWeekday = useMemo(() => {
    const arr = new Array(7).fill(0);
    for (const t of tx) {
      if (t.type !== 'expense') continue;
      const d = new Date(t.date + 'T00:00:00');
      if (isNaN(d)) continue;
      const w = d.getDay(); // 0=Dom..6=Sáb
      arr[w] += Number(t.amount) || 0;
    }
    const max = Math.max(1, ...arr);
    return arr.map((v, i) => ({ idx: i, label: WD[i], value: v, intensity: v / max }));
  }, [tx]);

  // Anomalias
  const anomalies = useMemo(() => {
    const byCat = new Map();
    for (const t of tx) {
      if (t.type !== 'expense') continue;
      const arr = byCat.get(t.category) || [];
      arr.push(Number(t.amount) || 0);
      byCat.set(t.category, arr);
    }
    const stats = new Map();
    byCat.forEach((arr, cat) => {
      const n = arr.length || 1;
      const mean = arr.reduce((a, b) => a + b, 0) / n;
      const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      const std = Math.sqrt(variance);
      stats.set(cat, { mean, std });
    });

    const out = [];
    for (const t of tx) {
      if (t.type !== 'expense') continue;
      const s = stats.get(t.category);
      if (!s) continue;
      if (t.amount > s.mean + 2 * s.std) {
        out.push({
          id: t.id, date: t.date, category: t.category, description: t.description,
          amount: t.amount, threshold: s.mean + 2 * s.std
        });
      }
    }
    out.sort((a, b) => b.amount - a.amount);
    return out.slice(0, 6);
  }, [tx]);

  // clique na pizza => vai para Dashboard filtrado por categoria
  const handlePieClick = (name) => {
    if (!name) return;
    navigate(`/?cat=${encodeURIComponent(name)}`);
  };

  // ---------- Comparativo mensal (último vs anterior) ----------
  const monthCompare = useMemo(() => {
    if (!monthly.length) return null;
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2] || null;

    function cmp(curr, prev, key) {
      if (!prev) return { curr: curr[key] || 0, prev: null, diff: null, pct: null };
      const c = curr[key] || 0; const p = prev[key] || 0;
      const diff = c - p;
      const pct = p !== 0 ? (diff / p) * 100 : null;
      return { curr: c, prev: p, diff, pct };
    }

    return {
      ym: last.ym, label: last.label,
      prevLabel: prev?.label ?? null,
      income: cmp(last, prev, 'income'),
      expense: cmp(last, prev, 'expense'),
      balance: cmp(last, prev, 'balance'),
    };
  }, [monthly]);

  const arrow = (diff) => (diff == null ? '' : diff > 0 ? '🔼' : diff < 0 ? '🔽' : '⟷');
  const diffColor = (key, diff) => {
    if (diff == null || diff === 0) return 'var(--muted-3)';
    const good = key === 'expense' ? diff < 0 : diff > 0;
    return good ? 'var(--success-3)' : '#ef4444';
  };
  const fmtDiff = (n) => (n == null ? '—' : (n >= 0 ? `+${fmtBRL(n)}` : `-${fmtBRL(Math.abs(n))}`));
  const fmtPct = (p) => (p == null ? '' : ` (${p >= 0 ? '+' : ''}${p.toFixed(0)}%)`);

  function MetricComp({ title, keyName, data }) {
    const color = diffColor(keyName, data.diff);
    return (
      <div className="card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted-3)' }}>{title}</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtBRL(data.curr)}</div>
        <div style={{ fontSize: 12, color }}>
          {arrow(data.diff)} {fmtDiff(data.diff)}{fmtPct(data.pct)}
        </div>
      </div>
    );
  }

  function HeatWeekday({ data }) {
    return (
      <div className="heatgrid">
        {data.map((d) => (
          <div
            key={d.idx}
            className="heatcell"
            title={`${d.label}: ${fmtBRL(d.value)}`}
            style={{
              opacity: 0.25 + d.intensity * 0.75,
              background: 'var(--accent)',
              borderColor: 'var(--panel-border)'
            }}
          >
            <div className="heatlabel">{d.label}</div>
            <div className="heatvalue">{fmtBRL(d.value)}</div>
          </div>
        ))}
      </div>
    );
  }

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
          {err && <div className="helper">⚠ {err}</div>}
        </div>
      </section>

      {/* KPIs gerais do período filtrado */}
      <section className="summary">
        <div className="summary-cards">
          <div className="card income"><h3>Receitas</h3><div className="value">{fmtBRL(summary.income)}</div></div>
          <div className="card expense"><h3>Despesas</h3><div className="value">{fmtBRL(summary.expense)}</div></div>
          <div className="card balance"><h3>Saldo</h3><div className="value">{fmtBRL(summary.balance)}</div></div>
        </div>
      </section>

      {/* Comparativo mensal (último vs anterior) */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>
          Comparativo mensal {monthCompare?.label ? `• ${monthCompare.label}` : ''}
          {monthCompare?.prevLabel ? ` vs ${monthCompare.prevLabel}` : ''}
        </h3>
        {(!monthCompare || !monthCompare.prevLabel) ? (
          <div className="helper">Precisa de pelo menos 2 meses no período para comparar.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <MetricComp title="Receitas" keyName="income" data={monthCompare.income} />
            <MetricComp title="Despesas" keyName="expense" data={monthCompare.expense} />
            <MetricComp title="Saldo" keyName="balance" data={monthCompare.balance} />
          </div>
        )}
      </section>

      {/* Charts principais */}
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
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        onClick={() => handlePieClick(entry.name)}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="helper" style={{ marginTop: 6 }}>Clique numa fatia para abrir o Dashboard filtrado pela categoria.</div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Evolução mensal (com tendência)</h3>
          {loading ? <div className="helper">Carregando…</div> : monthlyWithMA.length === 0 ? (
            <div className="helper">Sem dados no período.</div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={monthlyWithMA} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Receitas" />
                  <Line type="monotone" dataKey="expense" name="Despesas" />
                  <Line type="monotone" dataKey="balance" name="Saldo" />
                  <Line type="monotone" dataKey="balanceMA" name="Saldo (média 3m)" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Insights adicionais */}
      <section className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Mapa de calor — Gastos por dia da semana</h3>
          {loading ? <div className="helper">Carregando…</div> : (
            heatWeekday.every(x => x.value === 0) ? (
              <div className="helper">Sem despesas no período.</div>
            ) : (
              <>
                <HeatWeekday data={heatWeekday} />
                <div className="helper" style={{ marginTop: 6 }}>Cores mais fortes indicam dias com maiores despesas totais.</div>
              </>
            )
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Gastos fora do padrão (top 6)</h3>
          {loading ? <div className="helper">Carregando…</div> : anomalies.length === 0 ? (
            <div className="helper">Nenhuma anomalia detectada no período.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a) => (
                    <tr key={a.id}>
                      <td>{new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td>{a.category}</td>
                      <td>{a.description}</td>
                      <td style={{ textAlign: 'right' }}>{fmtBRL(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="helper" style={{ marginTop: 6 }}>Critério: valor &gt; média da categoria + 2×desvio padrão.</div>
        </div>
      </section>
    </div>
  );
}
