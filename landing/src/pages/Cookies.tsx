import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const Cookies = () => {
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

        <h1 className="text-4xl font-bold mb-8">Política de Cookies</h1>

        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. O Que São Cookies?</h2>
            <p className="text-muted-foreground">
              Cookies são pequenos arquivos de texto que são armazenados no seu dispositivo
              (computador, tablet ou smartphone) quando você visita um site. Eles são amplamente
              utilizados para fazer os sites funcionarem de forma mais eficiente, bem como para
              fornecer informações aos proprietários do site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Como Usamos Cookies</h2>
            <p className="text-muted-foreground">
              O Prospera utiliza cookies para melhorar sua experiência ao usar nossa plataforma.
              Nossos cookies nos ajudam a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Manter você conectado durante sua sessão</li>
              <li>Lembrar suas preferências e configurações</li>
              <li>Entender como você usa nossa plataforma</li>
              <li>Melhorar o desempenho e funcionalidade do site</li>
              <li>Personalizar seu conteúdo e experiência</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Tipos de Cookies Que Usamos</h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Cookies Estritamente Necessários</h3>
            <p className="text-muted-foreground">
              Esses cookies são essenciais para que você possa navegar pelo site e usar seus
              recursos. Sem esses cookies, serviços como autenticação de usuário não podem ser
              fornecidos.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Cookies de Funcionalidade</h3>
            <p className="text-muted-foreground">
              Esses cookies permitem que o site lembre de escolhas que você faz (como seu idioma
              ou região) e fornecem recursos aprimorados e mais pessoais.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Cookies de Desempenho</h3>
            <p className="text-muted-foreground">
              Esses cookies coletam informações sobre como os visitantes usam nosso site,
              como quais páginas são mais visitadas. Todos os dados coletados são agregados
              e, portanto, anônimos.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.4 Cookies de Marketing</h3>
            <p className="text-muted-foreground">
              Esses cookies são usados para rastrear visitantes em sites. A intenção é exibir
              anúncios que sejam relevantes e envolventes para o usuário individual.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cookies de Terceiros</h2>
            <p className="text-muted-foreground">
              Algumas funcionalidades do Prospera utilizam serviços de terceiros que podem
              definir seus próprios cookies, incluindo:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Mercado Pago:</strong> Para processar pagamentos com segurança</li>
              <li><strong>Ferramentas de análise:</strong> Para entender o uso da plataforma</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Esses terceiros têm suas próprias políticas de privacidade e não temos controle
              sobre seus cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Duração dos Cookies</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">5.1 Cookies de Sessão</h3>
            <p className="text-muted-foreground">
              Cookies temporários que expiram quando você fecha seu navegador. Usamos esses
              cookies para manter você conectado durante sua sessão.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 Cookies Persistentes</h3>
            <p className="text-muted-foreground">
              Cookies que permanecem no seu dispositivo por um período definido ou até que você
              os exclua. Usamos esses cookies para lembrar suas preferências entre visitas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Como Gerenciar Cookies</h2>
            <p className="text-muted-foreground">
              Você pode controlar e gerenciar cookies de várias maneiras:
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-4">6.1 Configurações do Navegador</h3>
            <p className="text-muted-foreground">
              A maioria dos navegadores permite que você:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Veja quais cookies você tem e os exclua individualmente</li>
              <li>Bloqueie cookies de terceiros</li>
              <li>Bloqueie todos os cookies de sites específicos</li>
              <li>Bloqueie todos os cookies de serem definidos</li>
              <li>Exclua todos os cookies quando fechar seu navegador</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Impacto de Desabilitar Cookies</h3>
            <p className="text-muted-foreground">
              Por favor, note que desabilitar cookies pode afetar a funcionalidade do Prospera.
              Sem cookies, você pode não conseguir usar determinados recursos, como:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Permanecer conectado à sua conta</li>
              <li>Salvar suas preferências</li>
              <li>Acessar áreas personalizadas do site</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Atualizações a Esta Política</h2>
            <p className="text-muted-foreground">
              Podemos atualizar esta Política de Cookies periodicamente para refletir mudanças
              em nossa prática ou por outras razões operacionais, legais ou regulatórias. A
              versão mais recente sempre estará disponível nesta página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Mais Informações</h2>
            <p className="text-muted-foreground">
              Para mais informações sobre como protegemos suas informações pessoais, consulte
              nossa{" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contato</h2>
            <p className="text-muted-foreground">
              Se você tiver dúvidas sobre nossa Política de Cookies, entre em contato conosco:
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

export default Cookies;
