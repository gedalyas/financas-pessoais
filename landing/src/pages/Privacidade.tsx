import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Privacidade = () => {
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

        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p className="text-muted-foreground">
              A Prospera Finanças Tecnológicas ("Prospera", "nós" ou "nosso") está comprometida
              em proteger sua privacidade. Esta Política de Privacidade explica como coletamos,
              usamos, divulgamos e protegemos suas informações quando você usa nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Informações Que Coletamos</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">2.1 Informações Fornecidas por Você</h3>
            <p className="text-muted-foreground">
              Coletamos informações que você nos fornece diretamente, incluindo:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Nome e informações de contato (e-mail)</li>
              <li>Informações de pagamento processadas pelo Mercado Pago</li>
              <li>Dados financeiros que você insere na plataforma (receitas, despesas, metas)</li>
              <li>Preferências e configurações da conta</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">2.2 Informações Coletadas Automaticamente</h3>
            <p className="text-muted-foreground">
              Quando você usa o Prospera, podemos coletar automaticamente:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Informações do dispositivo (tipo, sistema operacional, navegador)</li>
              <li>Dados de uso (páginas visitadas, recursos utilizados, tempo de uso)</li>
              <li>Endereço IP e dados de localização aproximada</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos Suas Informações</h2>
            <p className="text-muted-foreground">
              Utilizamos as informações coletadas para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fornecer, operar e manter nossa plataforma</li>
              <li>Processar pagamentos e gerenciar assinaturas</li>
              <li>Personalizar sua experiência e fornecer conteúdo relevante</li>
              <li>Enviar notificações e atualizações importantes</li>
              <li>Melhorar nossos serviços através de análises e pesquisas</li>
              <li>Detectar e prevenir fraudes e abusos</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Informações</h2>
            <p className="text-muted-foreground">
              Não vendemos suas informações pessoais. Podemos compartilhar suas informações
              apenas nas seguintes situações:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Processadores de pagamento:</strong> Mercado Pago para processar transações</li>
              <li><strong>Provedores de serviços:</strong> Empresas que nos auxiliam na operação da plataforma</li>
              <li><strong>Conformidade legal:</strong> Quando exigido por lei ou para proteger nossos direitos</li>
              <li><strong>Transferência de negócios:</strong> Em caso de fusão, aquisição ou venda de ativos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground">
              Implementamos medidas de segurança técnicas e organizacionais apropriadas para
              proteger suas informações pessoais contra acesso não autorizado, alteração,
              divulgação ou destruição. Isso inclui:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso rigorosos</li>
              <li>Monitoramento regular de segurança</li>
              <li>Treinamento de equipe em práticas de segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar consentimento</li>
              <li>Opor-se ao tratamento de dados</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Para exercer esses direitos, entre em contato conosco através do e-mail
              contato@prospera.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Retenção de Dados</h2>
            <p className="text-muted-foreground">
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os
              propósitos descritos nesta política, a menos que um período de retenção mais longo
              seja exigido ou permitido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência. Para
              mais informações, consulte nossa Política de Cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Alterações a Esta Política</h2>
            <p className="text-muted-foreground">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você
              sobre mudanças significativas publicando a nova política em nossa plataforma e
              atualizando a data de "Última atualização" abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contato</h2>
            <p className="text-muted-foreground">
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
            </p>
            <ul className="list-none text-muted-foreground space-y-2 mt-2">
              <li>E-mail: contato@prospera.com</li>
              <li>Instagram: @prospera</li>
            </ul>
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

export default Privacidade;
