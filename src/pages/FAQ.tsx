import { useNavigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ArrowLeft, HelpCircle, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const FAQ = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isPortuguese = i18n.language.startsWith('pt');
  const questions = t('faq.questions', { returnObjects: true }) as { question: string; answer: string }[];

  return (
    <>
      <SEO
        browserTitle={isPortuguese ? "FAQ | Hook7" : "FAQ | Hook7"}
        title={isPortuguese ? "Perguntas Frequentes | Hook7" : "FAQ | Hook7"}
        description={isPortuguese
          ? "Tire suas dúvidas sobre a API WhatsApp da Hook7. Preços, configuração, integrações e suporte."
          : "Get answers about Hook7 WhatsApp API. Pricing, setup, integrations, and support."}
        canonical="https://app.hook7.com.br/faq"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": questions.map((faq) => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={() => navigate("/")} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img src="/hook7-logo.svg" alt="Hook7" width="36" height="36" className="h-9 w-9 rounded-full" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Hook7</span>
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-3xl text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium border border-primary/20 mb-4">
                <HelpCircle className="h-4 w-4" />
                {t('faq.badge')}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                {t('faq.title')}{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {t('faq.titleHighlight')}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mt-4">
                {isPortuguese
                  ? "Encontre respostas para as perguntas mais comuns sobre a Hook7."
                  : "Find answers to the most common questions about Hook7."}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Questions */}
        <section className="pb-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              {questions.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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

        {/* Contact CTA */}
        <section className="pb-24 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="bg-muted/50 border border-border rounded-2xl p-8 md:p-12 text-center space-y-4">
              <MessageSquare className="h-10 w-10 text-primary mx-auto" />
              <h2 className="text-2xl font-bold">
                {isPortuguese ? "Ainda tem dúvidas?" : "Still have questions?"}
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                {isPortuguese
                  ? "Nossa equipe de suporte está disponível 24/7 para ajudar você."
                  : "Our support team is available 24/7 to help you."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button onClick={() => window.open("mailto:suporte@hook7.com.br")} variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  suporte@hook7.com.br
                </Button>
                <Button onClick={() => navigate("/signup")} className="gap-2">
                  {t('hero.cta')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default FAQ;
