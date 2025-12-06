// server/checkout.js
const express = require("express");
const mercadopago = require("mercadopago");

const router = express.Router();

// ⚙️ Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// 💰 Planos disponíveis
// planId que vamos usar no front: "avista" e "parcelado12x"
const PLANS = {
  avista: {
    id: "avista",
    title: "Prospera Finanças - Plano à vista",
    // 49,99 à vista (PIX / débito / 1x crédito)
    price: 49.99,
  },
  parcelado12x: {
    id: "parcelado12x",
    title: "Prospera Finanças - Plano 12x de 9,99",
    // total = 12 x 9,99 = 119,88
    price: 9.99 * 12,
  },
};

/**
 * POST /api/checkout/create
 * Body: { email: string, plan: "avista" | "parcelado12x" }
 */
router.post("/checkout/create", async (req, res) => {
  try {
    const { email, plan } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório." });
    }

    if (!plan || !PLANS[plan]) {
      return res
        .status(400)
        .json({ error: "Plano inválido. Use 'avista' ou 'parcelado12x'." });
    }

    const selectedPlan = PLANS[plan];

    // 🧾 Preferência Mercado Pago
    const preference = {
      items: [
        {
          title: selectedPlan.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(selectedPlan.price),
        },
      ],

      // 👇 URL pública do webhook (Cloudflare Tunnel ou domínio)
      notification_url: process.env.MP_WEBHOOK_URL,

      // Vai chegar no webhook depois:
      metadata: {
        email,
        plan: selectedPlan.id,
      },

      external_reference: `${email}-${selectedPlan.id}-${Date.now()}`,

      // ⚙️ Se você quiser controlar tipos de pagamento por plano, dá pra usar:
      // payment_methods: {
      //   excluded_payment_types: [],
      //   installments: plan === "parcelado12x" ? 12 : 1, // máximo de parcelas
      // },
    };

    const response = await mercadopago.preferences.create(preference);

    return res.json({
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point,
    });
  } catch (error) {
    console.error("[Checkout] Erro ao criar preferência:", error);
    return res
      .status(500)
      .json({ error: "Erro ao criar checkout. Tente novamente mais tarde." });
  }
});

module.exports = router;
