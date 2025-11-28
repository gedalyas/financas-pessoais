import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const FinalCTA = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-gradient-to-br from-primary to-[hsl(25,100%,65%)] text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      
      <div className="container px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Uma nota de 10 paga sua transformação financeira</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Começar agora por apenas{" "}
              <span className="text-white underline decoration-4 underline-offset-8 whitespace-nowrap">
                R$ 9,99
              </span>
            </h2>

            <p className="text-xl md:text-2xl opacity-95 max-w-2xl mx-auto">
              E dar o primeiro passo rumo ao controle total das suas finanças
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg"
                onClick={scrollToTop}
                className="h-14 px-8 bg-white text-primary hover:bg-white/90 font-bold text-lg shadow-2xl hover:scale-105 transition-all"
              >
                Quero Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm opacity-90">
                ✓ Acesso imediato • ✓ Sem renovação automática • ✓ Suporte incluído
              </p>
            </div>

            <div className="pt-8 grid grid-cols-3 gap-8 max-w-2xl mx-auto border-t border-white/20">
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1">+50</div>
                <div className="text-sm opacity-90">Usuários Ativos</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1">100%</div>
                <div className="text-sm opacity-90">Seguro</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold mb-1">24h</div>
                <div className="text-sm opacity-90">Suporte</div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTA;
