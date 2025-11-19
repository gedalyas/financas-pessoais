// server/webhooks.js
const express = require('express');
const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

module.exports = function mountWebhooks(app, db) {
  const router = express.Router();

  const APP_URL = process.env.APP_URL || 'http://localhost:5173';
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''; // coloque seu access token no .env

  // Webhook do Mercado Pago
  router.post('/mercadopago', async (req, res) => {
    try {
      // 1) Log básico pra você ver se está chegando
      console.log('[MP Webhook] Headers:', req.headers);
      console.log('[MP Webhook] Body:', JSON.stringify(req.body));

      const { type, action, data } = req.body || {};

      // Mercado Pago manda type: 'payment' e data.id = payment_id
      if (type !== 'payment' || !data || !data.id) {
        console.log('[MP Webhook] Notificação ignorada, type ou data.id ausente');
        return res.json({ ok: true, ignored: true });
      }

      const paymentId = data.id;

      if (!MP_ACCESS_TOKEN) {
        console.error('[MP Webhook] MP_ACCESS_TOKEN não configurado no .env');
        return res.status(500).json({ error: 'mp_access_token_not_configured' });
      }

      // 2) Buscar detalhes reais do pagamento na API do Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!mpRes.ok) {
        const txt = await mpRes.text();
        console.error('[MP Webhook] Falha ao buscar pagamento:', mpRes.status, txt);
        return res.status(500).json({ error: 'failed_to_fetch_payment' });
      }

      const payment = await mpRes.json();
      console.log('[MP Webhook] Payment details:', payment);

      const status = payment.status; // approved, pending, rejected, etc.
      const email =
        payment.payer?.email ||
        payment.additional_info?.payer?.email ||
        null;
      const externalRef = payment.external_reference || String(paymentId);

      console.log('[MP Webhook] Status:', status, 'Email:', email, 'External ref:', externalRef);

      // 3) Só gera token se status for APPROVED
      if (status === 'approved') {
        if (!email) {
          console.warn('[MP Webhook] Pagamento aprovado mas sem e-mail do pagador');
        }

        // usa o helper que você já exportou em auth.js
        const code = await app.issuePurchaseToken(email, externalRef, 1, null);

        const linkCadastro = `${APP_URL.replace(/\/$/, '')}/auth?token=${encodeURIComponent(code)}`;

        console.log('[MP Webhook] Token emitido:', code);
        console.log('[MP Webhook] Link de cadastro:', linkCadastro);
        // Aqui você pode:
        // - mandar e-mail com esse link
        // - salvar em alguma tabela de "licenças" pro seu controle, etc.
      } else {
        console.log('[MP Webhook] Pagamento não aprovado (status =', status, '), nada será liberado.');
      }

      // 4) Sempre responder 200/OK pro Mercado Pago
      return res.json({ ok: true });
    } catch (e) {
      console.error('[MP Webhook] Erro geral:', e);
      return res.status(500).json({ error: 'webhook_mp_failed' });
    }
  });

  app.use('/webhooks', router);
};
