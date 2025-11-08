// server/settings.js
const express = require('express');
const bcrypt = require('bcryptjs');

module.exports = function mountSettings(app, db) {
  const router = express.Router();

  // Todas as rotas abaixo exigem auth
  router.use(app.authRequired);

  // GET /api/settings/me
  router.get('/me', (req, res) => {
    const uid = req.user.id;
    db.get(
      'SELECT id, name, email FROM users WHERE id = ?',
      [uid],
      (err, row) => {
        if (err)  return res.status(500).json({ error: 'db_error' });
        if (!row) return res.status(404).json({ error: 'not_found' });
        return res.json(row);
      }
    );
  });

  // PUT /api/settings/me  { name }
  router.put('/me', (req, res) => {
    const uid = req.user.id;
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'invalid_name' });
    }
    const clean = String(name).trim();
    db.run(
      'UPDATE users SET name = ?, created_at = created_at WHERE id = ?',
      [clean, uid],
      (err) => {
        if (err)  return res.status(500).json({ error: 'db_error' });
        return res.json({ ok: true, name: clean });
      }
    );
  });

  // POST /api/settings/change-password  { current_password, new_password }
  router.post('/change-password', (req, res) => {
    const uid = req.user.id;
    const { current_password, new_password } = req.body || {};

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'invalid_payload' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'weak_password' });
    }

    db.get('SELECT password_hash FROM users WHERE id = ?', [uid], async (err, row) => {
      if (err)  return res.status(500).json({ error: 'db_error' });
      if (!row) return res.status(404).json({ error: 'not_found' });

      const ok = await bcrypt.compare(current_password, row.password_hash || '');
      if (!ok) return res.status(400).json({ error: 'current_password_mismatch' });

      const newHash = await bcrypt.hash(new_password, 10);
      db.run(
        'UPDATE users SET password_hash = ?, created_at = created_at WHERE id = ?',
        [newHash, uid],
        (err2) => {
          if (err2) return res.status(500).json({ error: 'db_error' });
          return res.json({ ok: true });
        }
      );
    });
  });

  app.use('/api/settings', router);
};
