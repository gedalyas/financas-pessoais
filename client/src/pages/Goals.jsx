import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/goals`, { cache: 'no-store' });
      const j = await r.json();
      setList(Array.isArray(j) ? j : []);
      setErr(null);
    } catch (e) {
      setErr('Falha ao carregar metas');
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
    const r = await fetch(`${API_URL}/api/goals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok) { alert(j.error || 'Erro ao criar meta'); return; }
    setOpenNew(false);
    setGName(''); setGTarget(''); setGTargetDate(''); setGColor(''); setGNotes('');
    load();
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
    const r = await fetch(`${API_URL}/api/goals/${gSel.id}/contributions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const j = await r.json().catch(()=> ({}));
    if (!r.ok) { alert(j.error || 'Erro ao salvar'); return; }
    setOpenContrib(false); setGSel(null);
    load();
  }

  async function setStatus(g, st) {
    const r = await fetch(`${API_URL}/api/goals/${g.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st })
    });
    if (r.ok) load();
  }

  // EXCLUSÃO DEFINITIVA: apaga contribuições e transações ligadas a elas
  async function deleteGoalNow() {
    if (!toDelete) return;
    const r = await fetch(`${API_URL}/api/goals/${toDelete.id}?force=1`, { method: 'DELETE' });
    setToDelete(null);
    if (!r.ok) {
      const j = await r.json().catch(()=> ({}));
      alert(j.error || 'Falha ao excluir meta.');
    } else {
      load();
    }
  }

  // sugestão mensal ao preencher valor + data-alvo
  const monthlySuggestion = (() => {
    const tgt = parseFloat(String(gTarget).replace(',', '.'));
    if (!gTargetDate || !Number.isFinite(tgt) || tgt <= 0) return null;
    const months = Math.max(1, monthsBetween(todayISO(), gTargetDate));
    return tgt / months;
  })();

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

                <div className="goal-actions">
                  <button className="button" onClick={()=> openContribModal(g, 'deposit')}>Contribuir</button>
                  <button className="button" onClick={()=> openContribModal(g, 'withdraw')}>Retirar</button>
                  {g.status !== 'achieved' && g.percent >= 100 ? (
                    <button className="button" onClick={()=> setStatus(g, 'achieved')}>Concluir</button>
                  ) : null}
                  <button className="button" onClick={()=> setStatus(g, g.status === 'active' ? 'paused' : 'active')}>
                    {g.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                  <button className="button button-danger" onClick={()=> setToDelete(g)}>Excluir</button>
                </div>
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
