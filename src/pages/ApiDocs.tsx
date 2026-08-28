import { motion } from "framer-motion";
import { BookOpen, Shield, Code2, Zap, AlertCircle, ArrowLeft, Vote, MapPin, MessageSquare, Plug } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EndpointCard } from "@/components/api-docs/EndpointCard";
import { CodeBlock } from "@/components/api-docs/CodeBlock";
import { SEO } from "@/components/SEO";
import { Hook7Logo } from "@/components/Hook7Logo";
import { Helmet } from "react-helmet-async";

const ApiDocs = () => {
  const commonErrors = [
    { code: "401", message: "Unauthorized", solution: "Verifique se o token da instância está correto no header apikey" },
    { code: "404", message: "Instance not found", solution: "O nome da instância na URL está errado ou a instância foi deletada" },
    { code: "400", message: "Invalid input data", solution: "Confira o corpo da requisição (número com DDI, campos obrigatórios)" },
    { code: "403", message: "Forbidden", solution: "O token não tem permissão para essa operação" },
    { code: "500", message: "Internal Server Error", solution: "Erro inesperado no servidor, tente novamente em instantes" },
  ];

  const webhookEvents = [
    { id: "MESSAGES_UPSERT", desc: "Mensagem recebida" },
    { id: "SEND_MESSAGE", desc: "Mensagem enviada pela sua instância" },
    { id: "MESSAGES_UPDATE", desc: "Status de entrega/leitura da mensagem" },
    { id: "CONNECTION_UPDATE", desc: "Mudança no estado da conexão (open, connecting, close)" },
    { id: "QRCODE_UPDATED", desc: "Novo QR Code gerado" },
    { id: "GROUPS_UPSERT", desc: "Grupo criado" },
    { id: "GROUP_PARTICIPANTS_UPDATE", desc: "Entrada/saída de participantes em grupo" },
  ];

  return (
    <>
      <SEO
        title="Documentação da API WhatsApp | Hook7"
        description="Documentação completa da API WhatsApp Hook7, baseada no Evolution API. Envie textos, mídias, enquetes e listas, configure webhooks e integre com Make, Zapier, n8n e TypeBot. Exemplos em JavaScript, Python e PHP."
        canonical="https://app.hook7.com.br/api-docs"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Documentação da API WhatsApp Hook7",
            "description": "Documentação técnica completa para integrar a API WhatsApp Hook7 (Evolution API) em suas aplicações. Inclui autenticação, endpoints de envio de mensagens e mídias, gestão de instância, webhooks e exemplos de código em JavaScript, Python e PHP.",
            "author": { "@type": "Organization", "name": "Hook7" },
            "publisher": { "@type": "Organization", "name": "Hook7", "url": "https://app.hook7.com.br" },
            "mainEntityOfPage": "https://app.hook7.com.br/api-docs",
            "datePublished": "2024-01-01",
            "dateModified": "2026-08-28",
            "inLanguage": "pt-BR",
            "keywords": ["API WhatsApp", "Evolution API", "documentação API", "enviar mensagens WhatsApp", "integração WhatsApp", "Make", "Zapier", "n8n", "TypeBot"],
            "about": { "@type": "SoftwareApplication", "name": "Hook7 API", "applicationCategory": "BusinessApplication" },
          })}
        </script>
      </Helmet>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-foreground/5 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse-glow" />
              <Hook7Logo
                size={40}
                className="h-10 w-10 relative drop-shadow-lg"
              />
            </div>
            <span className="text-xl font-bold hook7-gradient-text">Hook7</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Page Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Documentação da API WhatsApp Hook7</h1>
              <p className="text-sm text-foreground/75 mt-0.5">Integre o WhatsApp nas suas aplicações com nossa API REST</p>
            </div>
            <Badge variant="outline" className="ml-auto border-foreground/15 text-foreground/80 text-xs">v4.0</Badge>
          </div>

          {/* Intro card */}
          <Card className="glass-card border-foreground/5">
            <CardContent className="pt-5 pb-5 space-y-4">
              <h2 className="text-base font-semibold text-foreground">O que é a API WhatsApp Hook7?</h2>
              <p className="text-sm text-foreground/75 leading-relaxed">
                A Hook7 é uma API WhatsApp brasileira que permite enviar mensagens de texto, imagens, áudio e documentos via WhatsApp por R$ 69,90/mês com mensagens ilimitadas. A API é RESTful, roda sobre o <strong className="text-foreground">Evolution API</strong> e pode ser integrada com qualquer linguagem de programação (JavaScript, Python, PHP) ou plataforma de automação (Make, Zapier, n8n, TypeBot).
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Requisitos</h3>
                  <ul className="text-xs text-foreground/75 space-y-1">
                    <li>• Conta ativa na Hook7</li>
                    <li>• Sessão WhatsApp configurada</li>
                    <li>• Nome da instância (o nome da sua sessão)</li>
                    <li>• Token da instância (obtido nos Detalhes da Sessão)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Casos de uso</h3>
                  <ul className="text-xs text-foreground/75 space-y-1">
                    <li>• Notificações de pedidos e entregas</li>
                    <li>• Confirmação de agendamentos</li>
                    <li>• Campanhas de marketing</li>
                    <li>• Atendimento automatizado</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auth banner */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3.5 text-sm text-foreground">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-semibold">Autenticação e URL base</p>
              <p className="text-xs text-foreground/75">
                Todas as requisições requerem autenticação via <strong>apikey</strong> no header usando o <strong>token da instância</strong>, e o <strong>nome da instância vai na URL</strong>. Obtenha os dois em Sessões → Ver Detalhes da sessão.
              </p>
              <code className="block rounded bg-black/50 px-3 py-1.5 text-xs text-foreground font-mono mt-1 whitespace-pre-wrap">
{`URL base: https://api.hook7.com.br
Header:   apikey: TOKEN_DA_INSTANCIA
Rota:     /message/sendText/NOME_DA_INSTANCIA`}
              </code>
              <p className="text-[11px] text-foreground/75">
                ⚠️ <strong>IMPORTANTE:</strong> Nunca compartilhe seu token publicamente! Ele dá acesso total à sua instância WhatsApp.
              </p>
            </div>
          </div>

        </motion.header>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5 bg-muted/30 border border-foreground/5">
            <TabsTrigger value="basic" className="flex items-center justify-center gap-1.5 py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Texto e Mídia</span>
              <span className="sm:hidden">Básico</span>
            </TabsTrigger>
            <TabsTrigger value="interactive" className="flex items-center justify-center gap-1.5 py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Interativos</span>
              <span className="sm:hidden">Interativo</span>
            </TabsTrigger>
            <TabsTrigger value="utility" className="flex items-center justify-center gap-1.5 py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Local e Contato</span>
              <span className="sm:hidden">Utilidade</span>
            </TabsTrigger>
            <TabsTrigger value="instance" className="flex items-center justify-center gap-1.5 py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Instância</span>
              <span className="sm:hidden">Conexão</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center justify-center gap-1.5 py-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Exemplos</span>
              <span className="sm:hidden">Código</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Text & Media */}
          <TabsContent value="basic" className="space-y-6">
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              aria-labelledby="basic-messages-heading"
            >
              <div className="flex items-center gap-2 pt-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 id="basic-messages-heading" className="text-base font-semibold text-foreground">Mensagens de Texto e Mídia</h2>
              </div>
              <p className="text-xs text-foreground/75">
                Endpoints para enviar mensagens de texto simples, imagens, vídeos, documentos e áudios via WhatsApp.
              </p>

              <EndpointCard
                method="POST"
                endpoint="/message/sendText/{instancia}"
                description="Enviar Mensagem de Texto via API WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "text", type: "string", required: true, description: "Texto da mensagem", example: "Olá, tudo bem?" },
                  { name: "delay", type: "number", required: false, description: "Atraso em milissegundos antes do envio", example: "1200" },
                  { name: "linkPreview", type: "boolean", required: false, description: "Gerar preview de links no texto" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendText/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste."
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567890"
  },
  "message": {
    "extendedTextMessage": {
      "text": "Olá! Esta é uma mensagem de teste."
    }
  },
  "messageTimestamp": "1756400000",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/message/sendMedia/{instancia}"
                description="Enviar Mídia (Imagem/Vídeo/Documento) via API WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "mediatype", type: "string", required: true, description: "Tipo: image, video ou document", example: "image" },
                  { name: "media", type: "string", required: true, description: "URL pública da mídia ou conteúdo em base64", example: "https://exemplo.com/imagem.jpg" },
                  { name: "mimetype", type: "string", required: false, description: "MIME type do arquivo", example: "image/jpeg" },
                  { name: "caption", type: "string", required: false, description: "Legenda (para imagem/vídeo)" },
                  { name: "fileName", type: "string", required: false, description: "Nome do arquivo (para documento)" },
                ]}
                requestExample={`# Exemplo 1: Enviar IMAGEM
curl -X POST "https://api.hook7.com.br/message/sendMedia/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "mediatype": "image",
    "media": "https://exemplo.com/foto.jpg",
    "caption": "Confira esta imagem!"
  }'

# Exemplo 2: Enviar DOCUMENTO/ARQUIVO
curl -X POST "https://api.hook7.com.br/message/sendMedia/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "mediatype": "document",
    "media": "https://exemplo.com/relatorio.pdf",
    "mimetype": "application/pdf",
    "fileName": "relatorio.pdf"
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567891"
  },
  "message": {
    "imageMessage": {
      "caption": "Confira esta imagem!",
      "mimetype": "image/jpeg"
    }
  },
  "messageTimestamp": "1756400001",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/message/sendWhatsAppAudio/{instancia}"
                description="Enviar Áudio (mensagem de voz) via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "audio", type: "string", required: true, description: "URL pública do áudio ou conteúdo em base64", example: "https://exemplo.com/audio.mp3" },
                  { name: "delay", type: "number", required: false, description: "Atraso em milissegundos antes do envio" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendWhatsAppAudio/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "audio": "https://exemplo.com/audio.mp3"
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567892"
  },
  "message": {
    "audioMessage": {
      "mimetype": "audio/ogg; codecs=opus",
      "ptt": true
    }
  },
  "messageTimestamp": "1756400002",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />
            </motion.section>
          </TabsContent>

          {/* Tab: Interactive */}
          <TabsContent value="interactive" className="space-y-6">
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              aria-labelledby="interactive-messages-heading"
            >
              <div className="flex items-center gap-2 pt-4">
                <Vote className="h-5 w-5 text-primary" />
                <h2 id="interactive-messages-heading" className="text-base font-semibold text-foreground">Mensagens Interativas</h2>
              </div>
              <p className="text-xs text-foreground/75">
                Endpoints para enviar enquetes, listas interativas e menus de opções. Ideais para pesquisas NPS, cardápios e catálogos de produtos.
              </p>

              <EndpointCard
                method="POST"
                endpoint="/message/sendPoll/{instancia}"
                description="Enviar Enquete/Pesquisa NPS via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "name", type: "string", required: true, description: "Pergunta da enquete", example: "Como você avalia nosso atendimento?" },
                  { name: "values", type: "array", required: true, description: "Opções de resposta (array de strings)", example: '["Ótimo", "Bom", "Regular", "Ruim"]' },
                  { name: "selectableCount", type: "number", required: true, description: "Quantidade de opções selecionáveis", example: "1" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendPoll/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "name": "Como você avalia nosso atendimento?",
    "selectableCount": 1,
    "values": ["⭐ Ótimo", "👍 Bom", "😐 Regular", "👎 Ruim"]
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567893"
  },
  "message": {
    "pollCreationMessage": {
      "name": "Como você avalia nosso atendimento?",
      "selectableOptionsCount": 1
    }
  },
  "messageTimestamp": "1756400003",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/message/sendList/{instancia}"
                description="Enviar Lista/Menu Interativo (Catálogo de Produtos)"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "title", type: "string", required: true, description: "Título da lista", example: "Nosso Cardápio" },
                  { name: "description", type: "string", required: true, description: "Descrição/texto principal", example: "Escolha uma categoria para ver os produtos" },
                  { name: "buttonText", type: "string", required: true, description: "Texto do botão", example: "Ver Opções" },
                  { name: "footerText", type: "string", required: false, description: "Texto do rodapé" },
                  { name: "sections", type: "array", required: true, description: "Seções com itens (ver exemplo)" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendList/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "title": "🍕 Nosso Cardápio",
    "description": "Escolha uma categoria para ver os produtos disponíveis",
    "buttonText": "Ver Cardápio",
    "footerText": "Delivery em até 40 minutos",
    "sections": [
      {
        "title": "🍕 Pizzas",
        "rows": [
          { "title": "Margherita", "description": "Molho, muçarela e manjericão - R$ 45", "rowId": "pizza_margherita" },
          { "title": "Calabresa", "description": "Calabresa, cebola e azeitona - R$ 42", "rowId": "pizza_calabresa" }
        ]
      },
      {
        "title": "🍔 Hambúrgueres",
        "rows": [
          { "title": "Clássico", "description": "Blend 180g, queijo, salada - R$ 32", "rowId": "burger_classico" },
          { "title": "Bacon", "description": "Blend 180g, bacon, cheddar - R$ 38", "rowId": "burger_bacon" }
        ]
      }
    ]
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567894"
  },
  "message": {
    "listMessage": {
      "title": "🍕 Nosso Cardápio",
      "buttonText": "Ver Cardápio"
    }
  },
  "messageTimestamp": "1756400004",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                <Vote className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Dica: Use Listas como Catálogo de Produtos</p>
                  <p className="text-xs text-foreground/75">
                    O endpoint <code className="bg-black/50 px-1 rounded font-mono text-foreground">/message/sendList/{"{instancia}"}</code> é ideal para criar cardápios, catálogos e menus de atendimento interativos no WhatsApp Business, sem necessidade de Commerce Manager.
                  </p>
                </div>
              </div>
            </motion.section>
          </TabsContent>

          {/* Tab: Location & Contacts */}
          <TabsContent value="utility" className="space-y-6">
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              aria-labelledby="utility-messages-heading"
            >
              <div className="flex items-center gap-2 pt-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 id="utility-messages-heading" className="text-base font-semibold text-foreground">Localização e Contatos</h2>
              </div>
              <p className="text-xs text-foreground/75">
                Endpoints para enviar localização com mapa e compartilhar contatos (vCard). Perfeito para entregas, endereços de lojas e contatos de suporte.
              </p>

              <EndpointCard
                method="POST"
                endpoint="/message/sendLocation/{instancia}"
                description="Enviar Localização com Mapa via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "latitude", type: "number", required: true, description: "Latitude", example: "-23.5629" },
                  { name: "longitude", type: "number", required: true, description: "Longitude", example: "-46.6544" },
                  { name: "name", type: "string", required: false, description: "Nome do local", example: "Loja Hook7" },
                  { name: "address", type: "string", required: false, description: "Endereço completo", example: "Av. Paulista, 1000 - São Paulo, SP" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendLocation/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "latitude": -23.5629,
    "longitude": -46.6544,
    "name": "Loja Hook7",
    "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567895"
  },
  "message": {
    "locationMessage": {
      "degreesLatitude": -23.5629,
      "degreesLongitude": -46.6544,
      "name": "Loja Hook7"
    }
  },
  "messageTimestamp": "1756400005",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/message/sendContact/{instancia}"
                description="Enviar Contato/vCard via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "contact", type: "array", required: true, description: "Lista de contatos a compartilhar" },
                  { name: "contact[].fullName", type: "string", required: true, description: "Nome completo do contato", example: "Suporte Hook7" },
                  { name: "contact[].wuid", type: "string", required: true, description: "Número do contato no WhatsApp (com DDI)", example: "5511999990000" },
                  { name: "contact[].phoneNumber", type: "string", required: true, description: "Telefone formatado exibido no cartão", example: "+55 11 99999-0000" },
                  { name: "contact[].organization", type: "string", required: false, description: "Empresa/Organização", example: "Hook7" },
                  { name: "contact[].email", type: "string", required: false, description: "E-mail do contato" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendContact/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "contact": [
      {
        "fullName": "Suporte Hook7",
        "wuid": "5511999990000",
        "phoneNumber": "+55 11 99999-0000",
        "organization": "Hook7",
        "email": "contato@hook7.com.br"
      }
    ]
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567896"
  },
  "message": {
    "contactMessage": {
      "displayName": "Suporte Hook7"
    }
  },
  "messageTimestamp": "1756400006",
  "status": "PENDING"
}`}
                errorCodes={commonErrors}
              />

              <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Casos de uso comuns</p>
                  <p className="text-xs text-foreground/75">
                    <strong>Localização:</strong> Endereço de entrega, localização da loja, ponto de encontro para serviços.<br />
                    <strong>Contato:</strong> Compartilhar suporte técnico, transferir leads entre vendedores, enviar contato comercial.
                  </p>
                </div>
              </div>
            </motion.section>
          </TabsContent>

          {/* Tab: Instance & Webhooks */}
          <TabsContent value="instance" className="space-y-6">
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              aria-labelledby="instance-heading"
            >
              <div className="flex items-center gap-2 pt-4">
                <Plug className="h-5 w-5 text-primary" />
                <h2 id="instance-heading" className="text-base font-semibold text-foreground">Instância, Conexão e Webhooks</h2>
              </div>
              <p className="text-xs text-foreground/75">
                Endpoints para consultar o estado da conexão, gerar QR Code, desconectar o WhatsApp e configurar o recebimento de eventos.
              </p>

              <EndpointCard
                method="GET"
                endpoint="/instance/connectionState/{instancia}"
                description="Consultar o Estado da Conexão"
                requestExample={`curl "https://api.hook7.com.br/instance/connectionState/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA"`}
                responseExample={`{
  "instance": {
    "instanceName": "NOME_DA_INSTANCIA",
    "state": "open"
  }
}

// state: "open" = conectado | "connecting" = aguardando QR Code | "close" = desconectado`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="GET"
                endpoint="/instance/connect/{instancia}"
                description="Conectar a Instância e Obter o QR Code"
                requestExample={`curl "https://api.hook7.com.br/instance/connect/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA"`}
                responseExample={`{
  "pairingCode": null,
  "code": "2@exemplo...",
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "count": 1
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="DELETE"
                endpoint="/instance/logout/{instancia}"
                description="Desconectar o WhatsApp da Instância"
                requestExample={`curl -X DELETE "https://api.hook7.com.br/instance/logout/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA"`}
                responseExample={`{
  "success": true,
  "message": "Instance logged out successfully"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="GET"
                endpoint="/group/fetchAllGroups/{instancia}"
                description="Listar os Grupos da Instância"
                parameters={[
                  { name: "getParticipants", type: "boolean", required: false, description: "Incluir a lista de participantes de cada grupo (query string)", example: "false" },
                ]}
                requestExample={`curl "https://api.hook7.com.br/group/fetchAllGroups/NOME_DA_INSTANCIA?getParticipants=false" \\
  -H "apikey: TOKEN_DA_INSTANCIA"`}
                responseExample={`[
  {
    "id": "120363123456789012@g.us",
    "subject": "Equipe Comercial",
    "size": 24,
    "creation": 1717171717,
    "owner": "5511999990000@s.whatsapp.net"
  }
]`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/webhook/set/{instancia}"
                description="Configurar o Webhook de Eventos"
                parameters={[
                  { name: "enabled", type: "boolean", required: true, description: "Ativa ou desativa o envio de eventos", example: "true" },
                  { name: "url", type: "string", required: true, description: "URL HTTPS que receberá os eventos", example: "https://seu-servidor.com/webhook" },
                  { name: "events", type: "array", required: true, description: "Eventos assinados (ver tabela abaixo)" },
                  { name: "headers", type: "object", required: false, description: "Headers extras enviados junto de cada evento" },
                  { name: "base64", type: "boolean", required: false, description: "Enviar mídias recebidas em base64" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/webhook/set/NOME_DA_INSTANCIA" \\
  -H "apikey: TOKEN_DA_INSTANCIA" \\
  -H "Content-Type: application/json" \\
  -d '{
    "enabled": true,
    "url": "https://seu-servidor.com/webhook",
    "base64": true,
    "headers": { "apikey": "SEU_TOKEN_DE_VALIDACAO" },
    "events": ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
  }'`}
                responseExample={`{
  "success": true,
  "message": "Webhook configured successfully"
}`}
                errorCodes={commonErrors}
              />

              <Card className="glass-card border-foreground/5">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                    <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
                    Eventos disponíveis no Webhook
                  </CardTitle>
                  <CardDescription className="text-xs text-foreground/75">
                    Cada evento chega como <code className="font-mono">{"{ event, instance, data }"}</code> no corpo da requisição.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-foreground/75">
                          <th className="pb-2 pr-4 font-medium">Evento</th>
                          <th className="pb-2 font-medium">Quando dispara</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhookEvents.map((event) => (
                          <tr key={event.id} className="border-t border-foreground/5">
                            <td className="py-1.5 pr-4 font-mono text-[11px] text-foreground whitespace-nowrap">{event.id}</td>
                            <td className="py-1.5 text-foreground/75">{event.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>

          {/* Tab: Examples */}
          <TabsContent value="examples" className="space-y-6">
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
              aria-labelledby="code-examples-heading"
            >
              <div className="flex items-center gap-2 pt-4">
                <Code2 className="h-5 w-5 text-primary" />
                <h2 id="code-examples-heading" className="text-base font-semibold text-foreground">Exemplos de Código</h2>
              </div>
              <p className="text-xs text-foreground/75">
                Exemplos práticos de integração em JavaScript, Python e PHP para enviar mensagens, enquetes e mais.
              </p>

              {[
                {
                  icon: Code2,
                  title: "JavaScript / Node.js — Enviar mensagem de texto",
                  desc: "Exemplo usando fetch para enviar mensagens WhatsApp",
                  lang: "javascript",
                  code: `const API_URL = 'https://api.hook7.com.br';
const INSTANCIA = 'NOME_DA_INSTANCIA';
const TOKEN = 'TOKEN_DA_INSTANCIA';

const sendMessage = async () => {
  try {
    const response = await fetch(\`\${API_URL}/message/sendText/\${INSTANCIA}\`, {
      method: 'POST',
      headers: {
        'apikey': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: '5511999999999',
        text: 'Olá! Esta é uma mensagem de teste.'
      })
    });
    const data = await response.json();
    console.log('✅ Mensagem enviada:', data);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

sendMessage();`,
                },
                {
                  icon: Vote,
                  title: "JavaScript — Enviar pesquisa NPS",
                  desc: "Exemplo de enquete para medir satisfação do cliente",
                  lang: "javascript",
                  code: `const API_URL = 'https://api.hook7.com.br';
const INSTANCIA = 'NOME_DA_INSTANCIA';
const TOKEN = 'TOKEN_DA_INSTANCIA';

const sendNpsSurvey = async (customerPhone) => {
  try {
    const response = await fetch(\`\${API_URL}/message/sendPoll/\${INSTANCIA}\`, {
      method: 'POST',
      headers: {
        'apikey': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: customerPhone,
        name: 'De 0 a 10, qual a chance de recomendar nosso serviço?',
        selectableCount: 1,
        values: ['😍 9-10 (Promotor)', '😊 7-8 (Neutro)', '😔 0-6 (Detrator)']
      })
    });
    const data = await response.json();
    console.log('✅ Pesquisa NPS enviada:', data);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

sendNpsSurvey('5511999999999');`,
                },
                {
                  icon: Zap,
                  title: "Python — Enviar menu de produtos",
                  desc: "Exemplo de lista interativa como catálogo de produtos",
                  lang: "python",
                  code: `import requests

API_URL = 'https://api.hook7.com.br'
INSTANCIA = 'NOME_DA_INSTANCIA'
TOKEN = 'TOKEN_DA_INSTANCIA'

def send_product_menu(phone):
    url = f'{API_URL}/message/sendList/{INSTANCIA}'
    headers = {
        'apikey': TOKEN,
        'Content-Type': 'application/json'
    }
    data = {
        'number': phone,
        'title': '🛍️ Nossos Produtos',
        'description': 'Confira nosso catálogo e escolha o que deseja!',
        'buttonText': 'Ver Produtos',
        'footerText': 'Frete grátis acima de R$ 100',
        'sections': [
            {
                'title': '📱 Eletrônicos',
                'rows': [
                    {'title': 'Fone Bluetooth', 'description': 'R$ 89,90', 'rowId': 'fone_bt'},
                    {'title': 'Carregador Rápido', 'description': 'R$ 49,90', 'rowId': 'carregador'}
                ]
            },
            {
                'title': '👕 Vestuário',
                'rows': [
                    {'title': 'Camiseta Premium', 'description': 'R$ 79,90', 'rowId': 'camiseta'},
                    {'title': 'Boné Ajustável', 'description': 'R$ 39,90', 'rowId': 'bone'}
                ]
            }
        ]
    }

    response = requests.post(url, json=data, headers=headers)
    if response.status_code in (200, 201):
        print('✅ Menu enviado:', response.json())
    else:
        print('❌ Erro:', response.text)

send_product_menu('5511999999999')`,
                },
                {
                  icon: MapPin,
                  title: "Python — Enviar localização de entrega",
                  desc: "Exemplo para enviar local de entrega ao cliente",
                  lang: "python",
                  code: `import requests

API_URL = 'https://api.hook7.com.br'
INSTANCIA = 'NOME_DA_INSTANCIA'
TOKEN = 'TOKEN_DA_INSTANCIA'

def send_delivery_location(phone, order_id):
    url = f'{API_URL}/message/sendLocation/{INSTANCIA}'
    headers = {
        'apikey': TOKEN,
        'Content-Type': 'application/json'
    }
    data = {
        'number': phone,
        'latitude': -23.5505,
        'longitude': -46.6333,
        'name': f'Entrega Pedido #{order_id}',
        'address': 'Rua das Flores, 123 - Centro, São Paulo - SP'
    }

    response = requests.post(url, json=data, headers=headers)
    if response.status_code in (200, 201):
        print('✅ Localização enviada!')
    else:
        print('❌ Erro:', response.text)

send_delivery_location('5511999999999', '12345')`,
                },
                {
                  icon: Code2,
                  title: "PHP — Integração básica",
                  desc: "Exemplo usando cURL para enviar mensagens WhatsApp",
                  lang: "php",
                  code: `<?php
$apiUrl = 'https://api.hook7.com.br';
$instancia = 'NOME_DA_INSTANCIA';
$token = 'TOKEN_DA_INSTANCIA';

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "$apiUrl/message/sendText/$instancia",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => array(
    "apikey: $token",
    'Content-Type: application/json'
  ),
  CURLOPT_POSTFIELDS => json_encode(array(
    'number' => '5511999999999',
    'text' => 'Olá! Esta é uma mensagem de teste.'
  ))
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($httpCode == 200 || $httpCode == 201) {
    echo "✅ Resposta: " . $response;
} else {
    echo "❌ Erro: " . $response;
}
?>`,
                },
              ].map(({ icon: Icon, title, desc, lang, code }) => (
                <Card key={title} className="glass-card border-foreground/5">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {title}
                    </CardTitle>
                    <CardDescription className="text-xs text-foreground/75">{desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <CodeBlock language={lang} code={code} />
                  </CardContent>
                </Card>
              ))}
            </motion.section>
          </TabsContent>
        </Tabs>

        {/* How to get token */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-labelledby="get-token-heading"
        >
          <Card className="glass-card border-foreground/5">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle id="get-token-heading" className="flex items-center gap-2 text-sm text-foreground">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                Como obter o Nome e o Token da Instância
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Opção 1 — Via Detalhes da Sessão (recomendado)</p>
                <ol className="space-y-1.5 list-decimal list-inside text-xs text-foreground/75 ml-1">
                  <li>Vá para <strong className="text-foreground">Sessões → Minhas Sessões</strong></li>
                  <li>Selecione a instância desejada — o <strong className="text-foreground">nome da sessão</strong> é o nome da instância usado na URL</li>
                  <li>Clique em <strong className="text-foreground">"Ver Detalhes"</strong></li>
                  <li>Na seção <strong className="text-foreground">"Credenciais da API"</strong>, copie o <strong className="text-foreground">Token da Instância</strong></li>
                </ol>
              </div>

              <Separator className="border-foreground/5" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Opção 2 — Via Dashboard (Ferramentas)</p>
                <ol className="space-y-1.5 list-decimal list-inside text-xs text-foreground/75 ml-1">
                  <li>Acesse o <strong className="text-foreground">Dashboard</strong></li>
                  <li>Clique em <strong className="text-foreground">"Ferramentas"</strong></li>
                  <li>Clique em <strong className="text-foreground">"Ver Token da API"</strong></li>
                  <li>Selecione a instância desejada no dropdown</li>
                  <li>Copie o token</li>
                </ol>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold mb-0.5">Segurança</p>
                  <p className="text-xs text-red-200">Nunca compartilhe seu token publicamente! Ele dá acesso total à sua instância WhatsApp.</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 border border-foreground/5 px-4 py-3">
                <p className="text-[11px] text-foreground/75 mb-1.5">
                  Use o token no header e o nome da instância na URL de todas as requisições:
                </p>
                <code className="block rounded bg-black/50 px-3 py-1.5 text-xs text-foreground font-mono whitespace-pre-wrap">
{`apikey: TOKEN_DA_INSTANCIA
https://api.hook7.com.br/message/sendText/NOME_DA_INSTANCIA`}
                </code>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </>
  );
};

export default ApiDocs;
