import { Mail, CreditCard, Rocket } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

const steps = [
  {
    icon: Mail,
    title: "Digite seu e-mail",
    description: "Insira seu melhor e-mail no formulário acima"
  },
  {
    icon: CreditCard,
    title: "Realize o pagamento",
    description: "Pagamento seguro via Mercado Pago em poucos cliques"
  },
  {
    icon: Rocket,
    title: "Comece a usar",
    description: "Receba seu link de acesso no e-mail com o token imediatamente"
  }
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container px-4">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Como funciona?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Em apenas 3 passos simples você estará no controle das suas finanças
            </p>
          </div>
        </ScrollReveal>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <ScrollReveal key={index} delay={index * 150}>
                <div className="relative">
                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-primary/20" />
                  )}
                  
                  <div className="relative flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <step.icon className="w-12 h-12 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 md:static md:absolute md:-top-2 md:-left-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
