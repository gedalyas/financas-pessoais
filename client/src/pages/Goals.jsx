// client/src/pages/Goals.jsx
import React, { useEffect, useMemo, useState } from 'react'; 
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { apiJson } from '../lib/api';

const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const toDateLabel = (iso) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '');
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);

const SWATCHES = ['#22c55e','#ef4444','#3b82f6','#a855f7','#f59e0b','#10b981','#f43f5e','#8b5cf6','#14b8a6','#eab308','#06b6d4','#84cc16'];

function monthsBetween(aISO, bISO) {
  const a = new Date(aISO+'T00:00:00'); const b = new Date(bISO+'T00:00:00');
  let m = (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

export default function GoalsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // criar meta
  const [openNew, setOpenNew] = useState(false);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gTargetDate, setGTargetDate] = useState('');
  const [gColor, setGColor] = useState('');
  const [gNotes, setGNotes] = useState('');

  // contribuição
  const [openContrib, setOpenContrib] = useState(false);
  const [gSel, setGSel] = useState(null);
  const [mode, setMode] = useState('deposit'); // 'deposit' | 'withdraw'
  const [cDate, setCDate] = useState(todayISO());
  const [cAmount, setCAmount] = useState('');
  const [cCreateTx, setCCreateTx] = useState(true);
  const [cNotes, setCNotes] = useState('');

  // excluir meta
  const [toDelete, setToDelete] = useState(null);

  // automatizar (recorrência vinculada à meta)
  const [openAuto, setOpenAuto] = useState(false);
  const [autoGoal, setAutoGoal] = useState(null);
  const [autoType, setAutoType] = useState('expense'); // depósito=expense / retirada=income
  const [autoAmount, setAutoAmount] = useState('');
  const [autoFreq, setAutoFreq] = useState('monthly');
  const [autoInterval, setAutoInterval] = useState(1);
  const [autoStart, setAutoStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()+1, 1);
    return d.toISOString().slice(0,10);
  });
  const [autoCat, setAutoCat] = useState('Metas'); // padrão útil
  const [showTimeline, setShowTimeline] = useState({}); // id -> bool
  const [timelineData, setTimelineData] = useState({}); // id -> [{date, cum}]

  async function load() {
    setLoading(true);
    try {
      const data = await apiJson('/api/goals');
      setList(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e) {
      setErr(e.message || 'Falha ao carregar metas');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const activeFirst = useMemo(() => {
    const arr = [...list];
    arr.sort((a,b) => {
      const order = (s) => s==='active'?0 : s==='paused'?1 : s==='achieved'?2 : 3;
      if (order(a.status) !== order(b.status)) return order(a.status) - order(b.status);
      return a.id - b.id;
    });
    return arr;
  }, [list]);

  async function createGoal(e) {
    e.preventDefault();
    const payload = {
      name: gName.trim(),
      target_amount: parseFloat(String(gTarget).replace(',', '.')),
      target_date: gTargetDate || null,
      color: gColor || undefined,
      notes: gNotes || undefined
    };
    try {
      await apiJson('/api/goals', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpenNew(false);
      setGName(''); setGTarget(''); setGTargetDate(''); setGColor(''); setGNotes('');
      load();
    } catch (e) {
      alert(e.message || 'Erro ao criar meta');
    }
  }

  function openContribModal(g, m) {
    setGSel(g); setMode(m);
    setCDate(todayISO()); setCAmount(''); setCNotes(''); setCCreateTx(true);
    setOpenContrib(true);
  }

  async function saveContribution(e) {
    e.preventDefault();
    if (!gSel) return;
    const val = parseFloat(String(cAmount).replace(',', '.'));
    if (!Number.isFinite(val) || val <= 0) { alert('Valor inválido'); return; }
    const signed = mode === 'deposit' ? +val : -val;
    const payload = { date: cDate, amount: signed, createTransaction: !!cCreateTx, notes: cNotes || undefined };
    try {
      await apiJson(`/api/goals/${gSel.id}/contributions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpenContrib(false); setGSel(null);
      load();
    } catch (e) {
      alert(e.message || 'Erro ao salvar');
    }
  }

  async function setStatus(g, st) {
    try {
      await apiJson(`/api/goals/${g.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: st })
      });
      load();
    } catch {}
  }

  async function deleteGoalNow() {
    if (!toDelete) return;
    try {
      await apiJson(`/api/goals/${toDelete.id}`, { method: 'DELETE' });
      setToDelete(null);
      load();
    } catch (e) {
      setToDelete(null);
      alert(e.message || 'Falha ao excluir meta.');
    }
  }

  // sugestão mensal ao preencher valor + data-alvo (no modal de nova meta)
  const monthlySuggestion = (() => {
    const tgt = parseFloat(String(gTarget).replace(',', '.'));
    if (!gTargetDate || !Number.isFinite(tgt) || tgt <= 0) return null;
    const months = Math.max(1, monthsBetween(todayISO(), gTargetDate));
    return tgt / months;
  })();

  // abrir modal de automatização com defaults
  function openAutoFor(goal) {
    setAutoGoal(goal);
    setAutoType('expense');
    setAutoAmount(goal.suggested_monthly ? String(Number(goal.suggested_monthly).toFixed(2)) : '');
    setAutoFreq('monthly');
    setAutoInterval(1);
    const d = new Date(); d.setMonth(d.getMonth()+1, 1);
    setAutoStart(d.toISOString().slice(0,10));
    setAutoCat('Metas');
    setOpenAuto(true);
  }

  async function createAutoRecurrence(e) {
    e.preventDefault();
    if (!autoGoal) return;
    const amt = parseFloat(String(autoAmount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) { alert('Valor inválido'); return; }
    const payload = {
      description: `Meta: ${autoGoal.name} (auto)`,
      category: autoCat || 'Metas',
      type: autoType, // expense=depósito | income=retirada
      amount: amt,
      frequency: autoFreq,
      interval: Number(autoInterval) || 1,
      start_date: autoStart,
      end_date: null,
      active: true,
      goal_id: autoGoal.id, // 🔗 vincula à meta para criar contribuição automática
    };
    try {
      await apiJson('/api/recurrences', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpenAuto(false);
    } catch (e) {
      alert(e.message || 'Erro ao criar recorrência.');
    }
  }

  // carregar contribuições e montar timeline cumulativa
  async function toggleTimeline(goal) {
    setShowTimeline(prev => ({...prev, [goal.id]: !prev[goal.id]}));
    if (!timelineData[goal.id]) {
      try {
        const arr = await apiJson(`/api/goals/${goal.id}/contributions`, { cache:'no-store' });
        let cum = 0;
        const points = arr.map(x => {
          cum += Number(x.amount || 0);
          return { date: x.date, cum };
        });
        setTimelineData(prev => ({...prev, [goal.id]: points}));
      } catch {
        setTimelineData(prev => ({...prev, [goal.id]: []}));
      }
    }
  }

  // Sparkline responsiva (viewBox + width:100%)
  function Sparkline({ data, color='#22c55e', height=72, target=null }) {
    const pad = 8;
    const vw = 320; // largura "virtual" do gráfico (independente do tamanho real)
    const xs = data.length ? data.map((_,i)=> i) : [0,1];
    const ys = data.length ? data.map(p=> p.cum) : [0,0];
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(1, ...ys, target ?? 0);

    const scaleX = (i)=> pad + (i - xs[0]) * (vw - 2*pad) / Math.max(1, xs[xs.length-1] - xs[0]);
    const scaleY = (y)=> {
      const h = height - 2*pad;
      return (height - pad) - (y - minY) * (h) / Math.max(1, (maxY - minY));
    };

    const path = data.map((p,i)=> `${i===0?'M':'L'} ${scaleX(i)} ${scaleY(p.cum)}`).join(' ');
    const targetY = target!=null ? scaleY(target) : null;

    return (
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${vw} ${height}`}
        preserveAspectRatio="none"
        style={{ display:'block' }}
      >
        {target!=null && (
          <line x1={pad} x2={vw-pad} y1={targetY} y2={targetY} stroke="#64748b" strokeDasharray="4 3" />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="title">Metas</div>
        <div className="header-actions">
          <button className="button button-success" onClick={()=> setOpenNew(true)}>Nova meta</button>
        </div>
      </header>

      {loading ? <div className="helper">Carregando…</div> : err ? <div className="helper">⚠ {err}</div> : (
        activeFirst.length === 0 ? <div className="helper">Nenhuma meta cadastrada.</div> : (
          <div className="cards-grid">
            {activeFirst.map(g => (
              <div key={g.id} className="card goal-card">
                <div className="goal-head">
                  <span className="category-dot" style={{ background: g.color }} />
                  <strong className="goal-title">{g.name}</strong>
                  <span className="goal-status">
                    {g.status === 'active' ? 'Ativa' : g.status === 'paused' ? 'Pausada' : g.status === 'achieved' ? 'Concluída' : 'Arquivada'}
                  </span>
                </div>

                <div className="goal-line">
                  <span>{fmtBRL(g.saved)} / {fmtBRL(g.target_amount)}</span>
                  <span className="helper">{g.missing > 0 ? `faltam ${fmtBRL(g.missing)}` : 'meta atingida 🎉'}</span>
                </div>

                <div className="progress">
                  <div className="progress-bar" style={{ width: `${g.percent}%`, background: g.color }} />
                </div>

                {g.target_date && g.missing > 0 ? (
                  <div className="helper">Sugestão: {fmtBRL(g.suggested_monthly || 0)} / mês até {toDateLabel(g.target_date)}</div>
                ) : null}

                <div className="goal-actions" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button className="button" onClick={()=> openContribModal(g, 'deposit')}>Contribuir</button>
                  <button className="button" onClick={()=> openContribModal(g, 'withdraw')}>Retirar</button>
                  <button className="button" onClick={()=> openAutoFor(g)}>Automatizar</button>
                  <button className="button" onClick={()=> toggleTimeline(g)}>{showTimeline[g.id] ? 'Fechar timeline' : 'Timeline'}</button>
                  {g.status !== 'achieved' && g.percent >= 100 ? (
                    <button className="button" onClick={()=> setStatus(g, 'achieved')}>Concluir</button>
                  ) : null}
                  <button className="button" onClick={()=> setStatus(g, g.status === 'active' ? 'paused' : 'active')}>
                    {g.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button className="button button-danger" onClick={()=> setToDelete(g)}>Excluir</button>
                </div>

                {showTimeline[g.id] && (
                  <div className="goal-timeline">
                    {!timelineData[g.id] ? (
                      <div className="helper">Carregando timeline…</div>
                    ) : timelineData[g.id].length === 0 ? (
                      <div className="helper">Sem contribuições para exibir.</div>
                    ) : (
                      <div style={{ display:'grid', gap:8 }}>
                        <Sparkline
                          data={timelineData[g.id]}
                          color={g.color}
                          target={g.target_amount}
                        />
                        <div className="helper">
                          Evolução do saldo da meta (linha contínua). Linha tracejada = valor alvo.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Nova meta */}
      <Modal open={openNew} onClose={()=> setOpenNew(false)} title="Nova meta">
        <form className="form-grid modal-grid" onSubmit={createGoal}>
          <div>
            <label>Nome</label>
            <input className="input" value={gName} onChange={(e)=> setGName(e.target.value)} required />
          </div>

          <div>
            <label>Valor alvo</label>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={gTarget}
              onChange={(e)=> setGTarget(e.target.value)}
              placeholder="Ex.: 5000"
              required
            />
            {monthlySuggestion !== null && (
              <div className="helper">Sugestão: {fmtBRL(monthlySuggestion)} / mês até {toDateLabel(gTargetDate)}</div>
            )}
          </div>

          <div>
            <label>Data-alvo (opcional)</label>
            <input className="input" type="date" value={gTargetDate} onChange={(e)=> setGTargetDate(e.target.value)} />
          </div>

          <div>
            <label>Cor (nome PT ou #hex – opcional)</label>
            <input
              className="input"
              value={gColor}
              onChange={(e)=> setGColor(e.target.value)}
              placeholder="Ex.: azul, #22c55e"
            />
            <div className="swatches">
              {SWATCHES.map(hex => (
                <button
                  key={hex}
                  type="button"
                  onClick={()=> setGColor(hex)}
                  title={hex}
                  className={'swatch' + (gColor===hex ? ' swatch-active' : '')}
                  style={{ background: hex }}
                />
              ))}
              <span className="category-dot" style={{ background: gColor || '#22c55e' }} title="Pré-visualização" />
            </div>
          </div>

          <div className="full">
            <label>Obs. (opcional)</label>
            <textarea className="input" rows={3} value={gNotes} onChange={(e)=> setGNotes(e.target.value)} />
          </div>

          <div className="full modal-actions">
            <button className="button button-success" type="submit">Criar</button>
            <button className="button" type="button" onClick={()=> setOpenNew(false)}>Cancelar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Contribuir / Retirar */}
      <Modal open={openContrib} onClose={()=> setOpenContrib(false)} title={mode==='deposit' ? 'Contribuir' : 'Retirar'}>
        {gSel && (
          <form className="form-grid modal-grid" onSubmit={saveContribution}>
            <div className="full helper"><strong>Meta:</strong> {gSel.name}</div>
            <div>
              <label>Data</label>
              <input className="input" type="date" value={cDate} onChange={(e)=> setCDate(e.target.value)} required />
            </div>
            <div>
              <label>Valor</label>
              <input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={cAmount} onChange={(e)=> setCAmount(e.target.value)} placeholder="Ex.: 300" required />
            </div>
            <div className="full checkbox-line">
              <input id="createTx" type="checkbox" checked={cCreateTx} onChange={(e)=> setCCreateTx(e.target.checked)} />
              <label htmlFor="createTx">{mode==='deposit' ? 'Criar transação de despesa (guardar dinheiro)' : 'Criar transação de receita (retirada da meta)'}</label>
            </div>
            <div className="full">
              <label>Obs. (opcional)</label>
              <textarea className="input" rows={2} value={cNotes} onChange={(e)=> setCNotes(e.target.value)} />
            </div>
            <div className="full modal-actions">
              <button className="button button-success" type="submit">{mode==='deposit' ? 'Contribuir' : 'Retirar'}</button>
              <button className="button" type="button" onClick={()=> setOpenContrib(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Automatizar (recorrência vinculada) */}
      <Modal open={openAuto} onClose={()=> setOpenAuto(false)} title="Automatizar meta (recorrente)">
        {autoGoal && (
          <form className="form-grid modal-grid" onSubmit={createAutoRecurrence}>
            <div className="full helper"><strong>Meta:</strong> {autoGoal.name}</div>

            <div>
              <label>Tipo</label>
              <select className="select" value={autoType} onChange={(e)=> setAutoType(e.target.value)}>
                <option value="expense">Depósito (despesa)</option>
                <option value="income">Retirada (receita)</option>
              </select>
            </div>
            <div>
              <label>Valor</label>
              <input className="input" type="number" inputMode="decimal" step="0.01" min="0.01" value={autoAmount} onChange={(e)=> setAutoAmount(e.target.value)} placeholder="Ex.: 300" required />
            </div>
            <div>
              <label>Categoria</label>
              <input className="input" value={autoCat} onChange={(e)=> setAutoCat(e.target.value)} placeholder='Ex.: Metas' />
              <div className="helper">Dica: use "Metas" para separar no relatório.</div>
            </div>
            <div>
              <label>Frequência</label>
              <select className="select" value={autoFreq} onChange={(e)=> setAutoFreq(e.target.value)}>
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="daily">Diária</option>
              </select>
            </div>
            <div>
              <label>Intervalo</label>
              <input className="input" type="number" min={1} value={autoInterval} onChange={(e)=> setAutoInterval(Math.max(1, Number(e.target.value)||1))} />
              <div className="helper">1 = todo período, 2 = a cada 2 períodos…</div>
            </div>
            <div>
              <label>Início</label>
              <input className="input" type="date" value={autoStart} onChange={(e)=> setAutoStart(e.target.value)} />
            </div>

            <div className="full modal-actions">
              <button className="button button-success" type="submit">Criar recorrência</button>
              <button className="button" type="button" onClick={()=> setOpenAuto(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Excluir */}
      <ConfirmDialog
        open={!!toDelete}
        title="Excluir meta"
        message={toDelete ? `Excluir definitivamente "${toDelete.name}"? Isso irá APAGAR todas as contribuições e as transações vinculadas a essa meta.` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onConfirm={deleteGoalNow}
        onClose={()=> setToDelete(null)}
      />
    </div>
  );
}
