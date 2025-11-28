import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/ScrollReveal";

const faqs = [
  {
    question: "Como recebo meu acesso?",
    answer: "Seu acesso será enviado no email inserido no campo, juntamente com o token, após a confirmação do pagamento. Basta cadastrar sua conta e começar a usar a plataforma imediatamente."
  },
  {
    question: "Posso usar no celular?",
    answer: "Sim! Você pode usar tanto no celular quanto no tablet ou desktop. Nossa plataforma é 100% responsiva e funciona perfeitamente em qualquer dispositivo."
  },
  {
    question: "O pagamento é seguro?",
    answer: "Sim, totalmente seguro e garantido pelo Mercado Pago. Somos uma empresa séria chegando para entregar o resultado que o brasileiro merece."
  },
  {
    question: "Posso alterar minhas categorias?",
    answer: "Claro! Além de poder alterar, você pode personalizar da forma que desejar. Crie categorias com cores e nomes que fazem sentido para você."
  },
  {
    question: "Quanto tempo leva para receber o link?",
    answer: "O acesso é enviado imediatamente após a confirmação do pagamento. Você receberá um email com todas as instruções para começar."
  },
  {
    question: "O plano renova automaticamente?",
    answer: "Não! Você tem total controle. Não há renovação automática, então você decide quando e se quer continuar usando a plataforma."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, o cancelamento é fácil e sem burocracia. Basta acessar suas configurações e solicitar o cancelamento quando desejar."
  },
  {
    question: "Meus dados estão seguros?",
    answer: "Absolutamente. Utilizamos criptografia de ponta a ponta e não compartilhamos seus dados com terceiros. Sua privacidade é nossa prioridade."
  }
];

const FAQ = () => {
  return (
    <section className="py-20 bg-secondary/30">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas sobre a Prospera
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border-2 rounded-lg px-6 hover:border-primary/20 transition-colors"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
