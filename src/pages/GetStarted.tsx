import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, QrCode, Send, Zap, Shield, MessageSquare, Webhook, Headphones, ArrowLeft, ChevronRight, Check, Lock, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";
import { useRegionalPricing, formatPrice } from "@/hooks/useRegionalPricing";

const GetStarted = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const pricing = useRegionalPricing();
  const isPortuguese = i18n.language.startsWith('pt');
  const priceDisplay = formatPrice(pricing);

  const steps = [
    {
      icon: UserPlus,
      title: isPortuguese ? "Crie sua conta" : "Create your account",
      description: isPortuguese
        ? "Cadastro rápido, sem cartão de crédito inicial. Leva menos de 1 minuto."
        : "Quick signup, no credit card required upfront. Takes less than 1 minute.",
      color: "from-blue-500 to-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      icon: QrCode,
      title: isPortuguese ? "Configure sua sessão" : "Set up your session",
      description: isPortuguese
        ? "Conecte seu número WhatsApp escaneando um QR Code diretamente no painel."
        : "Connect your WhatsApp number by scanning a QR Code directly in the dashboard.",
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-500/10",
    },
    {
      icon: Send,
      title: isPortuguese ? "Comece a enviar" : "Start sending",
      description: isPortuguese
        ? "Use nossa API REST para integrar com qualquer sistema, chatbot ou automação."
        : "Use our REST API to integrate with any system, chatbot, or automation.",
      color: "from-primary to-secondary",
      bg: "bg-primary/10",
    },
  ];

  const benefits = [
    {
      icon: MessageSquare,
      title: isPortuguese ? "Mensagens ilimitadas" : "Unlimited messages",
      description: isPortuguese ? "Sem cobrança por mensagem enviada" : "No per-message charges",
    },
    {
      icon: Zap,
      title: isPortuguese ? "API REST completa" : "Complete REST API",
      description: isPortuguese ? "Documentação clara com exemplos prontos" : "Clear docs with ready-to-use examples",
    },
    {
      icon: Webhook,
      title: isPortuguese ? "Webhooks em tempo real" : "Real-time webhooks",
      description: isPortuguese ? "Receba notificações instantâneas" : "Receive instant notifications",
    },
    {
      icon: Headphones,
      title: isPortuguese ? "Suporte dedicado 24/7" : "Dedicated 24/7 support",
      description: isPortuguese ? "Equipe pronta para ajudar" : "Team ready to help",
    },
  ];

  const trustItems = [
    {
      icon: XCircle,
      text: isPortuguese ? "Sem fidelidade, cancele quando quiser" : "No commitment, cancel anytime",
    },
    {
      icon: Shield,
      text: isPortuguese ? "Seus dados estão seguros com criptografia" : "Your data is secure with encryption",
    },
    {
      icon: Lock,
      text: isPortuguese ? "Pagamento seguro via Stripe" : "Secure payment via Stripe",
    },
  ];

  return (
    <>
      <SEO
        browserTitle={isPortuguese ? "Começar Agora | Hook7" : "Get Started | Hook7"}
        title={isPortuguese ? "Como funciona | Hook7" : "How it works | Hook7"}
        description={isPortuguese
          ? "Veja como é fácil configurar sua API WhatsApp em 3 passos simples. Comece a automatizar em minutos."
          : "See how easy it is to set up your WhatsApp API in 3 simple steps. Start automating in minutes."}
        canonical="https://app.hook7.com.br/get-started"
      />

      <div className="min-h-screen bg-background">
        {/* Header simples */}
        <header className="fixed top-0 w-full bg-background/80 backdrop-blur-xl z-50 border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src="/hook7-logo.svg" alt="Hook7" width="40" height="40" className="h-10 w-10 rounded-full" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Hook7
              </span>
            </Link>
            <Button onClick={() => navigate("/")} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </div>
        </header>

        {/* Seção 1 - Hero */}
        <section className="pt-32 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h1 className="text-4xl md:text-6xl font-bold">
                {isPortuguese ? "Veja como é " : "See how "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {isPortuguese ? "fácil começar" : "easy it is"}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {isPortuguese
                  ? "Em apenas 3 passos você terá sua API WhatsApp funcionando"
                  : "In just 3 steps you'll have your WhatsApp API running"}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Seção 2 - 3 Passos */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="border-border/50 overflow-hidden">
                    <CardContent className="flex flex-col sm:flex-row items-center gap-6 p-8">
                      <div className="flex-shrink-0 flex items-center gap-4">
                        <span className="text-4xl font-bold text-muted-foreground/30">{index + 1}</span>
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                          <step.icon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground">{step.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Seção 3 - Benefícios + Preço */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-center mb-12"
            >
              {isPortuguese ? "O que está incluso" : "What's included"}
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full border-border/50">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Preço destaque */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Card className="inline-block border-primary/30 bg-gradient-to-br from-card to-primary/5">
                <CardContent className="p-8">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isPortuguese ? "Tudo isso por apenas" : "All of this for just"}
                  </p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-primary">{priceDisplay}</span>
                    <span className="text-xl text-muted-foreground">{t('pricing.perMonth')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isPortuguese ? "por sessão ativa" : "per active session"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Seção 4 - Confiança */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              {trustItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Seção 5 - CTA Final */}
        <section className="py-20 px-4 bg-gradient-to-br from-primary to-secondary">
          <div className="container mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                {isPortuguese ? "Pronto para começar?" : "Ready to get started?"}
              </h2>
              <Button
                onClick={() => navigate("/signup")}
                size="lg"
                variant="secondary"
                className="text-lg h-16 px-12 shadow-2xl hover:scale-105 transition-all bg-white text-primary hover:bg-white/90"
              >
                {isPortuguese ? "Criar minha conta grátis" : "Create my free account"}
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <p className="text-primary-foreground/80 text-sm">
                {isPortuguese ? "Leva menos de 2 minutos" : "Takes less than 2 minutes"}
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default GetStarted;
