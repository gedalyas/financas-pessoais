import mobileMockup from "@/assets/mobile-mockup-real.jpg";
import multiDeviceMockup from "@/assets/multi-device-real.jpg";
import { ScrollReveal } from "@/components/ScrollReveal";

const Demo = () => {
  return (
    <section className="py-12 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Veja a <span className="text-primary">Prospera</span> em ação
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Interface moderna e intuitiva, projetada para facilitar sua vida financeira
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-6xl mx-auto space-y-8">
          <ScrollReveal delay={200}>
            {/* Mobile mockup */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl md:text-3xl font-bold">
                  Suas finanças na palma da mão
                </h3>
                <p className="text-muted-foreground text-lg">
                  Acompanhe receitas, despesas e saldo em tempo real. Filtros inteligentes 
                  por data e categoria para análises precisas do seu fluxo de caixa.
                </p>
                <ul className="space-y-2">
                  {["Cards com valores em destaque", "Filtros por período e categoria", "Comparativos mensais automáticos"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <img 
                  src={mobileMockup} 
                  alt="App móvel Prospera - Estatísticas" 
                  className="w-full max-w-sm mx-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default Demo;
