import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { 
  Check, Zap, Shield, Clock, MessageSquare, ShoppingCart, Calendar, Package,
  Code2, Webhook, QrCode, Layers, Star, TrendingUp, Users, ChevronRight,
  Play, CheckCircle2, Sparkles, Timer, Headphones, FileCode, Receipt,
  Truck, Megaphone, Bot, BarChart3, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { Helmet } from "react-helmet-async";
import WhatsAppMockup from "@/components/landing/WhatsAppMockup";
import { useTranslation } from "react-i18next";
import { useRegionalPricing, formatPrice } from "@/hooks/useRegionalPricing";
import LanguageSelector from "@/components/LanguageSelector";

const Index = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const pricing = useRegionalPricing();
  const isPortuguese = i18n.language.startsWith('pt');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const priceDisplay = formatPrice(pricing);
  const priceWithPeriod = `${priceDisplay}${t('pricing.perMonth')}`;

  // Feature icons mapping
  const featureIcons = [MessageSquare, Webhook, QrCode, Code2, Layers, Shield];
  const featureKeys = ['messaging', 'webhooks', 'qrcode', 'api', 'instances', 'security'];
  const featureColors = [
    { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
    { text: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
    { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
    { text: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  ];

  // Use cases mapping
  const useCaseIcons = [ShoppingCart, Receipt, Calendar, BarChart3, CreditCard, Truck, Megaphone, Bot];
  const useCaseKeys = ['orderConfirmation', 'cartRecovery', 'appointmentReminders', 'nps', 'billing', 'delivery', 'promotions', 'chatbot'];
  const useCaseColors = [
    { text: "text-blue-500", bg: "bg-blue-500/10" },
    { text: "text-orange-500", bg: "bg-orange-500/10" },
    { text: "text-purple-500", bg: "bg-purple-500/10" },
    { text: "text-pink-500", bg: "bg-pink-500/10" },
    { text: "text-emerald-500", bg: "bg-emerald-500/10" },
    { text: "text-cyan-500", bg: "bg-cyan-500/10" },
    { text: "text-yellow-500", bg: "bg-yellow-500/10" },
    { text: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  // How it works steps
  const stepIcons = [Users, QrCode, Zap];
  const stepColors = ["from-blue-500 to-blue-600", "from-purple-500 to-purple-600", "from-green-500 to-green-600"];

  // Testimonials (static content)
  const testimonials = [
    {
      name: "Ricardo Mendes",
      role: isPortuguese ? "CEO - ShopFast E-commerce" : "CEO - ShopFast E-commerce",
      text: isPortuguese 
        ? "Integramos a Hook7 em nosso sistema de pedidos e reduzimos em 70% o tempo de resposta aos clientes. A configuração foi surpreendentemente simples."
        : "We integrated Hook7 into our order system and reduced customer response time by 70%. The setup was surprisingly simple.",
      rating: 5
    },
    {
      name: isPortuguese ? "Dra. Paula Santos" : "Dr. Paula Santos",
      role: isPortuguese ? "Diretora - Clínica MedSaúde" : "Director - MedHealth Clinic",
      text: isPortuguese 
        ? "Automatizamos todos os lembretes de consulta. Taxa de comparecimento aumentou 40%. O suporte é excepcional e sempre em português."
        : "We automated all appointment reminders. Attendance rate increased by 40%. Support is exceptional and always available.",
      rating: 5
    },
    {
      name: "Carlos Oliveira",
      role: isPortuguese ? "CTO - LogFast Entregas" : "CTO - LogFast Delivery",
      text: isPortuguese 
        ? "API estável e confiável. Enviamos milhares de mensagens por dia sem problemas. O custo-benefício é imbatível."
        : "Stable and reliable API. We send thousands of messages daily without issues. The value for money is unbeatable.",
      rating: 5
    }
  ];

  // Integration logos
  const integrations = [
    { name: "n8n", desc: t('integrations.automation'), logo: "https://cdn.simpleicons.org/n8n/FF6D5A" },
    { name: "Make", desc: t('integrations.integration'), logo: "https://cdn.simpleicons.org/make/6D00CC" },
    { name: "Zapier", desc: t('integrations.workflows'), logo: "https://cdn.simpleicons.org/zapier/FF4A00" },
    { name: "Bubble", desc: t('integrations.nocode'), logo: "https://images.seeklogo.com/logo-png/44/1/bubble-icon-logo-png_seeklogo-448116.png" },
    { name: "Python", desc: t('integrations.language'), logo: "https://cdn.simpleicons.org/python/3776AB" },
    { name: "Node.js", desc: t('integrations.javascript'), logo: "https://cdn.simpleicons.org/nodedotjs/339933" },
    { name: "PHP", desc: t('integrations.backend'), logo: "https://cdn.simpleicons.org/php/777BB4" },
    { name: "Google Sheets", desc: t('integrations.spreadsheets'), logo: "https://cdn.simpleicons.org/googlesheets/34A853" }
  ];

  return (
    <>
      <SEO 
        browserTitle="Hook7"
        title={isPortuguese ? "Melhor API WhatsApp Brasil | Hook7" : "Best WhatsApp API | Hook7"}
        description={isPortuguese 
          ? "A melhor API WhatsApp do Brasil para automações empresariais. Configure em 5 minutos, envie mensagens ilimitadas por R$ 69,90/mês. Suporte em português 24/7."
          : "The best WhatsApp API for business automation. Set up in 5 minutes, send unlimited messages for $15/month. 24/7 support."}
        canonical="https://app.hook7.com.br/"
      />
      <Helmet>
        {/* Hreflang tags */}
        <link rel="alternate" hrefLang="pt-BR" href="https://app.hook7.com.br/" />
        <link rel="alternate" hrefLang="en" href="https://app.hook7.com.br/?lang=en" />
        <link rel="alternate" hrefLang="x-default" href="https://app.hook7.com.br/" />
        
        {/* Schema.org SoftwareApplication */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Hook7 - Best WhatsApp API",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": isPortuguese 
              ? "A Hook7 é uma API WhatsApp que permite enviar mensagens ilimitadas. Configure em 5 minutos."
              : "Hook7 is a WhatsApp API that allows sending unlimited messages. Set up in 5 minutes.",
            "url": "https://app.hook7.com.br",
            "featureList": [
              "Unlimited messages",
              "5-minute setup",
              "24/7 support",
              "Make, Zapier, n8n integration",
              "No BSP approval required",
              "Complete RESTful API",
              "Real-time webhooks"
            ],
            "offers": [
              {
                "@type": "Offer",
                "price": "69.90",
                "priceCurrency": "BRL",
                "priceValidUntil": "2026-12-31"
              },
              {
                "@type": "Offer",
                "price": "15",
                "priceCurrency": "USD",
                "priceValidUntil": "2026-12-31"
              },
              {
                "@type": "Offer",
                "price": "15",
                "priceCurrency": "EUR",
                "priceValidUntil": "2026-12-31"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "reviewCount": "3",
              "bestRating": "5"
            },
            "provider": {
              "@type": "Organization",
              "name": "S7",
              "url": "https://app.hook7.com.br"
            }
          })}
        </script>
        
        {/* Schema.org Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Hook7",
            "url": "https://app.hook7.com.br",
            "logo": "https://app.hook7.com.br/logo-512.png",
            "description": isPortuguese 
              ? "A melhor API WhatsApp para automações empresariais"
              : "The best WhatsApp API for business automation",
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer support",
              "availableLanguage": ["Portuguese", "English"],
              "email": "suporte@app.hook7.com.br"
            },
            "sameAs": []
          })}
        </script>
        
        {/* Schema.org FAQPage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": (t('faq.questions', { returnObjects: true }) as any[]).map((faq: any) => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
        
        {/* Schema.org HowTo */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": isPortuguese ? "Como configurar a API WhatsApp da Hook7" : "How to set up Hook7 WhatsApp API",
            "description": isPortuguese 
              ? "Configure sua API WhatsApp em 3 passos simples"
              : "Set up your WhatsApp API in 3 simple steps",
            "totalTime": "PT5M",
            "step": [
              {
                "@type": "HowToStep",
                "name": t('howItWorks.step1.title'),
                "text": t('howItWorks.step1.description'),
                "position": 1
              },
              {
                "@type": "HowToStep",
                "name": t('howItWorks.step2.title'),
                "text": t('howItWorks.step2.description'),
                "position": 2
              },
              {
                "@type": "HowToStep",
                "name": t('howItWorks.step3.title'),
                "text": t('howItWorks.step3.description'),
                "position": 3
              }
            ]
          })}
        </script>
      </Helmet>
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Header Fixo */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 z-50 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse-glow" />
              <img 
                src="/hook7-logo.svg" 
                alt="Hook7 - WhatsApp API" 
                width="40"
                height="40"
                className="h-10 w-10 relative drop-shadow-lg rounded-full"
              />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Hook7
            </span>

          </motion.div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("recursos")} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t('nav.features')}
            </button>
            <button onClick={() => scrollToSection("integracoes")} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t('nav.integrations')}
            </button>
            <button onClick={() => scrollToSection("precos")} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              {t('nav.pricing')}
            </button>
            <button onClick={() => navigate("/api-docs")} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
              <FileCode className="h-4 w-4" />
              {t('nav.docs')}
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <Button onClick={() => navigate("/login")} variant="ghost" size="sm" className="font-semibold hidden sm:inline-flex">
              {t('nav.login')}
            </Button>
            <Button onClick={() => navigate("/get-started")} size="sm" className="font-semibold shadow-lg hover:shadow-xl transition-all animate-pulse-glow text-xs sm:text-sm">
              <span className="hidden xs:inline">{t('nav.startNow')}</span>
              <span className="xs:hidden">{isPortuguese ? 'Começar' : 'Start'}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20">
                <Sparkles className="h-4 w-4" />
                <span>{t('hero.badge')}</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                {t('hero.title')}
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
                  {t('hero.titleHighlight')}
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('hero.description')}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Button 
                  onClick={() => navigate("/get-started")} 
                  size="lg" 
                  className="text-lg h-14 px-10 shadow-elegant hover:shadow-glow transition-all group"
                >
                  {t('hero.cta')}
                  <Play className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  onClick={() => scrollToSection("integracoes")} 
                  variant="outline" 
                  size="lg"
                  className="text-lg h-14 px-10"
                >
                  {t('hero.seeIntegrations')}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-6">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('hero.supportPt')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('hero.uptime')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('hero.paymentLocal')}</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30 rounded-[3rem] blur-3xl animate-pulse-glow" />
              <WhatsAppMockup />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Métricas/Prova Social */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y border-primary/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary">+10K</div>
              <div className="text-sm text-muted-foreground">{t('metrics.messagesSent')}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground">{t('metrics.uptime')}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary">&lt; 5min</div>
              <div className="text-sm text-muted-foreground">{t('metrics.setupTime')}</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">{t('metrics.support')}</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Recursos/Features */}
      <section id="recursos" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('features.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('features.title')}
              <br />
              <span className="text-primary">{t('features.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureKeys.map((key, index) => {
              const Icon = featureIcons[index];
              const colors = featureColors[index];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`group border-2 ${colors.border} hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer h-full`}>
                    <CardHeader className="space-y-4">
                      <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-7 w-7 ${colors.text}`} />
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {t(`features.${key}.title`)}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {t(`features.${key}.description`)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seção de Integrações */}
      <section id="integracoes" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('integrations.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('integrations.title')}
              <br />
              <span className="text-primary">{t('integrations.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('integrations.subtitle')}
            </p>
          </motion.div>

          {/* Grid de Logos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            {integrations.map((integration, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                <Card className="h-full border-2 hover:border-primary/50 transition-all cursor-pointer">
                  <CardContent className="flex flex-col items-center justify-center p-8 space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                      <img 
                        src={integration.logo} 
                        alt={`${integration.name} integration`}
                        loading="lazy"
                        decoding="async"
                        width="32"
                        height="32"
                        className="h-8 w-8 object-contain" 
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">{integration.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('howItWorks.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('howItWorks.title')} <span className="text-primary">{t('howItWorks.titleHighlight')}</span>
            </h2>
          </motion.div>

          <div className="space-y-8">
            {[1, 2, 3].map((stepNum, index) => {
              const StepIcon = stepIcons[index];
              const stepKey = `step${stepNum}`;
              return (
                <motion.div
                  key={stepNum}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="relative"
                >
                  {index < 2 && (
                    <div className="hidden md:block absolute left-8 top-20 w-0.5 h-16 bg-gradient-to-b from-primary to-transparent" />
                  )}
                  <Card className="border-2 hover:border-primary/50 hover:shadow-2xl transition-all group">
                    <CardContent className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start p-6 sm:p-8">
                      <div className={`relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stepColors[index]} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform`}>
                        {stepNum}
                        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/20 group-hover:animate-pulse" />
                      </div>
                      <div className="flex-1 space-y-2 sm:space-y-3 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                          <StepIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          <h3 className="text-xl sm:text-2xl font-bold">{t(`howItWorks.${stepKey}.title`)}</h3>
                        </div>
                        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                          {t(`howItWorks.${stepKey}.description`)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('pricing.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('pricing.title')}
              <br />
              <span className="text-primary">{t('pricing.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card className="max-w-lg mx-auto border-2 border-primary shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-primary to-secondary text-white px-6 py-2 rounded-bl-2xl font-bold text-sm">
                {t('pricing.popular')}
              </div>
              
              <CardHeader className="text-center pb-8 pt-12 space-y-6">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-3xl">{t('pricing.sessionTitle')}</CardTitle>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-primary">{priceDisplay}</span>
                    <span className="text-muted-foreground text-xl">{t('pricing.perMonth')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('pricing.perSession')}</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-8 pb-8">
                <div className="space-y-4">
                  {(t('pricing.features', { returnObjects: true }) as string[]).map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <Button 
                  onClick={() => navigate("/get-started")} 
                  className="w-full h-14 text-lg mt-6 shadow-elegant hover:shadow-glow transition-all group"
                  size="lg"
                >
                  {t('pricing.cta')}
                  <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  {t('pricing.cancelAnytime')}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Casos de Uso */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('useCases.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('useCases.title')}
              <br />
              <span className="text-primary">{t('useCases.titleHighlight')}</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('useCases.subtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCaseKeys.map((key, index) => {
              const Icon = useCaseIcons[index];
              const colors = useCaseColors[index];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-2 hover:border-primary/50 hover:shadow-2xl transition-all group h-full">
                    <CardHeader className="space-y-4">
                      <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                      </div>
                      <CardTitle className="text-xl">{t(`useCases.${key}.title`)}</CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {t(`useCases.${key}.description`)}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('testimonials.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('testimonials.title')}
              <br />
              <span className="text-primary">{t('testimonials.titleHighlight')}</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-2 hover:shadow-2xl transition-all h-full">
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    <div className="border-t pt-4 space-y-1">
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 space-y-4"
          >
            <Badge variant="outline" className="mb-2">{t('faq.badge')}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">
              {t('faq.title')} <span className="text-primary">{t('faq.titleHighlight')}</span>
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-4">
            {(t('faq.questions', { returnObjects: true }) as any[]).map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <AccordionItem value={`item-${index}`} className="border-2 rounded-lg px-6 hover:border-primary/50 transition-colors">
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary to-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
        
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-8 text-white"
          >
            <h2 className="text-4xl md:text-6xl font-bold">
              {t('cta.title')}
              <br />
              {t('cta.titleHighlight')}
            </h2>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button 
                onClick={() => navigate("/get-started")}
                size="lg"
                variant="secondary"
                className="text-lg h-16 px-12 shadow-2xl hover:scale-105 transition-all"
              >
                {t('cta.button')} - {priceWithPeriod}
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                onClick={() => navigate("/api-docs")}
                size="lg"
                variant="outline"
                className="text-lg h-16 px-12 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                {t('cta.viewDocs')}
              </Button>
            </div>
            <p className="text-sm opacity-75 pt-4">
              {t('cta.footer')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/hook7-logo.svg" 
                  alt="Hook7 - WhatsApp API"
                  loading="lazy"
                  width="40"
                  height="40"
                  className="h-10 w-10 rounded-full"
                />
                <span className="text-xl font-bold">Hook7</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('footer.description')}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.product')}</h3>
              <div className="space-y-3 text-sm">
                <button onClick={() => scrollToSection("recursos")} className="block text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.features')}
                </button>
                <button onClick={() => scrollToSection("precos")} className="block text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.pricing')}
                </button>
                <button onClick={() => navigate("/api-docs")} className="block text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.documentation')}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
              <div className="space-y-3 text-sm">
                <button onClick={() => navigate("/terms")} className="block text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.terms')}
                </button>
                <button onClick={() => navigate("/privacy")} className="block text-muted-foreground hover:text-primary transition-colors">
                  {t('footer.privacy')}
                </button>
                <button onClick={() => navigate("/faq")} className="block text-muted-foreground hover:text-primary transition-colors">
                  FAQ
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">{t('footer.support')}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Headphones className="h-4 w-4 text-primary" />
                  <span>{t('footer.support247')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{t('footer.inPortuguese')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Badge variant="outline" className="gap-2">
                <Shield className="h-3 w-3" />
                {t('footer.sslSecure')}
              </Badge>
              <Badge variant="outline" className="gap-2">
                <CheckCircle2 className="h-3 w-3" />
                99.9% Uptime
              </Badge>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default Index;
