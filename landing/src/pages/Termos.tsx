import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Termos = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:underline mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground">
              Ao acessar e usar o Prospera, você concorda em cumprir e estar vinculado aos
              seguintes termos e condições de uso. Se você não concordar com qualquer parte
              destes termos, não deverá usar nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground">
              O Prospera é uma plataforma de educação e gestão financeira pessoal que oferece
              ferramentas para controle de gastos, planejamento financeiro e educação sobre
              finanças pessoais. O serviço é destinado a usuários brasileiros e todos os valores
              são apresentados em reais (R$).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cadastro e Conta do Usuário</h2>
            <p className="text-muted-foreground">
              Para utilizar determinadas funcionalidades do Prospera, você precisará criar uma
              conta fornecendo informações precisas e completas. Você é responsável por manter
              a confidencialidade de suas credenciais de acesso e por todas as atividades que
              ocorram em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Planos e Pagamentos</h2>
            <p className="text-muted-foreground">
              O Prospera oferece planos mensais (R$9,99/mês) e anuais (R$49,99/ano). Os
              pagamentos são processados através do Mercado Pago. A assinatura não é renovada
              automaticamente. Após o término do período contratado, você precisará realizar
              um novo pagamento para continuar acessando a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Uso Aceitável</h2>
            <p className="text-muted-foreground">
              Você concorda em usar o Prospera apenas para fins legais e de acordo com estes
              Termos. É proibido usar a plataforma de qualquer maneira que possa danificar,
              desabilitar, sobrecarregar ou prejudicar o serviço, ou interferir no uso de
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground">
              Todo o conteúdo, recursos e funcionalidades do Prospera, incluindo mas não
              limitado a textos, gráficos, logotipos, ícones e software, são de propriedade
              exclusiva da Prospera Finanças Tecnológicas e são protegidos por leis de direitos
              autorais e propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Privacidade e Dados</h2>
            <p className="text-muted-foreground">
              Seu uso do Prospera também é regido por nossa Política de Privacidade. Por favor,
              revise nossa Política de Privacidade para entender nossas práticas de coleta e
              uso de dados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground">
              O Prospera é fornecido "como está" sem garantias de qualquer tipo. Não nos
              responsabilizamos por decisões financeiras tomadas com base nas informações
              fornecidas pela plataforma. Recomendamos sempre consultar um profissional
              financeiro qualificado para orientação específica.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Modificações nos Termos</h2>
            <p className="text-muted-foreground">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos
              os usuários sobre mudanças significativas por e-mail ou através da plataforma.
              O uso continuado do serviço após tais modificações constitui sua aceitação dos
              novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
            <p className="text-muted-foreground">
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco em
              contato@prospera.com
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Última atualização: Novembro de 2024
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Termos;
