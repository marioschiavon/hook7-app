import { motion } from "framer-motion";
import { BookOpen, Shield, Code2, Zap, AlertCircle, ArrowLeft, Vote, ListOrdered, MapPin, Contact2, MessageSquare, Image } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EndpointCard } from "@/components/api-docs/EndpointCard";
import { CodeBlock } from "@/components/api-docs/CodeBlock";
import { SEO } from "@/components/SEO";
import { Helmet } from "react-helmet-async";

const ApiDocs = () => {
  const commonErrors = [
    { code: "401", message: "Unauthorized", solution: "Verifique se o apikey está correto no header" },
    { code: "404", message: "Instance not found", solution: "Instância não existe ou foi deletada" },
    { code: "400", message: "Invalid phone number", solution: "Formato do número está incorreto (use DDI)" },
    { code: "503", message: "Instance not connected", solution: "Instância está offline, conecte novamente" },
  ];

  return (
    <>
      <SEO 
        title="Documentação da API WhatsApp | Hook7"
        description="Documentação completa da API WhatsApp Hook7. Aprenda a enviar mensagens, mídias e integrar com Make, Zapier, n8n e TypeBot. Exemplos em JavaScript, Python e PHP."
        canonical="https://app.hook7.com.br/api-docs"
      />
      <Helmet>
        {/* Schema.org TechArticle */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Documentação da API WhatsApp Hook7",
            "description": "Documentação técnica completa para integrar a API WhatsApp Hook7 em suas aplicações. Inclui autenticação, endpoints para envio de mensagens e mídias, exemplos de código em JavaScript, Python e PHP.",
            "author": {
              "@type": "Organization",
              "name": "Hook7"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Hook7",
              "url": "https://app.hook7.com.br"
            },
            "mainEntityOfPage": "https://app.hook7.com.br/api-docs",
            "datePublished": "2024-01-01",
            "dateModified": "2026-01-23",
            "inLanguage": "pt-BR",
            "keywords": ["API WhatsApp", "documentação API", "enviar mensagens WhatsApp", "integração WhatsApp", "enviar enquete WhatsApp", "pesquisa NPS WhatsApp API", "enviar localização WhatsApp", "lista interativa WhatsApp", "menu WhatsApp API", "enviar contato WhatsApp", "Make", "Zapier", "n8n", "TypeBot"],
            "about": {
              "@type": "SoftwareApplication",
              "name": "Hook7 API",
              "applicationCategory": "BusinessApplication"
            }
          })}
        </script>
      </Helmet>
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse-glow" />
              <img 
                src="/hook7-logo.svg" 
                alt="Hook7 - API WhatsApp" 
                width="40"
                height="40"
                className="h-10 w-10 relative drop-shadow-lg rounded-full"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Hook7
            </span>

          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a página inicial
          </Link>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <h1 className="text-3xl font-bold">Documentação da API WhatsApp Hook7</h1>
              <p className="text-muted-foreground">
                Integre o WhatsApp nas suas aplicações com nossa API REST
              </p>
            </div>
            <Badge variant="outline" className="ml-auto">
              v2.0
            </Badge>
          </div>

          {/* Introduction Section - GEO Optimized */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-xl font-semibold">O que é a API WhatsApp Hook7?</h2>
              <p className="text-muted-foreground leading-relaxed">
                A Hook7 é uma API WhatsApp brasileira que permite enviar mensagens de texto, imagens, áudio e documentos via WhatsApp por R$ 69,90/mês com mensagens ilimitadas. A API é RESTful e pode ser integrada com qualquer linguagem de programação (JavaScript, Python, PHP) ou plataforma de automação (Make, Zapier, n8n, TypeBot).
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Requisitos</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Conta ativa na Hook7</li>
                    <li>• Sessão WhatsApp configurada</li>
                    <li>• API Key (obtida no Dashboard)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Casos de Uso</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Notificações de pedidos e entregas</li>
                    <li>• Confirmação de agendamentos</li>
                    <li>• Campanhas de marketing</li>
                    <li>• Atendimento automatizado</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Section */}
          <Alert className="border-primary/50 bg-primary/5">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <AlertTitle className="font-semibold">Autenticação da API WhatsApp</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Todas as requisições requerem autenticação via <strong>apikey</strong> no header. 
                Obtenha sua apikey no Dashboard → Ferramentas → Ver API Key.
              </p>
              <code className="block bg-muted px-3 py-2 rounded text-sm mt-2">
                apikey: sua-apikey-aqui
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ <strong>IMPORTANTE:</strong> Nunca compartilhe sua apikey publicamente! 
                Ela dá acesso total à sua instância WhatsApp.
              </p>
            </AlertDescription>
          </Alert>
        </motion.header>

        {/* Tabs Section */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Texto e Mídia</span>
              <span className="sm:hidden">Básico</span>
            </TabsTrigger>
            <TabsTrigger value="interactive" className="flex items-center gap-1.5">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Interativos</span>
              <span className="sm:hidden">Interativo</span>
            </TabsTrigger>
            <TabsTrigger value="utility" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Local e Contato</span>
              <span className="sm:hidden">Utilidade</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-1.5">
              <Code2 className="h-4 w-4" />
              <span className="hidden sm:inline">Exemplos</span>
              <span className="sm:hidden">Código</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Basic Messages (Text & Media) */}
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
                <h2 id="basic-messages-heading" className="text-lg font-semibold">Mensagens de Texto e Mídia</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Endpoints para enviar mensagens de texto simples, imagens, áudios e documentos via WhatsApp.
              </p>
              
              {/* Send Text Message */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendText/{instance}"
                description="Enviar Mensagem de Texto via API WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "text", type: "string", required: true, description: "Texto da mensagem", example: "Olá, tudo bem?" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendText/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
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
    "conversation": "Olá! Esta é uma mensagem de teste."
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              {/* Send Media */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendMedia/{instance}"
                description="Enviar Mídia (Imagem/Áudio/Documento) via API WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "media", type: "string", required: true, description: "URL pública da mídia", example: "https://exemplo.com/imagem.jpg" },
                  { name: "mediatype", type: "string", required: true, description: "Tipo: image, audio, document", example: "image" },
                  { name: "caption", type: "string", required: false, description: "Legenda (para imagem)" },
                  { name: "fileName", type: "string", required: false, description: "Nome do arquivo (para documento)" },
                ]}
                requestExample={`# Exemplo 1: Enviar IMAGEM
curl -X POST "https://api.hook7.com.br/message/sendMedia/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "media": "https://exemplo.com/foto.jpg",
    "mediatype": "image",
    "caption": "Confira esta imagem!"
  }'

# Exemplo 2: Enviar ÁUDIO
curl -X POST "https://api.hook7.com.br/message/sendMedia/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "media": "https://exemplo.com/audio.mp3",
    "mediatype": "audio"
  }'

# Exemplo 3: Enviar DOCUMENTO/ARQUIVO
curl -X POST "https://api.hook7.com.br/message/sendMedia/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "media": "https://exemplo.com/relatorio.pdf",
    "mediatype": "document",
    "fileName": "relatorio.pdf"
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567891"
  },
  "messageTimestamp": "1234567890"
}`}
              />
            </motion.section>
          </TabsContent>

          {/* Tab: Interactive Messages */}
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
                <h2 id="interactive-messages-heading" className="text-lg font-semibold">Mensagens Interativas</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Endpoints para enviar enquetes, listas interativas e menus de opções. Ideais para pesquisas NPS, cardápios e catálogos de produtos.
              </p>

              {/* Send Poll */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendPoll/{instance}"
                description="Enviar Enquete/Pesquisa NPS via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "name", type: "string", required: true, description: "Pergunta da enquete", example: "Como você avalia nosso atendimento?" },
                  { name: "values", type: "array", required: true, description: "Opções de resposta (array de strings)", example: '["Ótimo", "Bom", "Regular", "Ruim"]' },
                  { name: "selectableCount", type: "number", required: false, description: "Máximo de opções selecionáveis (default: 1)" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendPoll/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "name": "Como você avalia nosso atendimento?",
    "values": ["⭐ Ótimo", "👍 Bom", "😐 Regular", "👎 Ruim"],
    "selectableCount": 1
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567892"
  },
  "message": {
    "pollCreationMessage": {
      "name": "Como você avalia nosso atendimento?",
      "options": [
        { "optionName": "⭐ Ótimo" },
        { "optionName": "👍 Bom" },
        { "optionName": "😐 Regular" },
        { "optionName": "👎 Ruim" }
      ],
      "selectableOptionsCount": 1
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              {/* Send List */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendList/{instance}"
                description="Enviar Lista/Menu Interativo (Catálogo de Produtos)"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "title", type: "string", required: true, description: "Título da lista", example: "Nosso Cardápio" },
                  { name: "description", type: "string", required: true, description: "Descrição/texto principal", example: "Escolha uma categoria para ver os produtos" },
                  { name: "buttonText", type: "string", required: true, description: "Texto do botão", example: "Ver Opções" },
                  { name: "footerText", type: "string", required: false, description: "Texto do rodapé" },
                  { name: "sections", type: "array", required: true, description: "Seções com itens (ver exemplo)" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendList/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
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
    "id": "BAE5A1234567893"
  },
  "message": {
    "listMessage": {
      "title": "🍕 Nosso Cardápio",
      "description": "Escolha uma categoria para ver os produtos disponíveis",
      "buttonText": "Ver Cardápio",
      "listType": "SINGLE_SELECT"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              <Alert className="border-primary/30 bg-primary/5">
                <Vote className="h-4 w-4" />
                <AlertTitle>Dica: Use Listas como Catálogo de Produtos</AlertTitle>
                <AlertDescription>
                  O endpoint <code className="bg-muted px-1.5 py-0.5 rounded">sendList</code> é ideal para criar cardápios, catálogos e menus de atendimento interativos no WhatsApp Business, sem necessidade de Commerce Manager.
                </AlertDescription>
              </Alert>
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
                <h2 id="utility-messages-heading" className="text-lg font-semibold">Localização e Contatos</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Endpoints para enviar localização com mapa e compartilhar contatos (vCard). Perfeito para entregas, endereços de lojas e contatos de suporte.
              </p>

              {/* Send Location */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendLocation/{instance}"
                description="Enviar Localização com Mapa via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "name", type: "string", required: true, description: "Nome do local", example: "Loja UplinkLite" },
                  { name: "address", type: "string", required: true, description: "Endereço completo", example: "Av. Paulista, 1000 - São Paulo, SP" },
                  { name: "latitude", type: "number", required: true, description: "Latitude", example: "-23.5629" },
                  { name: "longitude", type: "number", required: true, description: "Longitude", example: "-46.6544" },
                ]}
                requestExample={`curl -X POST "https://api.uplinklite.com/message/sendLocation/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "name": "Loja UplinkLite",
    "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    "latitude": -23.5629,
    "longitude": -46.6544
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567894"
  },
  "message": {
    "locationMessage": {
      "degreesLatitude": -23.5629,
      "degreesLongitude": -46.6544,
      "name": "Loja UplinkLite",
      "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              {/* Send Contact */}
              <EndpointCard
                method="POST"
                endpoint="/message/sendContact/{instance}"
                description="Enviar Contato/vCard via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "contact", type: "array", required: true, description: "Array com dados do(s) contato(s)" },
                ]}
                requestExample={`curl -X POST "https://api.uplinklite.com/message/sendContact/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "contact": [
      {
        "fullName": "Suporte UplinkLite",
        "phoneNumber": "+55 11 99999-0000",
        "organization": "UplinkLite",
        "email": "suporte@uplinklite.com"
      }
    ]
  }'`}
                responseExample={`{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5A1234567895"
  },
  "message": {
    "contactMessage": {
      "displayName": "Suporte UplinkLite",
      "vcard": "BEGIN:VCARD\\nVERSION:3.0\\nFN:Suporte UplinkLite\\nORG:UplinkLite\\nTEL:+55 11 99999-0000\\nEMAIL:suporte@uplinklite.com\\nEND:VCARD"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              <Alert className="border-primary/30 bg-primary/5">
                <MapPin className="h-4 w-4" />
                <AlertTitle>Casos de Uso Comuns</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p><strong>Localização:</strong> Endereço de entrega, localização da loja, ponto de encontro para serviços.</p>
                  <p><strong>Contato:</strong> Compartilhar suporte técnico, transferir leads entre vendedores, enviar contato comercial.</p>
                </AlertDescription>
              </Alert>
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
                <h2 id="code-examples-heading" className="text-lg font-semibold">Exemplos de Código</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Exemplos práticos de integração em JavaScript, Python e PHP para enviar mensagens, enquetes e mais.
              </p>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" aria-hidden="true" />
                    JavaScript / Node.js - Enviar Mensagem de Texto
                  </CardTitle>
                  <CardDescription>Exemplo usando Axios para enviar mensagens WhatsApp</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="javascript"
                    code={`const axios = require('axios');

const sendMessage = async () => {
  try {
    const response = await axios.post(
      'https://api.uplinklite.com/message/sendText/sua-instancia',
      {
        number: '5511999999999',
        text: 'Olá! Esta é uma mensagem de teste.'
      },
      {
        headers: {
          'apikey': 'sua-apikey-aqui',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Mensagem enviada:', response.data);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data);
  }
};

sendMessage();`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Vote className="h-5 w-5" aria-hidden="true" />
                    JavaScript - Enviar Pesquisa NPS
                  </CardTitle>
                  <CardDescription>Exemplo de enquete para medir satisfação do cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="javascript"
                    code={`const axios = require('axios');

// Enviar pesquisa NPS após atendimento
const sendNpsSurvey = async (customerPhone) => {
  try {
    const response = await axios.post(
      'https://api.uplinklite.com/message/sendPoll/sua-instancia',
      {
        number: customerPhone,
        name: 'De 0 a 10, qual a chance de recomendar nosso serviço?',
        values: ['😍 9-10 (Promotor)', '😊 7-8 (Neutro)', '😔 0-6 (Detrator)'],
        selectableCount: 1
      },
      {
        headers: {
          'apikey': 'sua-apikey-aqui',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Pesquisa NPS enviada:', response.data);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data);
  }
};

sendNpsSurvey('5511999999999');`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" aria-hidden="true" />
                    Python - Enviar Menu de Produtos
                  </CardTitle>
                  <CardDescription>Exemplo de lista interativa como catálogo de produtos</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="python"
                    code={`import requests

def send_product_menu(phone):
    url = 'https://api.uplinklite.com/message/sendList/sua-instancia'
    headers = {
        'apikey': 'sua-apikey-aqui',
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
    if response.status_code == 200:
        print('✅ Menu enviado:', response.json())
    else:
        print('❌ Erro:', response.text)

send_product_menu('5511999999999')`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                    Python - Enviar Localização de Entrega
                  </CardTitle>
                  <CardDescription>Exemplo para enviar local de entrega ao cliente</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="python"
                    code={`import requests

def send_delivery_location(phone, order_id):
    url = 'https://api.uplinklite.com/message/sendLocation/sua-instancia'
    headers = {
        'apikey': 'sua-apikey-aqui',
        'Content-Type': 'application/json'
    }
    data = {
        'number': phone,
        'name': f'Entrega Pedido #{order_id}',
        'address': 'Rua das Flores, 123 - Centro, São Paulo - SP',
        'latitude': -23.5505,
        'longitude': -46.6333
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        print('✅ Localização enviada!')
    else:
        print('❌ Erro:', response.text)

send_delivery_location('5511999999999', '12345')`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>PHP - Integração Básica</CardTitle>
                  <CardDescription>Exemplo usando cURL para enviar mensagens WhatsApp</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    language="php"
                    code={`<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.uplinklite.com/message/sendText/sua-instancia',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => array(
    'apikey: sua-apikey-aqui',
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

if ($httpCode == 200) {
    echo "✅ Resposta: " . $response;
} else {
    echo "❌ Erro: " . $response;
}
?>`}
                  />
                </CardContent>
              </Card>
            </motion.section>
          </TabsContent>
        </Tabs>

        {/* How to Get Token */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-labelledby="get-token-heading"
        >
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle id="get-token-heading" className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
                Como Obter sua API Key da API WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">📍 Opção 1: Via Dashboard (Rápido)</h3>
                <ol className="space-y-2 list-decimal list-inside text-sm ml-2">
                  <li>Acesse o <strong>Dashboard</strong></li>
                  <li>Clique em <strong>"Ferramentas"</strong></li>
                  <li>Clique em <strong>"Ver Token da API"</strong></li>
                  <li>Selecione a instância desejada no dropdown (se houver múltiplas)</li>
                  <li>Copie a apikey</li>
                </ol>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">📍 Opção 2: Via Detalhes da Sessão</h3>
                <ol className="space-y-2 list-decimal list-inside text-sm ml-2">
                  <li>Vá para <strong>Sessões → Minhas Sessões</strong></li>
                  <li>Selecione a instância desejada</li>
                  <li>Clique em <strong>"Ver Detalhes"</strong></li>
                  <li>Na seção <strong>"Credenciais da API"</strong>, copie a <strong>API Key</strong></li>
                </ol>
              </div>

              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>Segurança</AlertTitle>
                <AlertDescription>
                  Nunca compartilhe sua apikey publicamente! 
                  Ela dá acesso total à sua instância WhatsApp.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-3 rounded-lg mt-4">
                <p className="text-xs text-muted-foreground mb-2">
                  💡 <strong>Dica:</strong> Use o header no formato:
                </p>
                <code className="block bg-background px-3 py-2 rounded text-xs">
                  apikey: sua-apikey-aqui
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
