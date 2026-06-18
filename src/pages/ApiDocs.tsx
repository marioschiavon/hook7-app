import { motion } from "framer-motion";
import { BookOpen, Shield, Code2, Zap, AlertCircle, ArrowLeft, Vote, ListOrdered, MapPin, Contact2, MessageSquare, Image } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "headline": "Documentação da API WhatsApp Hook7",
            "description": "Documentação técnica completa para integrar a API WhatsApp Hook7 em suas aplicações. Inclui autenticação, endpoints para envio de mensagens e mídias, exemplos de código em JavaScript, Python e PHP.",
            "author": { "@type": "Organization", "name": "Hook7" },
            "publisher": { "@type": "Organization", "name": "Hook7", "url": "https://app.hook7.com.br" },
            "mainEntityOfPage": "https://app.hook7.com.br/api-docs",
            "datePublished": "2024-01-01",
            "dateModified": "2026-01-23",
            "inLanguage": "pt-BR",
            "keywords": ["API WhatsApp", "documentação API", "enviar mensagens WhatsApp", "integração WhatsApp", "Make", "Zapier", "n8n", "TypeBot"],
            "about": { "@type": "SoftwareApplication", "name": "Hook7 API", "applicationCategory": "BusinessApplication" },
          })}
        </script>
      </Helmet>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
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
            <span className="text-xl font-bold hook7-gradient-text">Hook7</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
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
              <h1 className="text-2xl font-bold text-white/90">Documentação da API WhatsApp Hook7</h1>
              <p className="text-sm text-white/40 mt-0.5">Integre o WhatsApp nas suas aplicações com nossa API REST</p>
            </div>
            <Badge variant="outline" className="ml-auto border-white/15 text-white/50 text-xs">v2.0</Badge>
          </div>

          {/* Intro card */}
          <Card className="glass-card border-white/5">
            <CardContent className="pt-5 pb-5 space-y-4">
              <h2 className="text-base font-semibold text-white/85">O que é a API WhatsApp Hook7?</h2>
              <p className="text-sm text-white/45 leading-relaxed">
                A Hook7 é uma API WhatsApp brasileira que permite enviar mensagens de texto, imagens, áudio e documentos via WhatsApp por R$ 69,90/mês com mensagens ilimitadas. A API é RESTful e pode ser integrada com qualquer linguagem de programação (JavaScript, Python, PHP) ou plataforma de automação (Make, Zapier, n8n, TypeBot).
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Requisitos</h3>
                  <ul className="text-xs text-white/35 space-y-1">
                    <li>• Conta ativa na Hook7</li>
                    <li>• Sessão WhatsApp configurada</li>
                    <li>• API Key (obtida no Dashboard)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Casos de uso</h3>
                  <ul className="text-xs text-white/35 space-y-1">
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
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/8 px-4 py-3.5 text-sm text-primary/90">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-semibold">Autenticação da API WhatsApp</p>
              <p className="text-xs text-primary/70">
                Todas as requisições requerem autenticação via <strong>apikey</strong> no header. Obtenha sua apikey no Dashboard → Ferramentas → Ver API Key.
              </p>
              <code className="block rounded bg-black/30 px-3 py-1.5 text-xs text-primary/80 font-mono mt-1">
                apikey: sua-apikey-aqui
              </code>
              <p className="text-[11px] text-primary/50">
                ⚠️ <strong>IMPORTANTE:</strong> Nunca compartilhe sua apikey publicamente! Ela dá acesso total à sua instância WhatsApp.
              </p>
            </div>
          </div>
        </motion.header>

        {/* Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted/30 border border-white/5">
            <TabsTrigger value="basic" className="flex items-center gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Texto e Mídia</span>
              <span className="sm:hidden">Básico</span>
            </TabsTrigger>
            <TabsTrigger value="interactive" className="flex items-center gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">Interativos</span>
              <span className="sm:hidden">Interativo</span>
            </TabsTrigger>
            <TabsTrigger value="utility" className="flex items-center gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Local e Contato</span>
              <span className="sm:hidden">Utilidade</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="flex items-center gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
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
                <h2 id="basic-messages-heading" className="text-base font-semibold text-white/80">Mensagens de Texto e Mídia</h2>
              </div>
              <p className="text-xs text-white/40">
                Endpoints para enviar mensagens de texto simples, imagens, áudios e documentos via WhatsApp.
              </p>

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
                <h2 id="interactive-messages-heading" className="text-base font-semibold text-white/80">Mensagens Interativas</h2>
              </div>
              <p className="text-xs text-white/40">
                Endpoints para enviar enquetes, listas interativas e menus de opções. Ideais para pesquisas NPS, cardápios e catálogos de produtos.
              </p>

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
      "description": "Escolha uma categoria",
      "buttonText": "Ver Cardápio",
      "listType": "SINGLE_SELECT"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary/80">
                <Vote className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Dica: Use Listas como Catálogo de Produtos</p>
                  <p className="text-xs text-primary/60">
                    O endpoint <code className="bg-black/30 px-1 rounded font-mono">sendList</code> é ideal para criar cardápios, catálogos e menus de atendimento interativos no WhatsApp Business, sem necessidade de Commerce Manager.
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
                <h2 id="utility-messages-heading" className="text-base font-semibold text-white/80">Localização e Contatos</h2>
              </div>
              <p className="text-xs text-white/40">
                Endpoints para enviar localização com mapa e compartilhar contatos (vCard). Perfeito para entregas, endereços de lojas e contatos de suporte.
              </p>

              <EndpointCard
                method="POST"
                endpoint="/message/sendLocation/{instance}"
                description="Enviar Localização com Mapa via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "name", type: "string", required: true, description: "Nome do local", example: "Loja Hook7" },
                  { name: "address", type: "string", required: true, description: "Endereço completo", example: "Av. Paulista, 1000 - São Paulo, SP" },
                  { name: "latitude", type: "number", required: true, description: "Latitude", example: "-23.5629" },
                  { name: "longitude", type: "number", required: true, description: "Longitude", example: "-46.6544" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendLocation/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "name": "Loja Hook7",
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
      "name": "Loja Hook7",
      "address": "Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              <EndpointCard
                method="POST"
                endpoint="/message/sendContact/{instance}"
                description="Enviar Contato/vCard via WhatsApp"
                parameters={[
                  { name: "number", type: "string", required: true, description: "Número com DDI", example: "5511999999999" },
                  { name: "contact", type: "array", required: true, description: "Array com dados do(s) contato(s)" },
                ]}
                requestExample={`curl -X POST "https://api.hook7.com.br/message/sendContact/sua-instancia" \\
  -H "apikey: sua-apikey-aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "contact": [
      {
        "fullName": "Suporte Hook7",
        "phoneNumber": "+55 11 99999-0000",
        "organization": "Hook7",
        "email": "suporte@hook7.com.br"
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
      "displayName": "Suporte Hook7",
      "vcard": "BEGIN:VCARD\\nVERSION:3.0\\nFN:Suporte Hook7\\nORG:Hook7\\nTEL:+55 11 99999-0000\\nEMAIL:suporte@hook7.com.br\\nEND:VCARD"
    }
  },
  "messageTimestamp": "1234567890"
}`}
                errorCodes={commonErrors}
              />

              <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-primary/80">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-0.5">Casos de uso comuns</p>
                  <p className="text-xs text-primary/60">
                    <strong>Localização:</strong> Endereço de entrega, localização da loja, ponto de encontro para serviços.<br />
                    <strong>Contato:</strong> Compartilhar suporte técnico, transferir leads entre vendedores, enviar contato comercial.
                  </p>
                </div>
              </div>
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
                <h2 id="code-examples-heading" className="text-base font-semibold text-white/80">Exemplos de Código</h2>
              </div>
              <p className="text-xs text-white/40">
                Exemplos práticos de integração em JavaScript, Python e PHP para enviar mensagens, enquetes e mais.
              </p>

              {[
                {
                  icon: Code2,
                  title: "JavaScript / Node.js — Enviar mensagem de texto",
                  desc: "Exemplo usando Axios para enviar mensagens WhatsApp",
                  lang: "javascript",
                  code: `const axios = require('axios');

const sendMessage = async () => {
  try {
    const response = await axios.post(
      'https://api.hook7.com.br/message/sendText/sua-instancia',
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

sendMessage();`,
                },
                {
                  icon: Vote,
                  title: "JavaScript — Enviar pesquisa NPS",
                  desc: "Exemplo de enquete para medir satisfação do cliente",
                  lang: "javascript",
                  code: `const axios = require('axios');

const sendNpsSurvey = async (customerPhone) => {
  try {
    const response = await axios.post(
      'https://api.hook7.com.br/message/sendPoll/sua-instancia',
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

sendNpsSurvey('5511999999999');`,
                },
                {
                  icon: Zap,
                  title: "Python — Enviar menu de produtos",
                  desc: "Exemplo de lista interativa como catálogo de produtos",
                  lang: "python",
                  code: `import requests

def send_product_menu(phone):
    url = 'https://api.hook7.com.br/message/sendList/sua-instancia'
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

send_product_menu('5511999999999')`,
                },
                {
                  icon: MapPin,
                  title: "Python — Enviar localização de entrega",
                  desc: "Exemplo para enviar local de entrega ao cliente",
                  lang: "python",
                  code: `import requests

def send_delivery_location(phone, order_id):
    url = 'https://api.hook7.com.br/message/sendLocation/sua-instancia'
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

send_delivery_location('5511999999999', '12345')`,
                },
                {
                  icon: Code2,
                  title: "PHP — Integração básica",
                  desc: "Exemplo usando cURL para enviar mensagens WhatsApp",
                  lang: "php",
                  code: `<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.hook7.com.br/message/sendText/sua-instancia',
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
?>`,
                },
              ].map(({ icon: Icon, title, desc, lang, code }) => (
                <Card key={title} className="glass-card border-white/5">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="flex items-center gap-2 text-sm text-white/80">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {title}
                    </CardTitle>
                    <CardDescription className="text-xs text-white/35">{desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <CodeBlock language={lang} code={code} />
                  </CardContent>
                </Card>
              ))}
            </motion.section>
          </TabsContent>
        </Tabs>

        {/* How to get API key */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          aria-labelledby="get-token-heading"
        >
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle id="get-token-heading" className="flex items-center gap-2 text-sm text-white/80">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                Como obter sua API Key da API WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Opção 1 — Via Dashboard (rápido)</p>
                <ol className="space-y-1.5 list-decimal list-inside text-xs text-white/40 ml-1">
                  <li>Acesse o <strong className="text-white/60">Dashboard</strong></li>
                  <li>Clique em <strong className="text-white/60">"Ferramentas"</strong></li>
                  <li>Clique em <strong className="text-white/60">"Ver Token da API"</strong></li>
                  <li>Selecione a instância desejada no dropdown</li>
                  <li>Copie a apikey</li>
                </ol>
              </div>

              <Separator className="border-white/5" />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Opção 2 — Via Detalhes da Sessão</p>
                <ol className="space-y-1.5 list-decimal list-inside text-xs text-white/40 ml-1">
                  <li>Vá para <strong className="text-white/60">Sessões → Minhas Sessões</strong></li>
                  <li>Selecione a instância desejada</li>
                  <li>Clique em <strong className="text-white/60">"Ver Detalhes"</strong></li>
                  <li>Na seção <strong className="text-white/60">"Credenciais da API"</strong>, copie a <strong className="text-white/60">API Key</strong></li>
                </ol>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold mb-0.5">Segurança</p>
                  <p className="text-xs text-red-300/70">Nunca compartilhe sua apikey publicamente! Ela dá acesso total à sua instância WhatsApp.</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 border border-white/5 px-4 py-3">
                <p className="text-[11px] text-white/35 mb-1.5">
                  Dica: Use o header no formato:
                </p>
                <code className="block rounded bg-black/30 px-3 py-1.5 text-xs text-primary/70 font-mono">
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
