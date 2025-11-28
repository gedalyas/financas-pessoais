import { Shield, Lock, Award, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ScrollReveal";

const securityFeatures = [
  {
    icon: Shield,
    title: "Pagamento Seguro",
    description: "Todas as transações são processadas pelo Mercado Pago, líder em segurança de pagamentos"
  },
  {
    icon: Lock,
    title: "Dados Criptografados",
    description: "Suas informações financeiras são protegidas com criptografia de ponta a ponta"
  },
  {
    icon: Award,
    title: "Empresa Séria",
    description: "Somos uma empresa comprometida em entregar o resultado que o brasileiro merece"
  },
  {
    icon: CheckCircle,
    title: "Sem Renovação Automática",
    description: "Controle total sobre seu acesso. Cancele quando quiser sem complicações"
  }
];

const Security = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Sua segurança é nossa prioridade
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pode confiar: seus dados e pagamentos estão totalmente protegidos
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {securityFeatures.map((feature, index) => (
              <ScrollReveal key={index} delay={index * 150}>
                <Card 
                  className="p-6 flex items-start gap-4 hover:shadow-lg transition-all border-2 hover:border-primary/20 h-full"
                >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Security;
