import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { SEO } from "@/components/SEO";
import { Hook7Logo } from "@/components/Hook7Logo";

const Section = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <section className="space-y-3" aria-labelledby={`section-${n}`}>
    <h2 id={`section-${n}`} className="text-2xl font-semibold text-foreground">{n}. {title}</h2>
    {children}
  </section>
);

const List = ({ items }: { items: ReactNode[] }) => (
  <ul className="space-y-2 leading-relaxed list-disc list-inside ml-4">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="Termos de Uso | Hook7 - API WhatsApp"
        description="Termos de uso da plataforma Hook7. Conheça as regras, limites e condições para utilização da API WhatsApp (não oficial) para automações empresariais."
        canonical="https://app.hook7.com.br/terms"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 md:px-8 py-8 md:py-16 max-w-4xl">
          {/* Header com Logo */}
          <header className="flex flex-col items-center mb-12">
            <Hook7Logo
              size={64}
              className="h-16 w-16 mb-6 shadow-lg"
            />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-2">
              Termos de Uso – Hook7
            </h1>
            <p className="text-sm text-muted-foreground">
              Última atualização: 28 de setembro de 2026
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
                Contato oficial: <a href="mailto:contato@hook7.com.br" className="text-primary hover:underline">contato@hook7.com.br</a>
              </p>
              <p className="font-medium">
                Ao criar uma conta ou utilizar a Hook7, você concorda integralmente com estes Termos de Uso e com a{" "}
                <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
                Caso não concorde, não utilize a plataforma.
              </p>
            </div>

            <Section n={1} title="OBJETO E NATUREZA DO SERVIÇO">
              <p className="leading-relaxed">
                O Hook7 fornece uma API REST para conectar um número de WhatsApp do próprio usuário a sistemas
                externos, permitindo enviar e receber mensagens de forma automatizada.
              </p>
              <p className="leading-relaxed">
                O Hook7 <strong>não é a API oficial do WhatsApp (WhatsApp Business Platform / Cloud API)</strong> e
                não possui qualquer vínculo, parceria ou autorização da Meta. A conexão é feita pelo mesmo protocolo
                do WhatsApp Web, a partir de um motor de código aberto (Evolution API): o usuário pareia o seu
                aparelho lendo um QR Code, e a sessão funciona como um “dispositivo conectado” daquele número.
              </p>
              <p className="leading-relaxed">
                Por esse motivo, o funcionamento do serviço depende do WhatsApp, que pode alterar seu protocolo,
                limitar recursos ou restringir números a qualquer momento, sem aviso ao Hook7.
              </p>
            </Section>

            <Section n={2} title="O QUE O HOOK7 OFERECE">
              <p className="leading-relaxed">Cada sessão contratada inclui:</p>
              <List items={[
                "Uma instância de WhatsApp conectada via QR Code, com nome e token de acesso próprios;",
                "Envio de mensagens de texto, imagens, vídeos, documentos, áudios (mensagem de voz), enquetes, localização e contatos (vCard);",
                "Consulta do estado da conexão, geração de QR Code, desconexão do número e listagem dos grupos da instância;",
                "Encaminhamento de eventos por webhook (mensagens recebidas, status de entrega/leitura e mudanças de conexão) para uma URL HTTPS do usuário, configurado pelo painel;",
                "Painel com monitoramento das sessões, contagem de mensagens, registro de entregas de webhook, extrator de grupos e envio de mensagem de teste;",
                "Documentação da API e suporte técnico básico por e-mail.",
              ]} />
              <p className="leading-relaxed">
                Mensagens interativas do tipo lista/menu são oferecidas em caráter <strong>experimental</strong>:
                o WhatsApp restringe esse formato fora da API oficial e ele pode não ser exibido em todos os aparelhos.
              </p>
            </Section>

            <Section n={3} title="O QUE O HOOK7 NÃO É E NÃO FAZ">
              <List items={[
                "Não é a API oficial da Meta e não oferece selo verde, verificação de conta, modelos (templates) aprovados, botões oficiais ou integração com o Gerenciador de Negócios;",
                "Não fornece, vende ou aluga números de WhatsApp — o número é sempre do usuário;",
                "Não impede, reverte nem se responsabiliza por bloqueios, banimentos ou restrições aplicadas pelo WhatsApp;",
                "Não garante a entrega, a leitura ou a exibição de 100% das mensagens, nem de todos os tipos de mensagem em todos os aparelhos;",
                "Não armazena o histórico de conversas nem funciona como caixa de entrada ou CRM;",
                "Não reenvia eventos de webhook que falharem no seu servidor;",
                "Não se responsabiliza pelo conteúdo das mensagens enviadas pelos usuários.",
              ]} />
            </Section>

            <Section n={4} title="CADASTRO, CONTA E TOKENS">
              <p className="leading-relaxed">
                O usuário deve criar uma conta com e-mail válido, manter seus dados corretos e sua senha segura.
                Cada sessão possui um <strong>token da instância</strong> que dá acesso total ao número conectado.
                O usuário é o único responsável por guardar esse token e por qualquer uso feito com ele, inclusive
                por terceiros ou integrações a quem o tenha fornecido.
              </p>
              <p className="leading-relaxed">
                O número conectado deve pertencer ao usuário ou ele deve ter autorização expressa do titular para utilizá-lo.
              </p>
            </Section>

            <Section n={5} title="TESTE GRÁTIS">
              <List items={[
                "Novas contas podem ativar um teste grátis de uma sessão, sem cartão de crédito;",
                "O teste termina ao completar 3 dias ou ao atingir 200 mensagens enviadas, o que ocorrer primeiro;",
                "Ao término, a sessão é bloqueada até que a assinatura seja ativada;",
                "É proibido criar contas adicionais para obter novos períodos de teste.",
              ]} />
            </Section>

            <Section n={6} title="PLANOS, COBRANÇA, CANCELAMENTO E REEMBOLSO">
              <List items={[
                "A cobrança é recorrente, mensal ou anual, por sessão (cada número conectado é uma assinatura independente). A partir do segundo número pago da conta, aplica-se o valor de número adicional;",
                "O valor vigente é exibido no checkout antes da contratação e pode variar conforme a região;",
                "Os pagamentos são processados pela Stripe; o Hook7 não armazena dados de cartão;",
                "Os planos pagos incluem envio de mensagens sem limite de quantidade definido pelo Hook7, sujeito às regras de uso destes Termos e aos limites impostos pelo próprio WhatsApp;",
                "O cancelamento pode ser feito a qualquer momento pelo painel, sem multa. A sessão continua ativa até o fim do período já pago e depois é desconectada;",
                "Não há reembolso proporcional de períodos já iniciados, ressalvados os direitos previstos no Código de Defesa do Consumidor, quando aplicáveis;",
                "Em caso de falha no pagamento, a sessão pode ser bloqueada até a regularização;",
                "Até 5 sessões por conta; acima disso é necessária aprovação prévia;",
                "As cobranças podem aparecer na fatura como S7.",
              ]} />
            </Section>

            <Section n={7} title="REGRAS DE USO">
              <p className="leading-relaxed">O usuário concorda em:</p>
              <List items={[
                "Cumprir a legislação brasileira, a LGPD e os Termos de Serviço e Políticas do WhatsApp;",
                "Enviar mensagens apenas a contatos que autorizaram recebê-las (opt-in) e oferecer uma forma de descadastro;",
                "Não usar a plataforma para SPAM, disparos em massa para listas compradas ou desconhecidas, golpes, phishing, fraudes, conteúdo ilegal, ofensivo ou que viole direitos de terceiros;",
                "Não tentar burlar limites, acessar sessões de outros usuários ou sobrecarregar a infraestrutura do Hook7.",
              ]} />
              <p className="leading-relaxed">
                Envios em alto volume, para números que não têm o seu contato salvo ou com intervalos muito curtos
                aumentam significativamente o risco de banimento do número pelo WhatsApp. Esse risco é do usuário.
              </p>
            </Section>

            <Section n={8} title="WEBHOOKS E INTEGRAÇÕES EXTERNAS">
              <p className="leading-relaxed">
                O usuário pode integrar o Hook7 com sistemas próprios ou de terceiros, como n8n, Make, Zapier,
                Bubble e TypeBot. Os eventos são recebidos pelos servidores do Hook7 e encaminhados à URL HTTPS
                cadastrada no painel, com tempo limite de 10 segundos e sem novas tentativas em caso de falha.
              </p>
              <p className="leading-relaxed">
                O Hook7 não é responsável por falhas, indisponibilidade ou uso indevido de dados em sistemas de
                terceiros. Alterar diretamente a configuração de webhook da instância pela API, fora do painel,
                pode interromper o monitoramento e a contagem de mensagens da sessão.
              </p>
            </Section>

            <Section n={9} title="DISPONIBILIDADE E LIMITAÇÃO DE RESPONSABILIDADE">
              <p className="leading-relaxed">
                O Hook7 se esforça para manter o serviço disponível, mas não oferece garantia de disponibilidade (SLA).
                Podem ocorrer interrupções por manutenção, falhas de infraestrutura ou mudanças feitas pelo WhatsApp.
                A sessão também pode desconectar quando o aparelho fica muito tempo sem internet ou quando o
                dispositivo conectado é removido no aplicativo.
              </p>
              <p className="leading-relaxed">
                O Hook7 não se responsabiliza por banimentos, perda de mensagens, lucros cessantes ou prejuízos
                decorrentes do uso da API. Quando houver responsabilidade, ela fica limitada ao valor pago pela
                sessão afetada nos últimos 30 dias.
              </p>
            </Section>

            <Section n={10} title="DADOS E PRIVACIDADE">
              <List items={[
                <>Dados da conta: nome, e-mail, organização e, se informado, telefone para notificações;</>,
                <>Registros de uso: para contagem de mensagens, limites e monitoramento, o Hook7 registra o número do contato, tipo, direção (enviada/recebida) e horário de cada mensagem;</>,
                <>O conteúdo das mensagens trafega pelos servidores do Hook7 para ser entregue ao WhatsApp e ao seu webhook. As cópias dos eventos encaminhados por webhook — que podem conter o conteúdo da mensagem — ficam registradas por tempo limitado para diagnóstico de entregas;</>,
                <>Em relação aos dados dos contatos com quem o usuário conversa, o usuário é o controlador e o Hook7 atua como operador, tratando-os apenas para prestar o serviço;</>,
                <>O site utiliza cookies essenciais de autenticação e ferramentas de análise de navegação (Google Tag Manager).</>,
              ]} />
              <p className="leading-relaxed">
                Os detalhes estão na <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
              </p>
            </Section>

            <Section n={11} title="SUSPENSÃO OU ENCERRAMENTO DE CONTA">
              <p className="leading-relaxed">
                O Hook7 pode suspender sessões ou encerrar contas, sem reembolso, em caso de:
              </p>
              <List items={[
                "Uso ilegal ou conteúdo proibido;",
                "Golpes, fraudes, phishing ou ações maliciosas contra a plataforma ou terceiros;",
                "Denúncias recorrentes de SPAM;",
                "Criação de contas para abusar do teste grátis;",
                "Falta de pagamento.",
              ]} />
            </Section>

            <Section n={12} title="ALTERAÇÕES NOS TERMOS">
              <p className="leading-relaxed">
                O Hook7 pode alterar estes Termos a qualquer momento, publicando a nova versão nesta página com a
                data de atualização. O uso contínuo após a publicação implica aceitação das alterações.
              </p>
            </Section>

            <Section n={13} title="LEGISLAÇÃO APLICÁVEL">
              <p className="leading-relaxed">
                Estes Termos são regidos pelas leis brasileiras, incluindo a LGPD (Lei nº 13.709/2018).
              </p>
              <p className="leading-relaxed">
                Foro: comarca do responsável legal (Mario R Schiavon).
              </p>
            </Section>

            <Section n={14} title="CONTATO">
              <p className="leading-relaxed">
                E-mail: <a href="mailto:contato@hook7.com.br" className="text-primary hover:underline">contato@hook7.com.br</a>
              </p>
              <p className="leading-relaxed">
                Responsável: Mario R Schiavon
              </p>
              <p className="leading-relaxed">
                Holding: S7
              </p>
            </Section>
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
