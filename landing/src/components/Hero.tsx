import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import prosperaLogo from "@/assets/prospera-logo.png";
import dashboardHero from "@/assets/dashboard-hero-real.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-background to-secondary/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_50%)]" />

      <div className="container relative z-10 px-4 py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          <img
            src={prosperaLogo}
            alt="Prospera Finanças Tecnológicas"
            className="h-36 md:h-52 lg:h-64 w-auto animate-in fade-in slide-in-from-top duration-700"
          />

          <div className="space-y-4 max-w-4xl animate-in fade-in slide-in-from-bottom duration-700 delay-100">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Seu dinheiro sob{" "}
              <span className="text-primary bg-gradient-to-r from-primary to-[hsl(25,100%,65%)] bg-clip-text text-transparent">
                controle
              </span>
              {" "}em minutos
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Gerencie gastos, metas e fluxo de caixa, estabeleça limites com a ferramenta
              mais simples e tecnológica do Brasil.
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom duration-700 delay-200">
            <Button
              size="lg"
              className="h-14 px-10 text-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={() => {
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Ver plano e garantir acesso
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-sm text-muted-foreground mt-3">
              Pagamento único • Parcelamento em até 2x • Sem renovação automática
            </p>
          </div>

          <div className="w-full max-w-5xl mt-12 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/20">
              <img
                src={dashboardHero}
                alt="Dashboard Prospera - Receitas, Despesas e Saldo"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
            <p className="text-center mt-4 text-sm text-muted-foreground">
              Interface real da plataforma - Dashboard com receitas, despesas e saldo em tempo real
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
