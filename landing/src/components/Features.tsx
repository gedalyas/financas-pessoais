import { Card } from "@/components/ui/card";
import { BarChart3, Wallet, FolderOpen, Repeat, TrendingUp, FileText } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const features = [
  {
    icon: BarChart3,
    title: "Dashboard Completo",
    description: "Visualize todas as suas finanças em um painel intuitivo com gráficos e indicadores em tempo real."
  },
  {
    icon: Wallet,
    title: "Controle de Gastos",
    description: "Registre e acompanhe cada centavo gasto, com alertas quando ultrapassar seus limites."
  },
  {
    icon: FolderOpen,
    title: "Categorias Personalizadas",
    description: "Crie categorias com cores e ícones personalizados para organizar suas transações."
  },
  {
    icon: Repeat,
    title: "Transações Recorrentes",
    description: "Configure gastos e receitas que se repetem automaticamente todo mês."
  },
  {
    icon: TrendingUp,
    title: "Metas Financeiras",
    description: "Defina objetivos, acompanhe o progresso e receba insights para alcançá-los mais rápido."
  },
  {
    icon: FileText,
    title: "Relatórios Mensais",
    description: "Receba análises detalhadas do seu comportamento financeiro com sugestões de economia."
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-background to-secondary/30">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Recursos que fazem a diferença
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas poderosas para você dominar suas finanças
            </p>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <Card 
                className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-card border-2 h-full"
              >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(25,100%,65%)] flex items-center justify-center mb-6 shadow-lg">
                <feature.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
