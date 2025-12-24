// server/checkout.js
const express = require("express");
const mercadopago = require("mercadopago");

const router = express.Router();

// Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// ÚNICO PLANO
const PLAN = {
  id: "plano49",
  title: "Prospera Finanças - Acesso Completo",
  price: 49.99,
};

/**
 * POST /api/checkout/create
 * Body: { email: string }
 */
router.post("/checkout/create", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório." });
    }

    const preference = {
      items: [
        {
          title: PLAN.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: PLAN.price,
        },
      ],

      notification_url: process.env.MP_WEBHOOK_URL,

      metadata: {
        email,
        plan: PLAN.id,
      },

      external_reference: `${email}-${PLAN.id}-${Date.now()}`,

      payment_methods: {
        installments: 2,          // ✅ no máximo 2x
        default_installments: 1,  // ✅ abre em 1x por padrão
      },
    };

    const response = await mercadopago.preferences.create(preference);

    return res.json({
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point,
    });
  } catch (error) {
    console.error("[Checkout] Erro:", error);
    return res.status(500).json({ error: "Erro ao criar checkout." });
  }
});

module.exports = router;
