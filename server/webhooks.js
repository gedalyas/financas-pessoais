// server/webhooks.js
const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

module.exports = function mountWebhooks(app, db) {
  const router = express.Router();

  const APP_URL = process.env.APP_URL || "http://localhost:5173";
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ""; // coloque seu access token no .env

  // Webhook do Mercado Pago
  router.post("/mercadopago", async (req, res) => {
    try {
      // 1) Log básico pra você ver se está chegando
      console.log("[MP Webhook] Headers:", req.headers);
      console.log("[MP Webhook] Body:", JSON.stringify(req.body));

      const { type, action, data } = req.body || {};

      // Mercado Pago normalmente manda type: 'payment' e data.id = payment_id
      if (type !== "payment" || !data || !data.id) {
        console.log(
          "[MP Webhook] Notificação ignorada, type != 'payment' ou data.id ausente"
        );
        return res.json({ ok: true, ignored: true });
      }

      const paymentId = data.id;

      if (!MP_ACCESS_TOKEN) {
        console.error(
          "[MP Webhook] MP_ACCESS_TOKEN não configurado no .env"
        );
        return res
          .status(500)
          .json({ error: "mp_access_token_not_configured" });
      }

      // 2) Buscar detalhes reais do pagamento na API do Mercado Pago
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!mpRes.ok) {
        const txt = await mpRes.text();
        console.error(
          "[MP Webhook] Falha ao buscar pagamento:",
          mpRes.status,
          txt
        );

        // Se for 404, provavelmente é notificação de teste ou pagamento removido.
        if (mpRes.status === 404) {
          console.log(
            "[MP Webhook] Pagamento não encontrado (404). Tratando como teste/ignorado."
          );
          return res.json({
            ok: true,
            ignored: true,
            reason: "payment_not_found",
          });
        }

        // Outros erros: loga e mesmo assim responde 200 para o MP não ficar re-tentando loucamente
        return res.json({ ok: false, error: "failed_to_fetch_payment" });
      }

      const payment = await mpRes.json();
      console.log("[MP Webhook] Payment details:", payment);

      const status = payment.status; // approved, pending, rejected, etc.

      // ✅ Pega primeiro do metadata (que vem do checkout.js),
      // depois cai pro e-mail do pagador, se precisar
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

      // 3) Só gera token se status for APPROVED
      if (status === "approved") {
        if (!email) {
          console.warn(
            "[MP Webhook] Pagamento aprovado mas sem e-mail do pagador"
          );
        }

        // Aqui você já sabe qual plano foi comprado:
        // planFromMetadata = "avista" ou "parcelado12x"
        if (!planFromMetadata) {
          console.warn(
            "[MP Webhook] Pagamento aprovado mas sem 'plan' em metadata"
          );
        }

        // usa o helper que você já exportou em auth.js
        // Se o 4º parâmetro for algo como "plano" ou "metadados", você pode passar o plan aqui.
        const code = await app.issuePurchaseToken(
          email,
          externalRef,
          1,
          planFromMetadata || null
        );

        const linkCadastro = `${APP_URL.replace(
          /\/$/,
          ""
        )}/auth?token=${encodeURIComponent(code)}`;

        console.log("[MP Webhook] Token emitido:", code);
        console.log("[MP Webhook] Link de cadastro:", linkCadastro);

        // 👉 Aqui é o ponto ideal pra:
        // - Enviar e-mail pro usuário com linkCadastro
        // - Salvar no banco (db) o registro da compra + plano, se quiser controle

        // Exemplo (ajusta para seu schema, se quiser usar):
        /*
        if (db && email) {
          await db.run(
            `
            INSERT INTO purchases (email, plan, payment_id, external_ref, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
          `,
            [email, planFromMetadata, paymentId, externalRef]
          );
        }
        */
      } else {
        console.log(
          "[MP Webhook] Pagamento não aprovado (status =",
          status,
          "), nada será liberado."
        );
      }

      // 4) Sempre responder 200/OK pro Mercado Pago
      return res.json({ ok: true });
    } catch (e) {
      console.error("[MP Webhook] Erro geral:", e);
      return res.status(500).json({ error: "webhook_mp_failed" });
    }
  });

  app.use("/webhooks", router);
};
