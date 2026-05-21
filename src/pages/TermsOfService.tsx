import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Termos de Uso | Hook7 - API WhatsApp"
        description="Termos de uso da plataforma Hook7. Conheça as regras e condições para utilização da API WhatsApp para automações empresariais."
        canonical="https://app.hook7.com.br/terms"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-16 max-w-4xl">
          {/* Header com Logo */}
          <header className="flex flex-col items-center mb-12">
            <img 
              src="/hook7-logo.svg" 
              alt="Hook7 - API WhatsApp para automações empresariais"
              loading="lazy"
              width="64"
              height="64"
              className="h-16 w-16 mb-6 rounded-full shadow-lg"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-2">
              Termos de Uso – Hook7
            </h1>
            <p className="text-sm text-muted-foreground">
              Última atualização: 25 de novembro de 2025
            </p>
          </header>

          {/* Conteúdo */}
          <main className="space-y-8 text-foreground">
            {/* Introdução */}
            <div className="space-y-4 leading-relaxed">
              <p>
                Bem-vindo ao <strong>Hook7</strong>, uma plataforma desenvolvida e operada por <strong>S7</strong>, 
                controladora empresarial do titular Mario R Schiavon, inscrito no CNPJ 46.214.207/0001-60, 
                com endereço na Rua Alexandre Foggiatto, Brasil.
              </p>
              <p>
                Contato oficial: <a href="mailto:contato@upevolution.com.br" className="text-primary hover:underline">contato@upevolution.com.br</a>
              </p>
              <p className="font-medium">
                Ao utilizar a Hook7, você concorda integralmente com estes Termos de Uso. 
                Caso não concorde, não utilize a plataforma.
              </p>
            </div>

            {/* Seção 1 */}
            <section className="space-y-3" aria-labelledby="section-1">
              <h2 id="section-1" className="text-2xl font-semibold text-foreground">1. OBJETO</h2>
              <p className="leading-relaxed">
                O Hook7 é uma plataforma que fornece uma API de conexão com o WhatsApp, permitindo envio e 
                recebimento de mensagens e integrações com sistemas externos. O Hook7 opera como servidor de API, 
                oferecendo conexão, tráfego e suporte técnico básico.
              </p>
            </section>

            {/* Seção 2 */}
            <section className="space-y-3" aria-labelledby="section-2">
              <h2 id="section-2" className="text-2xl font-semibold text-foreground">2. O QUE O Hook7 NÃO É E NÃO FAZ</h2>
              <ul className="space-y-2 leading-relaxed list-disc list-inside ml-4">
                <li>O Hook7 não é API oficial da Meta (WhatsApp).</li>
                <li>O Hook7 não fornece número de WhatsApp.</li>
                <li>O Hook7 não se responsabiliza por bloqueios, bans ou restrições aplicadas pelo WhatsApp.</li>
                <li>O Hook7 não se responsabiliza pelo conteúdo das mensagens enviadas pelos usuários.</li>
                <li>O Hook7 não garante entrega ou recebimento de 100% das mensagens.</li>
                <li>O Hook7 não é responsável por perdas financeiras, falhas externas, ações da Meta ou danos causados por mau uso da API.</li>
              </ul>
            </section>

            {/* Seção 3 */}
            <section className="space-y-3" aria-labelledby="section-3">
              <h2 id="section-3" className="text-2xl font-semibold text-foreground">3. CADASTRO DO USUÁRIO</h2>
              <p className="leading-relaxed">
                O usuário deve criar uma conta, fornecer e-mail válido e aceitar este Termo de Uso. 
                Ele é responsável por manter seus dados corretos e sua senha segura.
              </p>
            </section>

            {/* Seção 4 */}
            <section className="space-y-3" aria-labelledby="section-4">
              <h2 id="section-4" className="text-2xl font-semibold text-foreground">4. PLANOS, COBRANÇA E REEMBOLSO</h2>
              <ul className="space-y-2 leading-relaxed list-disc list-inside ml-4">
                <li>Valor mensal por sessão</li>
                <li>Cobrança recorrente</li>
                <li>Sem período gratuito</li>
                <li>Sem reembolso</li>
                <li>Até 5 sessões por usuário; acima disso requer aprovação</li>
                <li>Cobranças podem aparecer como S7</li>
              </ul>
            </section>

            {/* Seção 5 */}
            <section className="space-y-3" aria-labelledby="section-5">
              <h2 id="section-5" className="text-2xl font-semibold text-foreground">5. REGRAS DE USO</h2>
              <p className="leading-relaxed">
                O usuário concorda em não usar a API para fins ilegais.
              </p>
              <p className="leading-relaxed">
                SPAM pode resultar no banimento do número pelo WhatsApp, e isso é responsabilidade do usuário.
              </p>
              <p className="leading-relaxed">
                Integrações externas são permitidas, mas O Hook7 não responde por falhas nelas.
              </p>
            </section>

            {/* Seção 6 */}
            <section className="space-y-3" aria-labelledby="section-6">
              <h2 id="section-6" className="text-2xl font-semibold text-foreground">6. LIMITAÇÕES DE RESPONSABILIDADE</h2>
              <p className="leading-relaxed">
                O Hook7 não garante estabilidade, continuidade ou entrega total de mensagens.
              </p>
              <p className="leading-relaxed">
                Não se responsabiliza por banimentos, problemas no WhatsApp ou prejuízos decorrentes do uso da API.
              </p>
            </section>

            {/* Seção 7 */}
            <section className="space-y-3" aria-labelledby="section-7">
              <h2 id="section-7" className="text-2xl font-semibold text-foreground">7. INTEGRAÇÕES EXTERNAS</h2>
              <p className="leading-relaxed">
                O usuário pode integrar com sistemas externos, como n8n, Bubble, Make etc.
              </p>
              <p className="leading-relaxed">
                O Hook7 não é responsável por falhas nessas integrações.
              </p>
            </section>

            {/* Seção 8 */}
            <section className="space-y-3" aria-labelledby="section-8">
              <h2 id="section-8" className="text-2xl font-semibold text-foreground">8. DADOS COLETADOS E PRIVACIDADE</h2>
              <p className="leading-relaxed">
                O Hook7 coleta apenas e-mail para autenticação.
              </p>
              <p className="leading-relaxed">
                Não armazena mensagens; apenas trafega temporariamente.
              </p>
              <p className="leading-relaxed">
                Não utiliza cookies.
              </p>
            </section>

            {/* Seção 9 */}
            <section className="space-y-3" aria-labelledby="section-9">
              <h2 id="section-9" className="text-2xl font-semibold text-foreground">9. SUSPENSÃO OU ENCERRAMENTO DE CONTA</h2>
              <p className="leading-relaxed">
                O Hook7 pode encerrar contas que realizem:
              </p>
              <ul className="space-y-2 leading-relaxed list-disc list-inside ml-4">
                <li>Uso ilegal</li>
                <li>Conteúdos proibidos</li>
                <li>Ações maliciosas</li>
              </ul>
              <p className="leading-relaxed">
                SPAM não gera suspensão automática, mas pode resultar em banimento no WhatsApp.
              </p>
            </section>

            {/* Seção 10 */}
            <section className="space-y-3" aria-labelledby="section-10">
              <h2 id="section-10" className="text-2xl font-semibold text-foreground">10. ALTERAÇÕES NOS TERMOS</h2>
              <p className="leading-relaxed">
                O Hook7 pode alterar este Termo a qualquer momento.
              </p>
              <p className="leading-relaxed">
                O uso contínuo implica aceitação das alterações.
              </p>
            </section>

            {/* Seção 11 */}
            <section className="space-y-3" aria-labelledby="section-11">
              <h2 id="section-11" className="text-2xl font-semibold text-foreground">11. LEGISLAÇÃO APLICÁVEL</h2>
              <p className="leading-relaxed">
                Termo regido pelas leis brasileiras e pela LGPD.
              </p>
              <p className="leading-relaxed">
                Foro: comarca do responsável legal (Mario R Schiavon).
              </p>
            </section>

            {/* Seção 12 */}
            <section className="space-y-3" aria-labelledby="section-12">
              <h2 id="section-12" className="text-2xl font-semibold text-foreground">12. CONTATO</h2>
              <p className="leading-relaxed">
                E-mail: <a href="mailto:contato@upevolution.com.br" className="text-primary hover:underline">contato@upevolution.com.br</a>
              </p>
              <p className="leading-relaxed">
                Responsável: Mario R Schiavon
              </p>
              <p className="leading-relaxed">
                Holding: S7
              </p>
            </section>
          </main>

          {/* Botão de Navegação */}
          <nav className="mt-12 flex flex-col sm:flex-row gap-4 justify-center" aria-label="Navegação">
            <Button 
              onClick={() => navigate("/login")}
              size="lg"
              className="px-8"
            >
              Voltar ao Login
            </Button>
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              size="lg"
              className="px-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Voltar ao Início
            </Button>
          </nav>

          {/* Rodapé */}
          <footer className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hook7 – Powered by S7
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}

