// server/webhooks.js
const express = require("express");
const nodemailer = require("nodemailer");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

module.exports = function mountWebhooks(app, db) {
  const router = express.Router();

  const APP_URL = process.env.APP_URL || "http://localhost:5173";
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";

  // ===== Helpers DB (sqlite) =====
  const run = (sql, p = []) =>
    new Promise((res, rej) => db.run(sql, p, function (err) { err ? rej(err) : res(this); }));
  const get = (sql, p = []) =>
    new Promise((res, rej) => db.get(sql, p, (err, row) => { err ? rej(err) : res(row); }));

  // ===== Tabela para idempotência (1 pagamento -> 1 token/email) =====
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS mp_fulfillments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id TEXT NOT NULL UNIQUE,
        external_ref TEXT,
        email TEXT,
        token_code_hash TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_mp_fulfillments_payment_id ON mp_fulfillments(payment_id)`);
  });

  // ===== SMTP opcional (Gmail via senha de app) =====
  let transporter = null;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  router.get("/mercadopago", (_req, res) => {
    console.log("[MP Webhook] GET de teste recebido do Mercado Pago");
    return res.json({ ok: true, message: "Webhook Mercadopago ativo" });
  });

  router.post("/mercadopago", async (req, res) => {
    try {
      console.log("[MP Webhook] Query:", req.query);
      console.log("[MP Webhook] Body:", JSON.stringify(req.body));

      if (!MP_ACCESS_TOKEN) {
        console.error("[MP Webhook] MP_ACCESS_TOKEN não configurado no .env");
        return res.status(500).json({ error: "mp_access_token_not_configured" });
      }

      // =========================================================
      // 1) Descobrir paymentId (payment ou merchant_order)
      // =========================================================
      const { type, data, topic, resource } = req.body || {};
      const qTopic = req.query?.topic;
      const qId = req.query?.id;

      let paymentId = type === "payment" && data?.id ? String(data.id) : null;

      const isMerchantOrder = topic === "merchant_order" || qTopic === "merchant_order";
      if (!paymentId && isMerchantOrder) {
        const merchantOrderId =
          qId || (typeof resource === "string" ? resource.split("/").pop() : null);

        if (!merchantOrderId) {
          console.log("[MP Webhook] merchant_order sem id. Ignorando.");
          return res.json({ ok: true, ignored: true });
        }

        const moRes = await fetch(
          `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`,
          { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
        );

        if (!moRes.ok) {
          const txt = await moRes.text();
          console.error("[MP Webhook] Falha ao buscar merchant_order:", moRes.status, txt);
          return res.json({ ok: false, error: "failed_to_fetch_merchant_order" });
        }

        const mo = await moRes.json();

        // Melhor: pegar um payment aprovado (se existir), senão o primeiro
        const approved = Array.isArray(mo?.payments)
          ? mo.payments.find((p) => p.status === "approved")
          : null;

        paymentId = approved?.id
          ? String(approved.id)
          : (mo?.payments?.[0]?.id ? String(mo.payments[0].id) : null);

        console.log("[MP Webhook] merchant_order -> paymentId:", paymentId);
      }

      if (!paymentId) {
        console.log("[MP Webhook] Ignorado: não consegui determinar paymentId.");
        return res.json({ ok: true, ignored: true });
      }

      // =========================================================
      // 2) Buscar detalhes do pagamento
      // =========================================================
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!mpRes.ok) {
        const txt = await mpRes.text();
        console.error("[MP Webhook] Falha ao buscar pagamento:", mpRes.status, txt);

        if (mpRes.status === 404) {
          console.log("[MP Webhook] Payment 404 (teste). Ignorando.");
          return res.json({ ok: true, ignored: true, reason: "payment_not_found" });
        }

        return res.json({ ok: false, error: "failed_to_fetch_payment" });
      }

      const payment = await mpRes.json();
      const status = payment.status;

      const metadata = payment.metadata || {};
      const email =
        metadata.email ||
        payment.payer?.email ||
        payment.additional_info?.payer?.email ||
        null;

      const externalRef = payment.external_reference || String(paymentId);

      console.log("[MP Webhook] status:", status, "email:", email, "externalRef:", externalRef);

      // =========================================================
      // 3) Idempotência: se já processei esse paymentId, não faço nada
      // =========================================================
      const already = await get(
        `SELECT id, payment_id, created_at FROM mp_fulfillments WHERE payment_id = ?`,
        [paymentId]
      );

      if (already) {
        console.log("[MP Webhook] Já processado. Não vou reenviar e-mail/token. paymentId:", paymentId);
        return res.json({ ok: true, duplicated: true });
      }

      // =========================================================
      // 4) Só libera se approved
      // =========================================================
      if (status !== "approved") {
        console.log("[MP Webhook] Não aprovado ainda. Nada a fazer. status =", status);
        return res.json({ ok: true, pending: true });
      }

      // =========================================================
      // 5) Gerar token + salvar "fulfillment" antes de enviar e-mail
      // (garante que se repetir notificação, não duplica)
      // =========================================================
      const code = await app.issuePurchaseToken(email, externalRef);
      const linkCadastro = `${APP_URL.replace(/\/$/, "")}/auth?token=${encodeURIComponent(code)}`;

      // grava um “marcador” único por paymentId (UNIQUE evita duplicação)
      try {
        await run(
          `INSERT INTO mp_fulfillments (payment_id, external_ref, email) VALUES (?,?,?)`,
          [paymentId, externalRef, email]
        );
      } catch (e) {
        // Se estourar UNIQUE aqui, é porque chegou duplicado ao mesmo tempo
        console.log("[MP Webhook] Insert UNIQUE (duplicado simultâneo). Não reenviar.");
        return res.json({ ok: true, duplicated: true });
      }

      console.log("[MP Webhook] Token emitido:", code);
      console.log("[MP Webhook] Link:", linkCadastro);

      if (transporter && email) {
        try {
          const from = process.env.MAIL_FROM || process.env.SMTP_USER;

          await transporter.sendMail({
            from,
            to: email,
            subject: "Seu acesso ao Prospera está pronto 🚀",
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Pagamento confirmado ✅</h2>
                <p>Seu acesso à plataforma Prospera já está liberado.</p>
                <p>
                  <a href="${linkCadastro}"
                     style="display:inline-block;padding:14px 18px;background:#ff6a00;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold">
                    Criar minha conta agora
                  </a>
                </p>
                <p style="font-size:12px;color:#666;margin-top:20px">
                  Se o botão não funcionar, copie e cole este link no navegador:<br/>
                  ${linkCadastro}
                </p>
              </div>
            `,
          });

          console.log("[MP Webhook] E-mail enviado para:", email);
        } catch (mailErr) {
          console.error("[MP Webhook] Erro ao enviar e-mail:", mailErr);
          // opcional: aqui você pode registrar falha e criar um endpoint de reenvio depois
        }
      } else {
        console.log("[MP Webhook] SMTP não configurado ou e-mail ausente. Não enviei e-mail.");
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("[MP Webhook] Erro geral:", e);
      return res.status(500).json({ error: "webhook_mp_failed" });
    }
  });

  app.use("/webhooks", router);
};
