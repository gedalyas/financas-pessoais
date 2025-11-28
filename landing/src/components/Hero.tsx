import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import prosperaLogo from "@/assets/prospera-logo.png";
import dashboardHero from "@/assets/dashboard-hero-real.jpg";

const Hero = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to payment or next step
    console.log("Email submitted:", email);
  };

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

          <form 
            onSubmit={handleSubmit} 
            className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom duration-700 delay-200"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-12 text-base border-2 focus-visible:ring-primary"
              />
              <Button 
                type="submit" 
                size="lg"
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Acesso imediato após o pagamento • Sem compromisso de renovação
            </p>
          </form>

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
