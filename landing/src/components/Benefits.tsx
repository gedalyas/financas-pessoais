import { Card } from "@/components/ui/card";
import { LayoutDashboard, PieChart, Lock, Target, Zap, Palette } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const benefits = [
  {
    icon: LayoutDashboard,
    title: "Gestão completa em um só lugar",
    description: "Dashboard intuitivo com todos os seus dados financeiros centralizados e acessíveis."
  },
  {
    icon: PieChart,
    title: "Relatórios automáticos e visuais",
    description: "Gráficos fáceis de entender que transformam números em insights acionáveis."
  },
  {
    icon: Palette,
    title: "Categorias personalizadas",
    description: "Crie e customize categorias de acordo com seu estilo de vida e necessidades."
  },
  {
    icon: Target,
    title: "Controle de metas e limites",
    description: "Estabeleça objetivos financeiros e acompanhe seu progresso em tempo real."
  },
  {
    icon: Lock,
    title: "Total privacidade e segurança",
    description: "Seus dados são 100% protegidos. Sem propagandas, sem compartilhamento de informações."
  },
  {
    icon: Zap,
    title: "Simples e rápido",
    description: "Interface moderna sem complicação. Registre transações em segundos."
  }
];

const Benefits = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Por que escolher a{" "}
            <span className="text-primary">Prospera</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para tomar controle total das suas finanças
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Card 
                className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20 h-full"
              >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
