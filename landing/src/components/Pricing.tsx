import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, TrendingDown, Calendar, Coins } from "lucide-react";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { ScrollReveal } from "@/components/ScrollReveal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const commonFeatures = [
  "Dashboard completo",
  "Controle de gastos ilimitado",
  "Categorias personalizadas",
  "Metas e limites",
  "Relatórios completos",
  "Suporte por email",
];

const plans = [
  {
    id: "plano49",
    name: "Acesso Completo",
    price: "49,99",
    period: "pagamento único (até 2x no cartão)",
    description: "Acesso vitalício à plataforma Prospera Finanças",
    features: commonFeatures,
    highlight: true as const,
    badge: "Menos de R$ 5/mês na prática",
  },
];

const Pricing = () => {
  // agora usamos o contador só para mostrar o “equivalente por mês”
  const { ref: savingsRef, count: monthlyEquivalent } = useCounterAnimation({
    end: 4.17, // 49,99 / 12 ≈ 4,17 por mês
    duration: 2500,
    decimals: 2,
  });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    try {
      setError(null);

      if (!email) {
        setError("Por favor, preencha seu melhor e-mail antes de continuar.");
        return;
      }

      if (!API_BASE_URL) {
        setError(
          "URL da API não configurada. Defina VITE_API_BASE_URL no .env da landing."
        );
        return;
      }

      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ agora só enviamos o email, um único plano no backend
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data?.error || "Erro ao iniciar o pagamento. Tente novamente."
        );
        return;
      }

      // redireciona para o Mercado Pago
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch (err) {
      console.error(err);
      setError("Erro inesperado. Tente novamente em alguns instantes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Invista em organização de vez
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Um único pagamento acessível para tirar suas finanças do caos e
              organizar tudo em um só lugar.
            </p>
          </div>
        </ScrollReveal>

        {/* Banner explicando o custo equivalente mensal */}
        <div className="max-w-4xl mx-auto mb-12" ref={savingsRef}>
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <TrendingDown className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Cabe no bolso de verdade
                </h3>
                <p className="text-muted-foreground mb-1">
                  Você paga{" "}
                  <span className="font-semibold text-foreground">
                    R$ 49,99 uma única vez
                  </span>{" "}
                  e garante acesso completo à plataforma.
                </p>
                <p className="text-foreground mb-2">
                  Na prática, isso equivale a menos de{" "}
                  <span className="font-semibold">
                    R$ {monthlyEquivalent}/mês
                  </span>{" "}
                  ao longo de um ano.
                </p>
                <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-lg">
                  <Coins className="w-5 h-5 text-primary animate-bounce" />
                  <span className="text-primary font-semibold">
                    Um café por mês para ter clareza financeira.
                  </span>
                </div>
              </div>
              <div className="hidden md:block">
                <Calendar className="w-16 h-16 text-primary opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Campo de e-mail único */}
        <div className="max-w-md mx-auto mb-8">
          <ScrollReveal>
            <div className="space-y-2 text-center">
              <label className="block text-sm font-medium text-foreground">
                Seu melhor e-mail
              </label>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                É por esse e-mail que você receberá o link de acesso e o token
                exclusivo após a confirmação do pagamento.
              </p>
            </div>
          </ScrollReveal>
          {error && (
            <p className="text-sm text-destructive text-center mt-3">
              {error}
            </p>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          {plans.map((plan) => (
            <ScrollReveal key={plan.id}>
              <Card className="relative p-8 transition-all duration-500 border-2 border-primary shadow-2xl md:scale-105 animate-scale-in">
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top duration-700">
                    <div className="bg-gradient-to-r from-primary to-[hsl(25,100%,65%)] text-primary-foreground px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <Sparkles className="w-4 h-4" />
                      {plan.badge}
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">
                    {plan.description}
                  </p>

                  <div className="mb-2">
                    <span className="text-2xl font-bold text-primary">R$</span>
                    <span className="text-5xl font-bold text-primary ml-1">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-base text-muted-foreground">
                    {plan.period}
                  </p>
                  <p className="text-sm text-primary font-semibold mt-2 animate-fade-in">
                    Pagamento único • Parcela em até 2x no cartão se preferir
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full h-12 text-base font-semibold transition-all duration-300 bg-gradient-to-r from-primary to-[hsl(25,100%,65%)] hover:shadow-2xl hover:scale-105 shadow-lg"
                  disabled={loading}
                  onClick={handleCheckout}
                >
                  {loading ? "Redirecionando..." : "Garantir meu acesso"}
                </Button>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <p className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto animate-fade-in">
            Pagamento único e seguro via Mercado Pago • Acesso enviado por
            e-mail após confirmação • Sem renovação automática ou mensalidade
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Pricing;
