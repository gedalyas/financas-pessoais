// server.js — API de Finanças Pessoais (multiusuário: categorias + transações + recorrentes + metas + limites)
require('dotenv').config();
const express = require('express');
const cors = require('cors'); // ✅ apenas UMA vez
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const checkoutRoutes = require('./checkout');

const app = express();

const allowedOrigins = [
  "https://app.prosperafinancas.com",
  "https://prosperafinancas.com",
  "https://financas-pessoais-three.vercel.app", // enquanto o front estiver nesse domínio
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Render / Postman / health checks
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.options("*", cors());

app.use(express.json());
app.use(morgan('dev'));

// 🔓 Rotas públicas (não exigem login)
app.use('/api', checkoutRoutes);

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Erro ao abrir DB:', err);
});


// Habilita FKs no SQLite
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL'); // melhor concorrência
});

// ================ AUTH ================
const mountAuth = require('./auth');
mountAuth(app, db);

app.use('/api', app.authRequired, (req, _res, next) => {
  req.authUserId = Number(req.user.id);
  next();
});

const mountSettings = require('./settings');
mountSettings(app, db);

const mountWebhooks = require('./webhooks');
mountWebhooks(app, db);

// ================ CORES / CATEGORIAS ================
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

// 🔹 Categorias padrão para novos usuários (só na 1ª vez)
const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Lazer',
  'Saúde',
  'Educação',
  'Roupas',
  'Serviços',
  'Impostos',
  'Investimentos',
  'Salário',
  'Outros'
];

function normalizeStr(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, '');
}
function isHexColor(v) { return /^#[0-9A-Fa-f]{6}$/.test(String(v || '')); }
function hash32(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h >>> 0; }
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

// ================ DATAS (corrige UTC) ================
function todayLocalISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function addMonthsClamp(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  d.setMonth(d.getMonth() + n, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
function advance(iso, freq, interval) {
  if (freq === 'daily') return addDays(iso, interval);
  if (freq === 'weekly') return addDays(iso, 7 * interval);
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

// Durações de limites
const LIMIT_DURATIONS = {
  '1d': { type: 'days', n: 1, label: '1 dia' },
  '1w': { type: 'days', n: 7, label: '1 semana' },
  '2w': { type: 'days', n: 14, label: '2 semanas' },
  '1m': { type: 'months', n: 1, label: '1 mês' },
  '2m': { type: 'months', n: 2, label: '2 meses' },
  '4m': { type: 'months', n: 4, label: '4 meses' },
  '6m': { type: 'months', n: 6, label: '6 meses' },
  '1y': { type: 'months', n: 12, label: '1 ano' },
};
function computeLimitEnd(startISO, durationCode) {
  const d = LIMIT_DURATIONS[durationCode];
  if (!d) return startISO;
  if (d.type === 'days') return addDays(startISO, d.n - 1); // inclusivo
  // meses: avança N meses e volta 1 dia para inclusivo
  const afterNMonths = addMonthsClamp(startISO, d.n);
  return addDays(afterNMonths, -1);
}

// ================ HELPERS DB ================
function run(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    })
  );
}
function all(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    })
  );
}
function get(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    })
  );
}

// ✅ Helper novo: existe a tabela?
async function tableExists(table) {
  const row = await get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
    [table]
  );
  return !!row;
}

// Helpers específicos com user_id
async function existsCategory(userId, name) {
  const row = await get(`SELECT 1 FROM categories WHERE user_id = ? AND name = ?`, [userId, String(name || '').trim()]);
  return !!row;
}
async function ensureCategory(userId, name) {
  const ok = await existsCategory(userId, name);
  if (ok) return;
  const parsed = parseColor(undefined, name); // cor automática
  await run(`INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)`, [userId, name, parsed.color]);
}
async function goalExists(userId, id) {
  const row = await get(`SELECT 1 FROM goals WHERE user_id = ? AND id = ?`, [userId, id]);
  return !!row;
}

// 🔹 Cria categorias padrão na 1ª visita de cada usuário
async function seedDefaultCategoriesForUser(userId) {
  const countRow = await get(`SELECT COUNT(1) AS n FROM categories WHERE user_id = ?`, [userId]);
  if ((countRow?.n || 0) > 0) return; // já tem alguma categoria

  for (const name of DEFAULT_CATEGORIES) {
    const exists = await existsCategory(userId, name);
    if (!exists) {
      const parsed = parseColor(undefined, name);
      try {
        await run(
          `INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)`,
          [userId, name, parsed.color]
        );
      } catch (e) {
        if (!String(e.message || '').includes('UNIQUE')) throw e;
      }
    }
  }
}

// ================ SCHEMA + MIGRAÇÕES ================

// Cria tabela users (simples). Seu ./auth pode gerenciar senhas/tokens à parte.
async function ensureUsersTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
}

// Garante/obtém usuário padrão para migrar dados legados.
async function ensureDefaultUser() {
  const email = process.env.DEV_DEFAULT_USER_EMAIL || 'default@local';
  let u = await get(`SELECT id FROM users WHERE email = ?`, [email]);
  if (!u) {
    await run(
      `INSERT INTO users (email, name, password_hash) VALUES (?, ?, '')`,
      [email, 'Default']
    );
    u = await get(`SELECT id FROM users WHERE email = ?`, [email]);
  }
  return u.id;
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await tableExists(table))) return;
  const cols = await all(`PRAGMA table_info(${table})`);
  const has = Array.isArray(cols) && cols.some(c => c.name === column);
  if (!has) {
    try {
      await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch (_) { }
  }
}
async function tableHasColumn(table, column) {
  const cols = await all(`PRAGMA table_info(${table})`);
  return Array.isArray(cols) && cols.some(c => c.name === column);
}

// Rebuild de categories quando não tem user_id (remove UNIQUE global de name)
async function migrateCategoriesToMultiUser(defaultUserId) {
  const exists = await tableExists('categories');
  if (!exists) return;

  const hasUserId = await tableHasColumn('categories', 'user_id');
  if (hasUserId) {
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name ON categories(user_id, name)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`);
    return;
  }

  await run('BEGIN');
  try {
    await run(`ALTER TABLE categories RENAME TO categories_old`);

    await run(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#22c55e',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name ON categories(user_id, name)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`);

    await run(
      `INSERT INTO categories (id, user_id, name, color)
       SELECT id, ?, name, color FROM categories_old`,
      [defaultUserId]
    );

    await run(`DROP TABLE categories_old`);
    await run('COMMIT');
  } catch (e) {
    await run('ROLLBACK');
    throw e;
  }
}

// Migrações gerais para colunas user_id nas demais tabelas
async function migrateAddUserId(defaultUserId) {
  // transactions
  await addColumnIfMissing('transactions', 'user_id', 'INTEGER');
  await run(`UPDATE transactions SET user_id = COALESCE(user_id, ?) WHERE user_id IS NULL`, [defaultUserId]);
  await run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date, id)`);

  // recurrences
  await addColumnIfMissing('recurrences', 'user_id', 'INTEGER');
  await run(`UPDATE recurrences SET user_id = COALESCE(user_id, ?) WHERE user_id IS NULL`, [defaultUserId]);
  await run(`CREATE INDEX IF NOT EXISTS idx_recur_user_next ON recurrences(user_id, next_run, active)`);
  await addColumnIfMissing('recurrences', 'goal_id', 'INTEGER');

  // goals
  await addColumnIfMissing('goals', 'user_id', 'INTEGER');
  await run(`UPDATE goals SET user_id = COALESCE(user_id, ?) WHERE user_id IS NULL`, [defaultUserId]);
  await run(`CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status)`);

  // goal_contributions
  await addColumnIfMissing('goal_contributions', 'user_id', 'INTEGER');
  await run(`UPDATE goal_contributions SET user_id = COALESCE(user_id, ?) WHERE user_id IS NULL`, [defaultUserId]);
  await run(`CREATE INDEX IF NOT EXISTS idx_goal_contrib_user_goal_date ON goal_contributions(user_id, goal_id, date)`);
}

// Criação "fresh" do schema (caso DB novo)
async function ensureSchemaFresh() {
  // ===== USERS (alinhado com auth.js) =====
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reset_token TEXT,
      reset_expires TEXT
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

  // ===== TRANSACTIONS =====
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT CHECK (type IN ('income','expense')) NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date, id)`);

  // ===== CATEGORIES =====
  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#22c55e',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name ON categories(user_id, name)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`);

  // ===== RECURRENCES =====
  await run(`
    CREATE TABLE IF NOT EXISTS recurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT CHECK (type IN ('income','expense')) NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT CHECK (frequency IN ('daily','weekly','monthly')) NOT NULL,
      interval INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_run TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      goal_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_recur_user_next ON recurrences(user_id, next_run, active)`);

  // ===== GOALS =====
  await run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      color TEXT NOT NULL DEFAULT '#22c55e',
      start_date TEXT NOT NULL,
      target_date TEXT,
      status TEXT CHECK (status IN ('active','paused','achieved','archived')) NOT NULL DEFAULT 'active',
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status)`);

  // ===== GOAL CONTRIBUTIONS =====
  await run(`
    CREATE TABLE IF NOT EXISTS goal_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      goal_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      transaction_id INTEGER,
      source TEXT CHECK (source IN ('manual','transaction','recurrence')) DEFAULT 'manual',
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_goal_contrib_user_goal_date ON goal_contributions(user_id, goal_id, date)`);

  // ===== LIMITS =====
  await run(`
    CREATE TABLE IF NOT EXISTS limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date  TEXT NOT NULL,
      duration_code TEXT NOT NULL CHECK (duration_code IN ('1d','1w','2w','1m','2m','4m','6m','1y')),
      max_amount REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','paused','archived')) DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_limits_user ON limits(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_limits_user_status ON limits(user_id, status)`);

  // ===== PURCHASE TOKENS (convites/licenças) =====
  await run(`
    CREATE TABLE IF NOT EXISTS purchase_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_hash TEXT NOT NULL,
      issued_to_email TEXT,
      order_id TEXT,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_pt_hash ON purchase_tokens(code_hash)`);
}


// Orquestra migrações (suporta bancos antigos)
async function ensureMigrations() {
  await ensureUsersTable();
  const defaultUserId = await ensureDefaultUser();

  const hasAnyLegacy =
    (await tableExists('categories')) ||
    (await tableExists('transactions')) ||
    (await tableExists('recurrences')) ||
    (await tableExists('goals')) ||
    (await tableExists('goal_contributions'));

  if (!hasAnyLegacy) {
    await ensureSchemaFresh();
    return;
  }

  await migrateCategoriesToMultiUser(defaultUserId);
  await migrateAddUserId(defaultUserId);
  await ensureSchemaFresh();
}

// dispara migração não bloqueante
ensureMigrations().catch((e) => console.error('Falha em migrações:', e));

// ================ PING ================
app.get('/', (_req, res) => res.send('API OK'));



// ================ CATEGORIAS (CRUD) ================
app.get('/api/categories', async (req, res) => {
  try {
    const uid = req.authUserId;

    // 🔹 Semeia categorias padrão se o usuário ainda não tem nenhuma
    await seedDefaultCategoriesForUser(uid);

    const rows = await all(
      `SELECT id, name, color FROM categories WHERE user_id = ? ORDER BY name ASC`,
      [uid]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const uid = req.authUserId;
    const { name, color } = req.body || {};
    const clean = String(name || '').trim();
    if (!clean) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const parsed = parseColor(color, clean);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });

    await run(`INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)`, [uid, clean, parsed.color]);
    const row = await get(`SELECT id, name, color FROM categories WHERE user_id = ? AND name = ?`, [uid, clean]);
    res.status(201).json(row);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/categories/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    const current = await get(`SELECT id, name, color FROM categories WHERE user_id = ? AND id = ?`, [uid, id]);
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

    params.push(uid, id);
    await run(`UPDATE categories SET ${set.join(', ')} WHERE user_id = ? AND id = ?`, params);

    if (nextName !== undefined && nextName !== current.name) {
      await run(`UPDATE transactions SET category = ? WHERE user_id = ? AND category = ?`, [nextName, uid, current.name]);
      await run(`UPDATE recurrences SET category = ? WHERE user_id = ? AND category = ?`, [nextName, uid, current.name]);
    }

    const row = await get(`SELECT id, name, color FROM categories WHERE user_id = ? AND id = ?`, [uid, id]);
    res.json(row);
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const cat = await get(`SELECT id, name FROM categories WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const refTx = await get(`SELECT COUNT(1) AS n FROM transactions WHERE user_id = ? AND category = ?`, [uid, cat.name]);
    if ((refTx?.n || 0) > 0) {
      return res.status(409).json({ error: 'Existem transações vinculadas a esta categoria. Atualize/remova-as antes de excluir.' });
    }
    const refRec = await get(`SELECT COUNT(1) AS n FROM recurrences WHERE user_id = ? AND category = ?`, [uid, cat.name]);
    if ((refRec?.n || 0) > 0) {
      return res.status(409).json({ error: 'Existem recorrências usando esta categoria. Atualize/exclua as recorrências antes de excluir a categoria.' });
    }

    await run(`DELETE FROM categories WHERE user_id = ? AND id = ?`, [uid, id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================ TRANSAÇÕES ================
app.get('/api/transactions', async (req, res) => {
  try {
    const uid = req.authUserId;
    const { from, to, category, type } = req.query;
    const where = ['t.user_id = ?'];
    const params = [uid];

    if (from) { where.push('t.date >= ?'); params.push(from); }
    if (to) { where.push('t.date <= ?'); params.push(to); }
    if (category) { where.push('t.category = ?'); params.push(category); }
    if (type) { where.push('t.type = ?'); params.push(type); }

    const sql = `
      SELECT t.*, COALESCE(c.color, '#64748b') AS category_color
      FROM transactions t
      LEFT JOIN categories c ON c.user_id = t.user_id AND c.name = t.category
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY t.date DESC, t.id DESC
    `;
    const rows = await all(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const uid = req.authUserId;
    const { date, description, category, type, amount, goal_id } = req.body || {};
    const amt = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(',', '.'));
    if (!date || !description || !category || !type || !Number.isFinite(amt)) {
      return res.status(400).json({ error: 'Campos: date, description, category, type, amount(number).' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
    }
    const ok = await existsCategory(uid, category);
    if (!ok) return res.status(400).json({ error: 'Categoria inexistente. Escolha uma categoria válida.' });

    let gid = null;
    if (goal_id !== undefined && goal_id !== null && goal_id !== '') {
      const id = Number(goal_id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'goal_id inválido.' });
      const gOk = await goalExists(uid, id);
      if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
      gid = id;
    }

    const stmt = await run(
      `INSERT INTO transactions (user_id, date, description, category, type, amount) VALUES (?, ?, ?, ?, ?, ?)`,
      [uid, date, String(description).trim(), String(category).trim(), type, amt]
    );

    if (gid) {
      const signed = type === 'expense' ? Math.abs(amt) : -Math.abs(amt);
      await run(
        `INSERT INTO goal_contributions (user_id, goal_id, date, amount, transaction_id, source)
         VALUES (?, ?, ?, ?, ?, 'transaction')`,
        [uid, gid, date, signed, stmt.lastID]
      );
    }

    const row = await get(`SELECT * FROM transactions WHERE user_id = ? AND id = ?`, [uid, stmt.lastID]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const r = await run(`DELETE FROM transactions WHERE user_id = ? AND id = ?`, [uid, id]);
    if ((r?.changes || 0) === 0) return res.status(404).json({ error: 'Transação não encontrada.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================ RESUMO ================
app.get('/api/summary', async (req, res) => {
  try {
    const uid = req.authUserId;
    const { from, to } = req.query;
    const where = ['t.user_id = ?'];
    const params = [uid];
    if (from) { where.push('t.date >= ?'); params.push(from); }
    if (to) { where.push('t.date <= ?'); params.push(to); }

    const totals = await get(
      `
      SELECT 
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
       FROM transactions t
       WHERE ${where.join(' AND ')}
      `,
      params
    );

    const byCategory = await all(
      `
      SELECT t.category AS category,
             SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as income,
             SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as expense,
             COALESCE(c.color, '#64748b') as color
       FROM transactions t
       LEFT JOIN categories c ON c.user_id = t.user_id AND c.name = t.category
       WHERE ${where.join(' AND ')}
       GROUP BY t.category
       ORDER BY (income - expense) DESC
      `,
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

// ================ RECORRÊNCIAS (CRUD + PROCESSADOR) ================
const VALID_FREQ = new Set(['daily', 'weekly', 'monthly']);

app.get('/api/recurrences', async (req, res) => {
  try {
    const uid = req.authUserId;
    const rows = await all(
      `SELECT * FROM recurrences WHERE user_id = ? ORDER BY active DESC, next_run ASC, id ASC`,
      [uid]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recurrences', async (req, res) => {
  try {
    const uid = req.authUserId;
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
      const gOk = await goalExists(uid, id);
      if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
      gid = id;
      if (category.toLowerCase() === 'metas') await ensureCategory(uid, 'Metas');
    }

    if (!description || !category || !type || !Number.isFinite(amt) || !start_date || !VALID_FREQ.has(frequency)) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, category, type, amount, frequency (daily|weekly|monthly), start_date.' });
    }
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
    if (!(interval >= 1 && Number.isInteger(interval))) return res.status(400).json({ error: 'interval deve ser inteiro >= 1.' });

    const next_run = computeInitialNextRun(start_date, frequency, interval, end_date);
    const stmt = await run(
      `INSERT INTO recurrences (user_id, description, category, type, amount, frequency, interval, start_date, end_date, next_run, active, goal_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [uid, description, category, type, amt, frequency, interval, start_date, end_date, next_run, active, gid]
    );
    const row = await get(`SELECT * FROM recurrences WHERE user_id = ? AND id = ?`, [uid, stmt.lastID]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/recurrences/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const current = await get(`SELECT * FROM recurrences WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!current) return res.status(404).json({ error: 'Recorrência não encontrada.' });

    const fields = {};
    const set = [], params = [];

    if (req.body.description !== undefined) {
      fields.description = String(req.body.description).trim();
      if (!fields.description) return res.status(400).json({ error: 'Descrição obrigatória.' });
    }
    if (req.body.category !== undefined) {
      fields.category = String(req.body.category).trim();
      if (fields.category.toLowerCase() === 'metas') await ensureCategory(uid, 'Metas');
    }
    if (req.body.type !== undefined) {
      fields.type = String(req.body.type).trim();
      if (!['income', 'expense'].includes(fields.type)) return res.status(400).json({ error: "type deve ser 'income' ou 'expense'." });
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
        const gOk = await goalExists(uid, gid);
        if (!gOk) return res.status(404).json({ error: 'Meta não encontrada.' });
        fields.goal_id = gid;
      }
    }

    for (const [k, v] of Object.entries(fields)) { set.push(`${k} = ?`); params.push(v); }

    const nextDependencies = ['frequency', 'interval', 'start_date', 'end_date'];
    if (nextDependencies.some(k => fields[k] !== undefined)) {
      const freq = fields.frequency ?? current.frequency;
      const intv = fields.interval ?? current.interval;
      const start = fields.start_date ?? current.start_date;
      const next = computeInitialNextRun(start, freq, intv, fields.end_date ?? current.end_date);
      set.push('next_run = ?'); params.push(next);
    }

    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });
    params.push(uid, id);
    await run(`UPDATE recurrences SET ${set.join(', ')} WHERE user_id = ? AND id = ?`, params);
    const row = await get(`SELECT * FROM recurrences WHERE user_id = ? AND id = ?`, [uid, id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/recurrences/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    const r = await run(`DELETE FROM recurrences WHERE user_id = ? AND id = ?`, [uid, id]);
    if ((r?.changes || 0) === 0) return res.status(404).json({ error: 'Recorrência não encontrada.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// roda processador manualmente (todas as recorrências DO USUÁRIO)
app.post('/api/recurrences/run', async (req, res) => {
  try {
    const uid = req.authUserId;
    const count = await processRecurrences(null, uid);
    res.json({ ok: true, generated: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// roda processador para uma recorrência (suporta force=1 para "Lançar hoje" + dedupe)
app.post('/api/recurrences/:id/run', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    const force = String(req.query.force || '').toLowerCase();
    const doForce = force === '1' || force === 'true';
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const r = await get(`SELECT * FROM recurrences WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!r) return res.status(404).json({ error: 'Recorrência não encontrada.' });
    if (r.active !== 1) return res.status(409).json({ error: 'Recorrência pausada.' });

    const today = todayLocalISO();

    // se está vencida ou igual a hoje, delega pro processador normal (escopo do usuário)
    if (!doForce || r.next_run <= today) {
      const count = await processRecurrences(id, uid);
      return res.json({ ok: true, generated: count });
    }

    // Forçar HOJE com dedupe por usuário
    const exists = await get(
      `SELECT 1 FROM transactions 
       WHERE user_id = ? AND date=? AND description=? AND category=? AND type=? AND amount=? LIMIT 1`,
      [uid, today, r.description, r.category, r.type, r.amount]
    );
    if (exists) {
      const next = advance(today, r.frequency, r.interval);
      await run(`UPDATE recurrences SET next_run = ? WHERE user_id = ? AND id = ?`, [next, uid, r.id]);
      return res.json({ ok: true, generated: 0, deduped: true });
    }

    // cria transação
    const ins = await run(
      `INSERT INTO transactions (user_id, date, description, category, type, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uid, today, r.description, r.category, r.type, r.amount]
    );

    // se estiver vinculada a meta, cria contribuição
    if (r.goal_id) {
      const signed = r.type === 'expense' ? Math.abs(r.amount) : -Math.abs(r.amount);
      await run(
        `INSERT INTO goal_contributions (user_id, goal_id, date, amount, transaction_id, source)
         VALUES (?, ?, ?, ?, ?, 'recurrence')`,
        [uid, r.goal_id, today, signed, ins.lastID]
      );
    }

    const next = advance(today, r.frequency, r.interval);
    await run(`UPDATE recurrences SET next_run = ? WHERE user_id = ? AND id = ?`, [next, uid, r.id]);

    return res.json({ ok: true, generated: 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================ PROCESSADOR DE RECORRÊNCIAS ================
async function processRecurrences(onlyId = null, onlyUserId = null) {
  const today = todayLocalISO();
  const where = [`active = 1`, `next_run <= ?`];
  const params = [today];
  if (onlyId) { where.push(`id = ?`); params.push(onlyId); }
  if (onlyUserId) { where.push(`user_id = ?`); params.push(onlyUserId); }

  const rows = await all(
    `SELECT * FROM recurrences
     WHERE ${where.join(' AND ')}
     ORDER BY next_run ASC, id ASC`,
    params
  );

  let generated = 0;
  for (const r of rows) {
    let next = r.next_run;
    let safety = 0;
    const limit = r.end_date || '9999-12-31';
    while (next <= today && next <= limit && safety++ < 100) {
      const ins = await run(
        `INSERT INTO transactions (user_id, date, description, category, type, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [r.user_id, next, r.description, r.category, r.type, r.amount]
      );
      if (r.goal_id) {
        const signed = r.type === 'expense' ? Math.abs(r.amount) : -Math.abs(r.amount);
        await run(
          `INSERT INTO goal_contributions (user_id, goal_id, date, amount, transaction_id, source)
           VALUES (?, ?, ?, ?, ?, 'recurrence')`,
          [r.user_id, r.goal_id, next, signed, ins.lastID]
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

// agenda a cada 60s para rodar GLOBALMENTE (todos os usuários)
setInterval(() => { processRecurrences().catch(() => { }); }, 60 * 1000);
// roda na inicialização
processRecurrences().catch(() => { });

// ================ METAS (GOALS) ================
function monthsBetween(startISO, endISO) {
  const a = new Date(startISO + 'T00:00:00');
  const b = new Date(endISO + 'T00:00:00');
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

// Lista metas com campos calculados
// Listar metas
app.get('/api/goals', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const rows = await all(
      `
      SELECT g.*,
             COALESCE(SUM(gc.amount), 0) AS saved
      FROM goals g
      LEFT JOIN goal_contributions gc
        ON gc.user_id = g.user_id AND gc.goal_id = g.id
      WHERE g.user_id = ?
      GROUP BY g.id
      ORDER BY 
        CASE g.status
          WHEN 'active'   THEN 0
          WHEN 'paused'   THEN 1
          WHEN 'achieved' THEN 2
          ELSE 3
        END,
        g.id ASC
      `,
      [uid]
    );

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
app.post('/api/goals', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const { name, target_amount, color, target_date, notes } = req.body || {};
    const clean = String(name || '').trim();
    const amt = typeof target_amount === 'number'
      ? target_amount
      : parseFloat(String(target_amount ?? '').replace(',', '.'));

    if (!clean) return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'target_amount inválido.' });

    const parsedColor = parseColor(color, clean);
    if (!parsedColor.ok) return res.status(400).json({ error: parsedColor.error });

    const start = todayLocalISO();
    const tdate = target_date ? String(target_date).trim() : null;

    const stmt = await run(
      `INSERT INTO goals (user_id, name, target_amount, color, start_date, target_date, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [uid, clean, amt, parsedColor.color, start, tdate, notes ?? null]
    );
    const row = await get(`SELECT * FROM goals WHERE user_id = ? AND id = ?`, [uid, stmt.lastID]);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar meta
app.patch('/api/goals/:id', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const current = await get(`SELECT * FROM goals WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!current) return res.status(404).json({ error: 'Meta não encontrada.' });

    const set = [], params = [];

    if (req.body.name !== undefined) {
      const v = String(req.body.name).trim();
      if (!v) return res.status(400).json({ error: 'Nome é obrigatório.' });
      set.push('name = ?'); params.push(v);
    }

    if (req.body.target_amount !== undefined) {
      const amt = typeof req.body.target_amount === 'number'
        ? req.body.target_amount
        : parseFloat(String(req.body.target_amount ?? '').replace(',', '.'));
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
      if (!['active', 'paused', 'achieved', 'archived'].includes(st)) {
        return res.status(400).json({ error: 'status inválido.' });
      }
      set.push('status = ?'); params.push(st);
    }

    if (req.body.notes !== undefined) {
      set.push('notes = ?'); params.push(req.body.notes ? String(req.body.notes) : null);
    }

    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });

    params.push(uid, id);
    await run(`UPDATE goals SET ${set.join(', ')} WHERE user_id = ? AND id = ?`, params);
    const row = await get(`SELECT * FROM goals WHERE user_id = ? AND id = ?`, [uid, id]);
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir meta (cascata manual)
app.delete('/api/goals/:id', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    await run('BEGIN');
    try {
      await run(
        `DELETE FROM transactions 
         WHERE user_id = ? AND id IN (
           SELECT transaction_id FROM goal_contributions 
           WHERE user_id = ? AND goal_id = ? AND transaction_id IS NOT NULL
         )`,
        [uid, uid, id]
      );

      await run(`DELETE FROM goal_contributions WHERE user_id = ? AND goal_id = ?`, [uid, id]);
      const result = await run(`DELETE FROM goals WHERE user_id = ? AND id = ?`, [uid, id]);

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
app.get('/api/goals/:id/contributions', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    const rows = await all(
      `SELECT * FROM goal_contributions WHERE user_id = ? AND goal_id = ? ORDER BY date ASC, id ASC`,
      [uid, id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Criar contribuição
app.post('/api/goals/:id/contributions', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);

    const g = await get(`SELECT * FROM goals WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!g) return res.status(404).json({ error: 'Meta não encontrada.' });

    let { date, amount, createTransaction, notes } = req.body || {};
    date = String(date || '').trim() || todayLocalISO();

    const amt = typeof amount === 'number'
      ? amount
      : parseFloat(String(amount ?? '').replace(',', '.'));

    if (!Number.isFinite(amt) || amt === 0) {
      return res.status(400).json({ error: 'amount inválido.' });
    }

    let txId = null;
    if (createTransaction) {
      await ensureCategory(uid, 'Metas');
      const type = amt > 0 ? 'expense' : 'income';  // depósito = saída; retirada = entrada
      const ins = await run(
        `INSERT INTO transactions (user_id, date, description, category, type, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uid, date, `Meta: ${g.name}`, 'Metas', type, Math.abs(amt)]
      );
      txId = ins.lastID || null;
    }

    const st = await run(
      `INSERT INTO goal_contributions (user_id, goal_id, date, amount, transaction_id, source, notes)
       VALUES (?, ?, ?, ?, ?, 'manual', ?)`,
      [uid, id, date, amt, txId, notes ?? null]
    );

    const row = await get(`SELECT * FROM goal_contributions WHERE user_id = ? AND id = ?`, [uid, st.lastID]);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Excluir contribuição (opção de apagar transação vinculada)
app.delete('/api/goals/:id/contributions/:cid', app.authRequired, async (req, res) => {
  try {
    const uid = req.user.id;
    const id = Number(req.params.id);
    const cid = Number(req.params.cid);
    const delTx = String(req.query.deleteTransaction || '').toLowerCase();
    const alsoTx = delTx === '1' || delTx === 'true';

    const row = await get(
      `SELECT * FROM goal_contributions WHERE user_id = ? AND id = ? AND goal_id = ?`,
      [uid, cid, id]
    );
    if (!row) return res.status(404).json({ error: 'Contribuição não encontrada.' });

    if (alsoTx && row.transaction_id) {
      await run(`DELETE FROM transactions WHERE user_id = ? AND id = ?`, [uid, row.transaction_id]);
    }
    await run(`DELETE FROM goal_contributions WHERE user_id = ? AND id = ?`, [uid, cid]);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ================ LIMITS (CRUD + métricas) ================
app.get('/api/limits', async (req, res) => {
  try {
    const uid = req.authUserId;
    const rows = await all(
      `SELECT * FROM limits WHERE user_id = ? ORDER BY status='active' DESC, start_date DESC, id DESC`,
      [uid]
    );
    const today = todayLocalISO();

    // calcula gasto dentro da janela para cada limite
    const enriched = [];
    for (const l of rows) {
      const agg = await get(
        `SELECT COALESCE(SUM(amount), 0) AS spent
         FROM transactions 
         WHERE user_id = ? AND type='expense' AND date >= ? AND date <= ?`,
        [uid, l.start_date, l.end_date]
      );
      const spent = Number(agg?.spent || 0);
      const remaining = Math.max(0, Number(l.max_amount) - spent);
      const percent = Number(l.max_amount) > 0 ? Math.min(100, Math.round((spent / Number(l.max_amount)) * 100)) : 0;

      let phase = 'scheduled';
      if (l.status !== 'active') phase = l.status; // paused / archived
      else if (today < l.start_date) phase = 'scheduled';
      else if (today > l.end_date) phase = 'expired';
      else phase = 'running';

      enriched.push({ ...l, spent, remaining, percent, phase });
    }
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST compatível com chaves alternativas (period/period_key/total/total_limit)
app.post('/api/limits', async (req, res) => {
  try {
    const uid = req.authUserId;

    const title = String(req.body.title ?? '').trim();
    const start_date = String(req.body.start_date ?? '').trim();
    const duration_code = String(
      req.body.duration_code ?? req.body.period ?? req.body.period_key ?? ''
    ).trim();

    const rawMax =
      req.body.max_amount ?? req.body.total_limit ?? req.body.total;
    const max_amount =
      typeof rawMax === 'number'
        ? rawMax
        : parseFloat(String(rawMax ?? '').replace(',', '.'));

    const status = String(req.body.status ?? 'active').trim();

    if (!title) return res.status(400).json({ error: 'Título é obrigatório.' });
    if (!start_date) return res.status(400).json({ error: 'start_date é obrigatório.' });
    if (!LIMIT_DURATIONS[duration_code]) return res.status(400).json({ error: 'duration_code inválido.' });
    if (!Number.isFinite(max_amount) || max_amount <= 0) return res.status(400).json({ error: 'max_amount inválido.' });
    if (!['active', 'paused', 'archived'].includes(status)) return res.status(400).json({ error: 'status inválido.' });

    const end_date = computeLimitEnd(start_date, duration_code);
    const st = await run(
      `INSERT INTO limits (user_id, title, start_date, end_date, duration_code, max_amount, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uid, title, start_date, end_date, duration_code, max_amount, status]
    );
    const row = await get(`SELECT * FROM limits WHERE user_id = ? AND id = ?`, [uid, st.lastID]);
    res.status(201).json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/limits/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });

    const current = await get(`SELECT * FROM limits WHERE user_id = ? AND id = ?`, [uid, id]);
    if (!current) return res.status(404).json({ error: 'Limite não encontrado.' });

    const set = [], params = [];
    let start_date = current.start_date;
    let duration_code = current.duration_code;

    if (req.body.title !== undefined) {
      const v = String(req.body.title).trim();
      if (!v) return res.status(400).json({ error: 'Título é obrigatório.' });
      set.push('title = ?'); params.push(v);
    }
    if (req.body.start_date !== undefined) {
      const v = String(req.body.start_date).trim();
      if (!v) return res.status(400).json({ error: 'start_date é obrigatório.' });
      start_date = v;
      set.push('start_date = ?'); params.push(v);
    }
    if (req.body.duration_code !== undefined || req.body.period !== undefined || req.body.period_key !== undefined) {
      const v = String(req.body.duration_code ?? req.body.period ?? req.body.period_key ?? '').trim();
      if (!LIMIT_DURATIONS[v]) return res.status(400).json({ error: 'duration_code inválido.' });
      duration_code = v;
      set.push('duration_code = ?'); params.push(v);
    }
    if (req.body.max_amount !== undefined || req.body.total !== undefined || req.body.total_limit !== undefined) {
      const raw = req.body.max_amount ?? req.body.total_limit ?? req.body.total;
      const amt = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
      if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'max_amount inválido.' });
      set.push('max_amount = ?'); params.push(amt);
    }
    if (req.body.status !== undefined) {
      const st = String(req.body.status).trim();
      if (!['active', 'paused', 'archived'].includes(st)) return res.status(400).json({ error: 'status inválido.' });
      set.push('status = ?'); params.push(st);
    }

    // Se mudar início/duração, recalcula fim
    if (req.body.start_date !== undefined || req.body.duration_code !== undefined || req.body.period !== undefined || req.body.period_key !== undefined) {
      const end = computeLimitEnd(start_date, duration_code);
      set.push('end_date = ?'); params.push(end);
    }

    if (!set.length) return res.status(400).json({ error: 'Nada para atualizar.' });
    params.push(uid, id);
    await run(`UPDATE limits SET ${set.join(', ')} WHERE user_id = ? AND id = ?`, params);
    const row = await get(`SELECT * FROM limits WHERE user_id = ? AND id = ?`, [uid, id]);
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/limits/:id', async (req, res) => {
  try {
    const uid = req.authUserId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido.' });
    const r = await run(`DELETE FROM limits WHERE user_id = ? AND id = ?`, [uid, id]);
    if ((r?.changes || 0) === 0) return res.status(404).json({ error: 'Limite não encontrado.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ================ START ================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API rodando na porta ${PORT}`);
});

