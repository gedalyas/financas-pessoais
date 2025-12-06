import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, TrendingDown, Calendar, Coins } from "lucide-react";
import { useCounterAnimation } from "@/hooks/use-counter-animation";
import { ScrollReveal } from "@/components/ScrollReveal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type PlanId = "avista" | "parcelado12x";

const commonFeatures = [
  "Dashboard completo",
  "Controle de gastos ilimitado",
  "Categorias personalizadas",
  "Metas e limites",
  "Relatórios completos",
  "Suporte por email"
];

const plans: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight: boolean;
  badge?: string;
}[] = [
  {
    id: "parcelado12x",
    name: "Plano Mensal",
    price: "9,99",
    period: "por mês (12x)",
    description: "Investimento diluído em 12 parcelas mensais",
    features: commonFeatures,
    highlight: false
  },
  {
    id: "avista",
    name: "Plano Anual",
    price: "49,99",
    period: "pagamento único",
    description: "Melhor custo-benefício",
    badge: "Economize 58%",
    features: commonFeatures,
    highlight: true
  }
];

const Pricing = () => {
  const { ref: savingsRef, count: savingsCount } = useCounterAnimation({ 
    end: 69.89, 
    duration: 2500,
    decimals: 2 
  });

  const [email, setEmail] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: PlanId) {
    try {
      setError(null);

      if (!email) {
        setError("Por favor, preencha seu melhor e-mail antes de continuar.");
        return;
      }

      if (!API_BASE_URL) {
        setError("URL da API não configurada. Defina VITE_API_BASE_URL no .env da landing.");
        return;
      }

      setLoadingPlan(plan);

      const res = await fetch(`${API_BASE_URL}/checkout/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Erro ao iniciar o pagamento. Tente novamente.");
        return;
      }

      // redireciona para o Mercado Pago
      window.location.href = data.init_point || data.sandbox_init_point;
    } catch (err) {
      console.error(err);
      setError("Erro inesperado. Tente novamente em alguns instantes.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Investimento acessível que cabe no seu bolso
            </p>
          </div>
        </ScrollReveal>

        {/* Banner de comparação com contador animado */}
        <div className="max-w-4xl mx-auto mb-12" ref={savingsRef}>
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <TrendingDown className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Compare e Economize
                </h3>
                <p className="text-muted-foreground mb-1">
                  Plano Mensal:{" "}
                  <span className="font-semibold text-foreground">
                    R$ 9,99 × 12 meses = R$ 119,88/ano
                  </span>
                </p>
                <p className="text-foreground mb-2">
                  Plano Anual:{" "}
                  <span className="font-semibold">R$ 49,99/ano</span>
                </p>
                <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-lg">
                  <Coins className="w-5 h-5 text-primary animate-bounce" />
                  <span className="text-primary font-bold text-2xl tabular-nums">
                    R$ {savingsCount}
                  </span>
                  <span className="text-primary font-semibold">
                    de economia (58%)!
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

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <ScrollReveal key={plan.id} delay={index * 200}>
              <Card
                className={`relative p-8 transition-all duration-500 hover:shadow-2xl ${
                  plan.highlight 
                    ? "border-2 border-primary shadow-2xl md:scale-105 animate-scale-in" 
                    : "border-2 hover:border-primary/30 hover:scale-105"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-top duration-700">
                    <div className="bg-gradient-to-r from-primary to-[hsl(25,100%,65%)] text-primary-foreground px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
                      <Sparkles className="w-4 h-4" />
                      {plan.badge}
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                )}

                {/* Comparação específica do plano anual */}
                {plan.highlight && (
                  <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-fade-in">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground line-through">
                        12 × R$ 9,99
                      </span>
                      <span className="text-muted-foreground line-through">
                        R$ 119,88
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-primary">
                      <span>Pagamento anual</span>
                      <span className="text-xl">R$ 49,99</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-primary/20 text-center">
                      <span className="text-primary font-semibold inline-flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 animate-bounce" />
                        <span>Você economiza </span>
                        <span className="text-xl tabular-nums">
                          R$ {savingsCount}
                        </span>
                      </span>
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

                  {plan.highlight && (
                    <p className="text-sm text-primary font-semibold mt-2 animate-fade-in">
                      Equivalente a R$ 4,17/mês
                    </p>
                  )}
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
                  className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-primary to-[hsl(25,100%,65%)] hover:shadow-2xl hover:scale-105 shadow-lg"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105"
                  }`}
                  disabled={loadingPlan !== null}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {loadingPlan === plan.id ? "Redirecionando..." : "Assinar Agora"}
                </Button>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <p className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto animate-fade-in">
            Pagamento único e seguro via Mercado Pago • Acesso imediato após confirmação •
            Sem renovação automática
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Pricing;
