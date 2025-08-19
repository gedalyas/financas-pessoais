// server.js — API de Finanças Pessoais (categorias + transações + recorrentes + metas)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const DB_FILE = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_FILE);

// ----------------------
// Paleta + nomes PT (categorias)
// ----------------------
const PALETTE = [
  '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f59e0b', '#10b981',
  '#f43f5e', '#8b5cf6', '#14b8a6', '#eab308', '#06b6d4', '#84cc16'
];

const COLOR_NAMES_PT = {
  'azul': '#3b82f6',
  'vermelho': '#ef4444',
  'verde': '#22c55e',
  'amarelo': '#eab308',
  'roxo': '#a855f7',
  'laranja': '#f59e0b',
  'ciano': '#06b6d4',
  'turquesa': '#14b8a6',
  'verde-agua': '#14b8a6',
  'verdeagua': '#14b8a6',
  'rosa': '#f43f5e',
  'lima': '#84cc16',
  'preto': '#111827',
  'cinza': '#64748b',
  'branco': '#e5e7eb'
};

function normalizeStr(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '');
}
function isHexColor(v) { return /^#[0-9A-Fa-f]{6}$/.test(String(v || '')); }
function hash32(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) >>> 0; return h >>> 0; }
function pickColor(name) { return PALETTE[hash32(String(name || '')) % PALETTE.length]; }

function parseColor(colorInput, categoryName) {
  const hasInput = colorInput !== undefined && String(colorInput).trim() !== '';
  if (!hasInput) return { ok: true, color: pickColor(categoryName) };
  const raw = String(colorInput).trim();
  if (isHexColor(raw)) return { ok: true, color: raw };
  const key = normalizeStr(raw);
  const named = COLOR_NAMES_PT[key];
  if (named) return { ok: true, color: named };
  const list = Object.keys(COLOR_NAMES_PT).sort().join(', ');
  return { ok: false, error: `Cor indisponível. Use um #hex ou um dos nomes: ${list}.` };
}

// ----------------------
// Datas locais (corrige UTC)
// ----------------------
function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function addMonthsClamp(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth()+n, 1);
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0,10);
}
function advance(iso, freq, interval) {
  if (freq === 'daily') return addDays(iso, interval);
  if (freq === 'weekly') return addDays(iso, 7*interval);
  return addMonthsClamp(iso, interval); // monthly
}
function computeInitialNextRun(start_date, freq, interval, end_date) {
  const today = todayLocalISO();
  let next = start_date;
  let safety = 0;
  while (next < today && safety++ < 1000) {
    next = advance(next, freq, interval);
  }
  if (end_date && next > end_date) next = end_date;
  return next;
}

// ----------------------
// Helpers (DB)
// ----------------------
function run(sql, params = []) { return new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) reject(err); else resolve(this); })); }
function all(sql, params = []) { return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); })); }
function get(sql, params = []) { return new Promise((resolve, reject) => db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); })); }
async function existsCategory(name) { const row = await get(`SELECT 1 FROM categories WHERE name = ?`, [String(name || '').trim()]); return !!row; }
async function ensureCategory(name) {
  const ok = await existsCategory(name);
  if (ok) return;
  const parsed = parseColor(undefined, name); // cor automática
  await run(`INSERT INTO categories (name, color) VALUES (?, ?)`, [name, parsed.color]);
}
async function goalExists(id) { const row = await get(`SELECT 1 FROM goals WHERE id = ?`, [id]); return !!row; }

// ----------------------
// Schema + Migrações simples
// ----------------------
async function addColumnIfMissing(table, column, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  const has = Array.isArray(cols) && cols.some(c => c.name === column);
  if (!has) { try { await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);} catch(_){} }
}

async function ensureMigrations() {
  await addColumnIfMissing('recurrences', 'goal_id', 'INTEGER');
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT CHECK (type IN ('income','expense')) NOT NULL,
    amount REAL NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#22c55e'
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`);

  db.run(`CREATE TABLE IF NOT EXISTS recurrences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT CHECK (type IN ('income','expense')) NOT NULL,
    amount REAL NOT NULL,
    frequency TEXT CHECK (frequency IN ('daily','weekly','monthly')) NOT NULL,
    interval INTEGER NOT NULL DEFAULT 1,
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_run TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
    -- goal_id será adicionado por migração
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_recur_next ON recurrences(next_run, active)`);

  // --------- Metas ---------
  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    color TEXT NOT NULL DEFAULT '#22c55e',
    start_date TEXT NOT NULL,
    target_date TEXT,
    status TEXT CHECK (status IN ('active','paused','achieved','archived')) NOT NULL DEFAULT 'active',
    notes TEXT
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status)`);

  db.run(`CREATE TABLE IF NOT EXISTS goal_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,   -- +depósito / -retirada
    transaction_id INTEGER, -- id em transactions (opcional)
    source TEXT CHECK (source IN ('manual','transaction','recurrence')) DEFAULT 'manual',
    notes TEXT,
    FOREIGN KEY (goal_id) REFERENCES goals(id)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal_date ON goal_contributions(goal_id, date)`);
});

// dispara migração simples (não bloqueante)
ensureMigrations().catch(()=>{});

// ping
app.get('/', (_req, res) => res.send('API OK'));

// ----------------------
// Categorias (CRUD)
// ----------------------
app.get('/api/categories', async (_req, res) => {
  try {
    const rows = await all(`SELECT id, name, color FROM categories ORDER BY name ASC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, color } = req.body || {};
    const clean = String(name || '').trim();
    if (!clean) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const parsed = parseColor(color, clean);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    await run(`INSERT INTO categories (name, color) VALUES (?, ?)`, [clean, parsed.color]);
    const row = await get(`SELECT id, name, color FROM categories WHERE name = ?`, [clean]);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    const current = await get(`SELECT id, name, color FROM categories WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const nextName = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
    let nextColor = undefined;
    if (req.body?.color !== undefined) {
      const parsed = parseColor(req.body.color, nextName ?? current.name);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      nextColor = parsed.color;
    }

    const set = [], params = [];
    if (nextName !== undefined) { set.push('name = ?'); params.push(nextName); }
    if (nextColor !== undefined) { set.push('color = ?'); params.push(nextColor); }
    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });

    params.push(id);
    await run(`UPDATE categories SET ${set.join(', ')} WHERE id = ?`, params);

    if (nextName !== undefined && nextName !== current.name) {
      await run(`UPDATE transactions SET category = ? WHERE category = ?`, [nextName, current.name]);
      await run(`UPDATE recurrences SET category = ? WHERE category = ?`, [nextName, current.name]);
    }

    const row = await get(`SELECT id, name, color FROM categories WHERE id = ?`, [id]);
    res.json(row);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const cat = await get(`SELECT id, name FROM categories WHERE id = ?`, [id]);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const refTx = await get(`SELECT COUNT(1) AS n FROM transactions WHERE category = ?`, [cat.name]);
    if ((refTx?.n || 0) > 0) {
      return res.status(409).json({ error: 'Existem transações vinculadas a esta categoria. Atualize/remova-as antes de excluir.' });
    }

    const refRec = await get(`SELECT COUNT(1) AS n FROM recurrences WHERE category = ?`, [cat.name]);
    if ((refRec?.n || 0) > 0) {
      return res.status(409).json({ error: 'Existem recorrências usando esta categoria. Atualize/exclua as recorrências antes de excluir a categoria.' });
    }

    await run(`DELETE FROM categories WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----------------------
// Transações
// ----------------------
app.get('/api/transactions', async (req, res) => {
  try {
    const { from, to, category, type } = req.query;
    const where = [], params = [];
    if (from) { where.push('t.date >= ?'); params.push(from); }
    if (to)   { where.push('t.date <= ?'); params.push(to); }
    if (category) { where.push('t.category = ?'); params.push(category); }
    if (type)     { where.push('t.type = ?'); params.push(type); }

    const sql = `
      SELECT t.*, COALESCE(c.color, '#64748b') AS category_color
      FROM transactions t
      LEFT JOIN categories c ON c.name = t.category
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY t.date DESC, t.id DESC
    `;
    const rows = await all(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { date, description, category, type, amount, goal_id } = req.body || {};
    const amt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    if (!date || !description || !category || !type || !Number.isFinite(amt)) {
      return res.status(400).json({ error: 'Campos: date, description, category, type, amount(number).' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
    }
    const ok = await existsCategory(category);
    if (!ok) return res.status(400).json({ error: 'Categoria inexistente. Escolha uma categoria válida.' });

    let gid = null;
    if (goal_id !== undefined && goal_id !== null && goal_id !== '') {
      const id = Number(goal_id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'goal_id inválido.' });
      const gOk = await goalExists(id);
      if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
      gid = id;
    }

    const stmt = await run(
      `INSERT INTO transactions (date, description, category, type, amount) VALUES (?, ?, ?, ?, ?)`,
      [date, String(description).trim(), String(category).trim(), type, amt]
    );

    if (gid) {
      const signed = type === 'expense' ? Math.abs(amt) : -Math.abs(amt);
      await run(
        `INSERT INTO goal_contributions (goal_id, date, amount, transaction_id, source)
         VALUES (?, ?, ?, ?, 'transaction')`,
        [gid, date, signed, stmt.lastID]
      );
    }

    const row = await get(`SELECT * FROM transactions WHERE id = ?`, [stmt.lastID]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    await run(`DELETE FROM transactions WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----------------------
// Resumo
// ----------------------
app.get('/api/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = [], params = [];
    if (from) { where.push('t.date >= ?'); params.push(from); }
    if (to)   { where.push('t.date <= ?'); params.push(to); }

    const totals = await get(
      `SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
       FROM transactions t
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`,
      params
    );

    const byCategory = await all(
      `SELECT t.category AS category,
              SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as income,
              SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as expense,
              COALESCE(c.color, '#64748b') as color
       FROM transactions t
       LEFT JOIN categories c ON c.name = t.category
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       GROUP BY t.category
       ORDER BY (income - expense) DESC`,
      params
    );

    res.json({
      income: totals?.income ?? 0,
      expense: totals?.expense ?? 0,
      balance: (totals?.income ?? 0) - (totals?.expense ?? 0),
      byCategory
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ----------------------
// Recorrências (CRUD + processor)
// ----------------------
const VALID_FREQ = new Set(['daily','weekly','monthly']);

app.get('/api/recurrences', async (_req, res) => {
  try {
    const rows = await all(`SELECT * FROM recurrences ORDER BY active DESC, next_run ASC, id ASC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recurrences', async (req, res) => {
  try {
    let { description, category, type, amount, frequency, interval, start_date, end_date, active, goal_id } = req.body || {};
    const amt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    description = String(description || '').trim();
    category = String(category || '').trim();
    type = String(type || '').trim();
    frequency = String(frequency || '').trim();
    interval = Number(interval || 1);
    start_date = String(start_date || '').trim();
    end_date = end_date ? String(end_date).trim() : null;
    active = active === undefined ? 1 : (Number(Boolean(active)) ? 1 : 0);

    let gid = null;
    if (goal_id !== undefined && goal_id !== null && goal_id !== '') {
      const id = Number(goal_id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'goal_id inválido.' });
      const gOk = await goalExists(id);
      if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
      gid = id;
      // boa prática: garantir categoria "Metas" caso queira usá-la
      if (category.toLowerCase() === 'metas') await ensureCategory('Metas');
    }

    if (!description || !category || !type || !Number.isFinite(amt) || !start_date || !VALID_FREQ.has(frequency)) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, category, type, amount, frequency (daily|weekly|monthly), start_date.' });
    }
    if (!['income','expense'].includes(type)) return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
    if (!(interval >= 1 && Number.isInteger(interval))) return res.status(400).json({ error: 'interval deve ser inteiro >= 1.' });

    const next_run = computeInitialNextRun(start_date, frequency, interval, end_date);
    const stmt = await run(
      `INSERT INTO recurrences (description, category, type, amount, frequency, interval, start_date, end_date, next_run, active, goal_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [description, category, type, amt, frequency, interval, start_date, end_date, next_run, active, gid]
    );
    const row = await get(`SELECT * FROM recurrences WHERE id = ?`, [stmt.lastID]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/recurrences/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const current = await get(`SELECT * FROM recurrences WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ error: 'Recorrência não encontrada.' });

    const fields = {};
    const set = [], params = [];

    if (req.body.description !== undefined) {
      fields.description = String(req.body.description).trim();
      if (!fields.description) return res.status(400).json({ error: 'Descrição obrigatória.' });
    }
    if (req.body.category !== undefined) {
      fields.category = String(req.body.category).trim();
      if (fields.category.toLowerCase() === 'metas') await ensureCategory('Metas');
    }
    if (req.body.type !== undefined) {
      fields.type = String(req.body.type).trim();
      if (!['income','expense'].includes(fields.type)) return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
    }
    if (req.body.amount !== undefined) {
      const amt = typeof req.body.amount === 'number' ? req.body.amount : parseFloat(String(req.body.amount).replace(',', '.'));
      if (!Number.isFinite(amt)) return res.status(400).json({ error: 'amount inválido.' });
      fields.amount = amt;
    }
    if (req.body.frequency !== undefined) {
      fields.frequency = String(req.body.frequency).trim();
      if (!VALID_FREQ.has(fields.frequency)) return res.status(400).json({ error: 'frequency inválida.' });
    }
    if (req.body.interval !== undefined) {
      fields.interval = Number(req.body.interval);
      if (!(fields.interval >= 1 && Number.isInteger(fields.interval))) return res.status(400).json({ error: 'interval deve ser inteiro >= 1.' });
    }
    if (req.body.start_date !== undefined) {
      fields.start_date = String(req.body.start_date).trim();
      if (!fields.start_date) return res.status(400).json({ error: 'start_date obrigatório.' });
    }
    if (req.body.end_date !== undefined) {
      fields.end_date = req.body.end_date ? String(req.body.end_date).trim() : null;
    }
    if (req.body.active !== undefined) {
      fields.active = Number(Boolean(req.body.active));
    }
    if (req.body.goal_id !== undefined) {
      if (req.body.goal_id === null) {
        fields.goal_id = null;
      } else {
        const gid = Number(req.body.goal_id);
        if (!Number.isInteger(gid)) return res.status(400).json({ error: 'goal_id inválido.' });
        const gOk = await goalExists(gid);
        if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
        fields.goal_id = gid;
      }
    }

    for (const [k,v] of Object.entries(fields)) { set.push(`${k} = ?`); params.push(v); }

    const nextDependencies = ['frequency','interval','start_date'];
    if (nextDependencies.some(k => fields[k] !== undefined)) {
      const freq = fields.frequency ?? current.frequency;
      const intv = fields.interval ?? current.interval;
      const start = fields.start_date ?? current.start_date;
      const next = computeInitialNextRun(start, freq, intv, fields.end_date ?? current.end_date);
      set.push('next_run = ?'); params.push(next);
    }

    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });
    params.push(id);
    await run(`UPDATE recurrences SET ${set.join(', ')} WHERE id = ?`, params);
    const row = await get(`SELECT * FROM recurrences WHERE id = ?`, [id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/recurrences/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    await run(`DELETE FROM recurrences WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// roda processador manualmente (todas)
app.post('/api/recurrences/run', async (_req, res) => {
  try {
    const count = await processRecurrences();
    res.json({ ok: true, generated: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// roda processador para uma recorrência (suporta force=1 para "Lançar hoje" + dedupe)
app.post('/api/recurrences/:id/run', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const force = String(req.query.force || '').toLowerCase();
    const doForce = force === '1' || force === 'true';
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const r = await get(`SELECT * FROM recurrences WHERE id = ?`, [id]);
    if (!r) return res.status(404).json({ error: 'Recorrência não encontrada.' });
    if (r.active !== 1) return res.status(409).json({ error: 'Recorrência pausada.' });

    const today = todayLocalISO();

    // se está vencida ou igual a hoje, delega pro processador normal
    if (!doForce || r.next_run <= today) {
      const count = await processRecurrences(id);
      return res.json({ ok: true, generated: count });
    }

    // Forçar HOJE com dedupe
    const exists = await get(
      `SELECT 1 FROM transactions 
       WHERE date=? AND description=? AND category=? AND type=? AND amount=? LIMIT 1`,
      [today, r.description, r.category, r.type, r.amount]
    );
    if (exists) {
      const next = advance(today, r.frequency, r.interval);
      await run(`UPDATE recurrences SET next_run = ? WHERE id = ?`, [next, r.id]);
      return res.json({ ok: true, generated: 0, deduped: true });
    }

    // cria transação
    const ins = await run(
      `INSERT INTO transactions (date, description, category, type, amount)
       VALUES (?, ?, ?, ?, ?)`,
      [today, r.description, r.category, r.type, r.amount]
    );

    // se estiver vinculada a meta, cria contribuição
    if (r.goal_id) {
      const signed = r.type === 'expense' ? Math.abs(r.amount) : -Math.abs(r.amount);
      await run(
        `INSERT INTO goal_contributions (goal_id, date, amount, transaction_id, source)
         VALUES (?, ?, ?, ?, 'recurrence')`,
        [r.goal_id, today, signed, ins.lastID]
      );
    }

    const next = advance(today, r.frequency, r.interval);
    await run(`UPDATE recurrences SET next_run = ? WHERE id = ?`, [next, r.id]);

    return res.json({ ok: true, generated: 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------
// Processador de recorrências
// ----------------------
async function processRecurrences(onlyId = null) {
  const today = todayLocalISO();
  const rows = await all(
    `SELECT * FROM recurrences
     WHERE active = 1
       AND next_run <= ?
       ${onlyId ? 'AND id = ?' : ''}
     ORDER BY next_run ASC, id ASC`,
    onlyId ? [today, onlyId] : [today]
  );

  let generated = 0;
  for (const r of rows) {
    let next = r.next_run;
    let safety = 0;
    const limit = r.end_date || '9999-12-31';
    while (next <= today && next <= limit && safety++ < 100) {
      const ins = await run(
        `INSERT INTO transactions (date, description, category, type, amount)
         VALUES (?, ?, ?, ?, ?)`,

        [next, r.description, r.category, r.type, r.amount]
      );
      // contribuição automática se tiver goal_id
      if (r.goal_id) {
        const signed = r.type === 'expense' ? Math.abs(r.amount) : -Math.abs(r.amount);
        await run(
          `INSERT INTO goal_contributions (goal_id, date, amount, transaction_id, source)
           VALUES (?, ?, ?, ?, 'recurrence')`,
          [r.goal_id, next, signed, ins.lastID]
        );
      }
      generated++;
      next = advance(next, r.frequency, r.interval);
    }
    if (next !== r.next_run) {
      await run(`UPDATE recurrences SET next_run = ? WHERE id = ?`, [next, r.id]);
    }
  }
  return generated;
}

// agenda a cada 60s
setInterval(() => { processRecurrences().catch(() => {}); }, 60 * 1000);

// roda na inicialização
processRecurrences().catch(() => {});

// ----------------------
// Metas (Goals)
// ----------------------
function monthsBetween(startISO, endISO) {
  const a = new Date(startISO + 'T00:00:00');
  const b = new Date(endISO + 'T00:00:00');
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

// Lista metas com campos calculados
app.get('/api/goals', async (_req, res) => {
  try {
    const rows = await all(`
      SELECT g.*,
             COALESCE(SUM(gc.amount), 0) AS saved
      FROM goals g
      LEFT JOIN goal_contributions gc ON gc.goal_id = g.id
      GROUP BY g.id
      ORDER BY 
        CASE g.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'achieved' THEN 2 ELSE 3 END,
        g.id ASC
    `);

    const today = todayLocalISO();
    const enriched = rows.map((g) => {
      const saved = Number(g.saved || 0);
      const target = Number(g.target_amount || 0);
      const missing = Math.max(0, target - saved);
      const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((saved / target) * 100))) : 0;

      let suggested_monthly = null;
      if (g.target_date) {
        const m = Math.max(1, monthsBetween(today, g.target_date));
        suggested_monthly = missing > 0 ? missing / m : 0;
      }
      return { ...g, saved, missing, percent, suggested_monthly };
    });

    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar meta
app.post('/api/goals', async (req, res) => {
  try {
    const { name, target_amount, color, target_date, notes } = req.body || {};
    const clean = String(name || '').trim();
    const amt = typeof target_amount === 'number' ? target_amount : parseFloat(String(target_amount).replace(',', '.'));
    if (!clean) return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'target_amount inválido.' });

    let parsedColor = parseColor(color, clean);
    if (!parsedColor.ok) return res.status(400).json({ error: parsedColor.error });

    const start = todayLocalISO();
    const tdate = target_date ? String(target_date).trim() : null;

    const stmt = await run(
      `INSERT INTO goals (name, target_amount, color, start_date, target_date, status, notes)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [clean, amt, parsedColor.color, start, tdate, notes || null]
    );
    const row = await get(`SELECT * FROM goals WHERE id = ?`, [stmt.lastID]);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar meta
app.patch('/api/goals/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    const current = await get(`SELECT * FROM goals WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ error: 'Meta não encontrada.' });

    const set = [], params = [];
    if (req.body.name !== undefined) {
      const v = String(req.body.name).trim();
      if (!v) return res.status(400).json({ error: 'Nome é obrigatório.' });
      set.push('name = ?'); params.push(v);
    }
    if (req.body.target_amount !== undefined) {
      const amt = typeof req.body.target_amount === 'number' ? req.body.target_amount : parseFloat(String(req.body.target_amount).replace(',', '.'));
      if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'target_amount inválido.' });
      set.push('target_amount = ?'); params.push(amt);
    }
    if (req.body.color !== undefined) {
      const parsed = parseColor(req.body.color, req.body.name ?? current.name);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      set.push('color = ?'); params.push(parsed.color);
    }
    if (req.body.target_date !== undefined) {
      const v = req.body.target_date ? String(req.body.target_date).trim() : null;
      set.push('target_date = ?'); params.push(v);
    }
    if (req.body.status !== undefined) {
      const st = String(req.body.status).trim();
      if (!['active','paused','achieved','archived'].includes(st)) return res.status(400).json({ error: 'status inválido.' });
      set.push('status = ?'); params.push(st);
    }
    if (req.body.notes !== undefined) {
      set.push('notes = ?'); params.push(req.body.notes ? String(req.body.notes) : null);
    }

    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });
    params.push(id);
    await run(`UPDATE goals SET ${set.join(', ')} WHERE id = ?`, params);
    const row = await get(`SELECT * FROM goals WHERE id = ?`, [id]);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir meta (SEMPRE em cascata: contribuições + transações ligadas)
app.delete('/api/goals/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    await run('BEGIN');
    try {
      await run(`
        DELETE FROM transactions 
        WHERE id IN (
          SELECT transaction_id FROM goal_contributions 
          WHERE goal_id = ? AND transaction_id IS NOT NULL
        )
      `, [id]);

      await run(`DELETE FROM goal_contributions WHERE goal_id = ?`, [id]);
      const result = await run(`DELETE FROM goals WHERE id = ?`, [id]);

      await run('COMMIT');
      if ((result?.changes ?? 0) === 0) {
        return res.status(404).json({ error: 'Meta não encontrada.' });
      }
      res.json({ ok: true, cascade: true });
    } catch (e) {
      await run('ROLLBACK');
      throw e;
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar contribuições
app.get('/api/goals/:id/contributions', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await all(`SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY date ASC, id ASC`, [id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar contribuição (depósito + / retirada -) com opção de gerar transação
app.post('/api/goals/:id/contributions', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const g = await get(`SELECT * FROM goals WHERE id = ?`, [id]);
    if (!g) return res.status(404).json({ error: 'Meta não encontrada.' });

    let { date, amount, createTransaction, notes } = req.body || {};
    date = String(date || '').trim() || todayLocalISO();
    const amt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt === 0) return res.status(400).json({ error: 'amount inválido.' });

    let txId = null;
    if (createTransaction) {
      await ensureCategory('Metas');
      const type = amt > 0 ? 'expense' : 'income';  // depósito = saída; retirada = entrada
      const ins = await run(
        `INSERT INTO transactions (date, description, category, type, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [date, `Meta: ${g.name}`, 'Metas', type, Math.abs(amt)]
      );
      txId = ins.lastID || null;
    }

    const st = await run(
      `INSERT INTO goal_contributions (goal_id, date, amount, transaction_id, source, notes)
       VALUES (?, ?, ?, ?, 'manual', ?)`,
      [id, date, amt, txId, notes || null]
    );

    const row = await get(`SELECT * FROM goal_contributions WHERE id = ?`, [st.lastID]);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir contribuição (opcionalmente apaga transação vinculada ?deleteTransaction=1)
app.delete('/api/goals/:id/contributions/:cid', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cid = Number(req.params.cid);
    const delTx = String(req.query.deleteTransaction || '').toLowerCase();
    const alsoTx = delTx === '1' || delTx === 'true';

    const row = await get(`SELECT * FROM goal_contributions WHERE id = ? AND goal_id = ?`, [cid, id]);
    if (!row) return res.status(404).json({ error: 'Contribuição não encontrada.' });

    if (alsoTx && row.transaction_id) {
      await run(`DELETE FROM transactions WHERE id = ?`, [row.transaction_id]);
    }
    await run(`DELETE FROM goal_contributions WHERE id = ?`, [cid]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API em http://localhost:${PORT}`));
