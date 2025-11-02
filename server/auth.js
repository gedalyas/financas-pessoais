// server/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

module.exports = function authModule(app, db) {
  const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-secret-change';
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
  const APP_URL     = process.env.APP_URL     || 'http://localhost:5173';

  // SMTP opcional
  let transporter = null;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Helpers DB
  const run = (sql, p = []) =>
    new Promise((res, rej) => db.run(sql, p, function (err) { err ? rej(err) : res(this); }));
  const get = (sql, p = []) =>
    new Promise((res, rej) => db.get(sql, p, (err, row) => { err ? rej(err) : res(row); }));
  const all = (sql, p = []) =>
    new Promise((res, rej) => db.all(sql, p, (err, rows) => { err ? rej(err) : res(rows); }));

  // Tabela users
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reset_token TEXT,
      reset_expires TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  });

  // JWT helpers
  function sign(user) {
    // sub = id do usuário (compatível com server.js que lê req.user.id)
    return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  // 🔑 Middleware GLOBAL: decodifica Bearer token e popula req.user
  app.use((req, _res, next) => {
  try {
    const h = String(req.headers.authorization || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (token) {
      const dec = jwt.verify(token, JWT_SECRET);
      req.user = { id: dec.sub, email: dec.email };
    }
  } catch (e) {
    // segue sem req.user
  }
  next();
});


  // Middleware para rotas que exigem auth explícito
  function authRequired(req, res, next) {
    if (req.user && Number.isInteger(req.user.id)) return next();
    return res.status(401).json({ error: 'Auth necessário' });
  }

  // POST /api/auth/register
  app.post('/api/auth/register', async (req, res) => {
    try {
      let { name, email, password } = req.body || {};
      name = String(name || '').trim();
      email = String(email || '').trim().toLowerCase();
      password = String(password || '');

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Campos obrigatórios: name, email, password' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
      }

      const exists = await get(`SELECT id FROM users WHERE email = ?`, [email]);
      if (exists) return res.status(409).json({ error: 'E-mail já cadastrado.' });

      const hash = await bcrypt.hash(password, 10);
      const stmt = await run(`INSERT INTO users (name, email, password_hash) VALUES (?,?,?)`, [name, email, hash]);
      const user = await get(`SELECT id, name, email, created_at FROM users WHERE id = ?`, [stmt.lastID]);
      const token = sign(user);
      res.status(201).json({ token, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      let { email, password } = req.body || {};
      email = String(email || '').trim().toLowerCase();
      password = String(password || '');

      const user = await get(`SELECT * FROM users WHERE email = ?`, [email]);
      if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

      const token = sign(user);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/auth/me (rota protegida)
  app.get('/api/auth/me', authRequired, async (req, res) => {
    try {
      const u = await get(`SELECT id, name, email, created_at FROM users WHERE id = ?`, [req.user.id]);
      if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
      res.json(u);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/forgot
  app.post('/api/auth/forgot', async (req, res) => {
    try {
      let { email } = req.body || {};
      email = String(email || '').trim().toLowerCase();
      const user = await get(`SELECT id, email, name FROM users WHERE email = ?`, [email]);

      // Sempre responde 200 p/ evitar enumeração; gera link só se existir
      let dev_link = null;
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // +1h
        await run(`UPDATE users SET reset_token=?, reset_expires=? WHERE id=?`, [token, expires, user.id]);

        const link = `${APP_URL.replace(/\/$/, '')}/auth/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        if (transporter) {
          await transporter.sendMail({
            from: process.env.MAIL_FROM || 'no-reply@localhost',
            to: email,
            subject: 'Redefinir sua senha',
            html: `
              <p>Olá ${user.name},</p>
              <p>Para redefinir sua senha, clique no link abaixo (expira em 1 hora):</p>
              <p><a href="${link}" target="_blank">${link}</a></p>
              <p>Se não foi você, ignore este e-mail.</p>
            `,
          });
        } else {
          dev_link = link; // modo dev: devolve link
          console.log('[Forgot/dev_link]', dev_link);
        }
      }
      res.json({ ok: true, dev_link });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/auth/reset
  app.post('/api/auth/reset', async (req, res) => {
    try {
      let { email, token, password } = req.body || {};
      email = String(email || '').trim().toLowerCase();
      token = String(token || '').trim();
      password = String(password || '');

      if (!email || !token || !password) {
        return res.status(400).json({ error: 'Campos obrigatórios: email, token, password' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres.' });
      }

      const row = await get(`SELECT * FROM users WHERE email=? AND reset_token=?`, [email, token]);
      if (!row) return res.status(400).json({ error: 'Token inválido.' });

      const now = new Date();
      const exp = new Date(row.reset_expires + 'Z'); // sqlite -> UTC
      if (!(exp > now)) return res.status(400).json({ error: 'Token expirado.' });

      const hash = await bcrypt.hash(password, 10);
      await run(`UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?`, [hash, row.id]);

      const user = await get(`SELECT id, name, email, created_at FROM users WHERE id=?`, [row.id]);
      const jwtToken = sign(user);
      res.json({ ok: true, token: jwtToken, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Exporta middleware para uso opcional em outras rotas
  app.authRequired = authRequired;
};
