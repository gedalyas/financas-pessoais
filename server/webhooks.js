// server/webhooks.js
const express = require("express");
const nodemailer = require("nodemailer");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

module.exports = function mountWebhooks(app, db) {
  const router = express.Router();

  const APP_URL = process.env.APP_URL || "http://localhost:5173";
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";

  // SMTP opcional (Gmail via senha de app)
  let transporter = null;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }

  // Healthcheck simples pro botão "Testar URL" do Mercado Pago
  router.get("/mercadopago", (_req, res) => {
    console.log("[MP Webhook] GET de teste recebido do Mercado Pago");
    return res.json({ ok: true, message: "Webhook Mercadopago ativo" });
  });

  // Webhook do Mercado Pago
  router.post("/mercadopago", async (req, res) => {
    try {
      console.log("[MP Webhook] Headers:", req.headers);
      console.log("[MP Webhook] Query:", req.query);
      console.log("[MP Webhook] Body:", JSON.stringify(req.body));

      if (!MP_ACCESS_TOKEN) {
        console.error("[MP Webhook] MP_ACCESS_TOKEN não configurado no .env");
        return res.status(500).json({ error: "mp_access_token_not_configured" });
      }

      // =========================================================
      // 1) Descobrir o paymentId (pode vir como "payment" OU "merchant_order")
      // =========================================================
      const { type, data, topic, resource } = req.body || {};
      const qTopic = req.query?.topic;
      const qId = req.query?.id;

      // Caso 1: notificação direta de payment (formato antigo/novo)
      let paymentId = type === "payment" && data?.id ? String(data.id) : null;

      // Caso 2: merchant_order (muito comum no MP)
      const isMerchantOrder = topic === "merchant_order" || qTopic === "merchant_order";

      if (!paymentId && isMerchantOrder) {
        const merchantOrderId =
          qId ||
          (typeof resource === "string" ? resource.split("/").pop() : null);

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
          console.error(
            "[MP Webhook] Falha ao buscar merchant_order:",
            moRes.status,
            txt
          );
          return res.json({ ok: false, error: "failed_to_fetch_merchant_order" });
        }

        const mo = await moRes.json();

        // Pega o primeiro pagamento associado (se houver)
        paymentId = mo?.payments?.[0]?.id ? String(mo.payments[0].id) : null;

        console.log("[MP Webhook] merchant_order -> paymentId:", paymentId);
      }

      if (!paymentId) {
        console.log("[MP Webhook] Notificação ignorada: não consegui determinar paymentId.");
        return res.json({ ok: true, ignored: true });
      }

      // =========================================================
      // 2) Buscar detalhes reais do pagamento
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
          console.log("[MP Webhook] Pagamento não encontrado (404). Tratando como teste/ignorado.");
          return res.json({ ok: true, ignored: true, reason: "payment_not_found" });
        }

        return res.json({ ok: false, error: "failed_to_fetch_payment" });
      }

      const payment = await mpRes.json();
      console.log("[MP Webhook] Payment details:", payment);

      const status = payment.status; // approved, pending, rejected...

      // metadata vem do checkout.js
      const metadata = payment.metadata || {};
      const emailFromMetadata = metadata.email || null;
      const planFromMetadata = metadata.plan || null;

      const email =
        emailFromMetadata ||
        payment.payer?.email ||
        payment.additional_info?.payer?.email ||
        null;

      const externalRef = payment.external_reference || String(paymentId);

      console.log(
        "[MP Webhook] Status:",
        status,
        "Email:",
        email,
        "Plano (metadata):",
        planFromMetadata,
        "External ref:",
        externalRef
      );

      // =========================================================
      // 3) Só libera (gera token + envia e-mail) se approved
      // =========================================================
      if (status === "approved") {
        if (!email) {
          console.warn("[MP Webhook] Pagamento aprovado mas sem e-mail do pagador");
        }

        if (!planFromMetadata) {
          console.warn("[MP Webhook] Pagamento aprovado mas sem 'plan' em metadata");
        }

        // Token de compra (1 uso, sem expiração)
        const code = await app.issuePurchaseToken(email, externalRef);

        const linkCadastro = `${APP_URL.replace(/\/$/, "")}/auth?token=${encodeURIComponent(
          code
        )}`;

        console.log("[MP Webhook] Token emitido:", code);
        console.log("[MP Webhook] Link de cadastro:", linkCadastro);

        // ===============================
        // 📧 ENVIO DE E-MAIL COM O LINK
        // ===============================
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
                       style="display:inline-block;
                              padding:14px 18px;
                              background:#ff6a00;
                              color:#ffffff;
                              text-decoration:none;
                              border-radius:10px;
                              font-weight:bold">
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
          }
        } else {
          console.log("[MP Webhook] SMTP não configurado ou e-mail ausente, não enviei e-mail.");
        }
      } else {
        console.log(
          "[MP Webhook] Pagamento não aprovado (status =",
          status,
          "), nada será liberado."
        );
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error("[MP Webhook] Erro geral:", e);
      return res.status(500).json({ error: "webhook_mp_failed" });
    }
  });

  app.use("/webhooks", router);
};
