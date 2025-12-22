// server/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

module.exports = function authModule(app, db) {
  const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-secret-change';
  const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
  const APP_URL     = process.env.APP_URL     || 'https://app.prosperafinancas.com';

  // SMTP opcional
  let transporter = null;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  // Helpers DB
  const run = (sql, p = []) =>
    new Promise((res, rej) => db.run(sql, p, function (err) { err ? rej(err) : res(this); }));
  const get = (sql, p = []) =>
    new Promise((res, rej) => db.get(sql, p, (err, row) => { err ? rej(err) : res(row); }));
  const all = (sql, p = []) =>
    new Promise((res, rej) => db.all(sql, p, (err, rows) => { err ? rej(err) : res(rows); }));

  // Schema base (idêntico ao ensureSchemaFresh, seguro se já existir)
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

    db.run(`CREATE TABLE IF NOT EXISTS purchase_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_hash TEXT NOT NULL,
      issued_to_email TEXT,
      order_id TEXT,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      revoked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_pt_hash ON purchase_tokens(code_hash)`);
  });

  // Utils
  const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
  const nowISO  = () => new Date().toISOString().slice(0,19).replace('T',' ');
  // Gera um token de compra e salva em purchase_tokens
async function issuePurchaseToken(issued_to_email, order_id, max_uses = 1, expires_at = null) {
  const rawCode = crypto.randomBytes(24).toString('hex');
  const code_hash = sha256(rawCode);

  await run(
    `INSERT INTO purchase_tokens (code_hash, issued_to_email, order_id, max_uses, expires_at)
     VALUES (?,?,?,?,?)`,
    [
      code_hash,
      issued_to_email || null,
      order_id || null,
      max_uses,
      expires_at || null
    ]
  );

  return rawCode;
}

  // ===== DEV: emitir token de compra manualmente (para testes) =====
  app.get('/dev/issue-token', async (req, res) => {
    // Em produção, você pode bloquear isso
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).end();
    }

    try {
      const email = req.query.email || null;

      const code = await issuePurchaseToken(email, 'dev-test-order', 1, null);

      const link = `${APP_URL.replace(/\/$/, '')}/auth?token=${encodeURIComponent(code)}`;

      res.json({
        ok: true,
        code, // token de compra (para colar manualmente se quiser)
        link, // link pronto pra abrir a tela de cadastro
      });
    } catch (e) {
      res.status(500).json({ error: e.message || 'issue_token_failed' });
    }
  });

  // JWT helper
  function sign(user) {
    return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  }

  // 🔑 Middleware GLOBAL: popula req.user se houver Bearer
  app.use((req, _res, next) => {
    try {
      const h = String(req.headers.authorization || '');
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const dec = jwt.verify(token, JWT_SECRET);
        req.user = { id: dec.sub, email: dec.email };
      }
    } catch (_) {}
    next();
  });

  // Middleware para rotas protegidas
  function authRequired(req, res, next) {
    if (req.user && Number.isInteger(req.user.id)) return next();
    return res.status(401).json({ error: 'Auth necessário' });
  }

  // ===== Validação de token de compra (uso interno)
  async function validateAndConsumePurchaseToken(rawCode, email) {
    const code = String(rawCode || '').trim();
    if (!code) throw { status: 400, error: 'purchase_token_required' };

    const hash = sha256(code);
    const row = await get(
      `SELECT * FROM purchase_tokens WHERE code_hash = ?`,
      [hash]
    );
    if (!row) throw { status: 400, error: 'invalid_purchase_token' };
    if (row.revoked) throw { status: 400, error: 'token_revoked' };

    // expiração (se houver)
    if (row.expires_at) {
      const exp = new Date(row.expires_at + 'Z');
      if (!(exp > new Date())) throw { status: 400, error: 'token_expired' };
    }

    // limite de usos
    if (Number(row.used_count) >= Number(row.max_uses)) {
      throw { status: 400, error: 'token_exhausted' };
    }

    // se amarrado a e-mail, precisa bater
    if (row.issued_to_email) {
      const want = String(row.issued_to_email).trim().toLowerCase();
      const got  = String(email || '').trim().toLowerCase();
      if (want !== got) throw { status: 400, error: 'token_email_mismatch' };
    }

    // Consome uso (atômico)
    const upd = await run(
      `UPDATE purchase_tokens 
         SET used_count = used_count + 1
       WHERE id = ?
         AND used_count < max_uses
         AND (expires_at IS NULL OR expires_at > ?)
         AND revoked = 0`,
      [row.id, nowISO()]
    );
    if (!upd || !upd.changes) {
      // concorrência/condição de corrida
      throw { status: 409, error: 'token_race_condition' };
    }

    return { ok: true, token_id: row.id };
  }

  /*// (Opcional) Endpoint para validar token antes de criar a conta
  app.post('/api/auth/verify-token', async (req, res) => {
    try {
      const { email, purchase_token } = req.body || {};
      await validateAndConsumePurchaseToken(purchase_token, email);
      // Se chegou aqui é porque consumiu 1 uso; devolve um "nonce" para reutilizar no register
      // Para simplificar, pedimos que o frontend chame apenas /register diretamente (este endpoint é opcional).
      return res.json({ ok: true });
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.error || 'invalid_token' });
    }
  });*/

  // ===== REGISTER (requer token de compra)
  app.post('/api/auth/register', async (req, res) => {
    try {
      let { name, email, password, purchase_token } = req.body || {};
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

      // ✅ valida e consome o token
      await validateAndConsumePurchaseToken(purchase_token, email);

      const hash = await bcrypt.hash(password, 10);
      const stmt = await run(`INSERT INTO users (name, email, password_hash) VALUES (?,?,?)`, [name, email, hash]);
      const user = await get(`SELECT id, name, email, created_at FROM users WHERE id = ?`, [stmt.lastID]);
      const token = sign(user);
      res.status(201).json({ token, user });
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.error });
      res.status(500).json({ error: e.message || 'register_failed' });
    }
  });

  // ===== LOGIN
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

  // ===== ME
  app.get('/api/auth/me', authRequired, async (req, res) => {
    try {
      const u = await get(`SELECT id, name, email, created_at FROM users WHERE id = ?`, [req.user.id]);
      if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
      res.json(u);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===== FORGOT
  app.post('/api/auth/forgot', async (req, res) => {
    try {
      let { email } = req.body || {};
      email = String(email || '').trim().toLowerCase();
      const user = await get(`SELECT id, email, name FROM users WHERE email = ?`, [email]);

      // Sempre responde 200
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
          dev_link = link;
          console.log('[Forgot/dev_link]', dev_link);
        }
      }
      res.json({ ok: true, dev_link });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===== RESET
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

      const exp = new Date((row.reset_expires || '') + 'Z');
      if (!(exp > new Date())) return res.status(400).json({ error: 'Token expirado.' });

      const hash = await bcrypt.hash(password, 10);
      await run(`UPDATE users SET password_hash=?, reset_token=NULL, reset_expires=NULL WHERE id=?`, [hash, row.id]);

      const user = await get(`SELECT id, name, email, created_at FROM users WHERE id=?`, [row.id]);
      const jwtToken = sign(user);
      res.json({ ok: true, token: jwtToken, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Exporta middleware
  app.authRequired = authRequired;
  app.issuePurchaseToken = issuePurchaseToken;
};
