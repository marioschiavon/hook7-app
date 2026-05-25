import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Phone, ArrowLeft, Clock, MessageSquare, Headphones, XCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";

const Signup = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isPortuguese = i18n.language.startsWith('pt');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formatPhone = (value: string) => {
    // Remove tudo que não for dígito
    const digits = value.replace(/\D/g, "");
    // Limita a 13 dígitos (DDI 55 + DDD + número)
    return digits.slice(0, 13);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/welcome`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Salvar telefone no perfil do usuário (se informado)
        if (phone && data.user.id) {
          await supabase
            .from("users")
            .update({ phone: phone })
            .eq("id", data.user.id);
        }
        toast.success(t('auth.signupSuccess'));
        navigate("/welcome");
      }
    } catch (error: any) {
      toast.error(error.message || t('auth.signupError'));
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: Clock,
      title: isPortuguese ? "Configuração em 5 minutos" : "Setup in 5 minutes",
      description: isPortuguese ? "Crie sua conta e comece a enviar mensagens rapidamente" : "Create your account and start sending messages quickly",
    },
    {
      icon: MessageSquare,
      title: isPortuguese ? "Mensagens ilimitadas" : "Unlimited messages",
      description: isPortuguese ? "Sem cobrança por mensagem, envie quantas precisar" : "No per-message charges, send as many as you need",
    },
    {
      icon: Headphones,
      title: isPortuguese ? "Suporte 24/7" : "24/7 Support",
      description: isPortuguese ? "Equipe dedicada pronta para ajudar a qualquer momento" : "Dedicated team ready to help at any time",
    },
    {
      icon: XCircle,
      title: isPortuguese ? "Cancele quando quiser" : "Cancel anytime",
      description: isPortuguese ? "Sem multas, sem fidelidade, sem burocracia" : "No penalties, no commitment, no paperwork",
    },
  ];

  return (
    <>
      <SEO 
        title="Create Account | Hook7 - API WhatsApp"
        description="Crie sua conta Hook7 gratuita and start using the WhatsApp API in minutes."
        canonical="https://app.hook7.com.br/signup"
      />
      <div className="min-h-screen flex bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 pointer-events-none" />

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-10 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>

        <div className="relative flex flex-col lg:flex-row w-full max-w-6xl mx-auto items-center justify-center px-4 py-16 gap-12 lg:gap-20">
          {/* Left side - Benefits */}
          <div className="flex-1 max-w-md space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-3 justify-center lg:justify-start">
                <img 
                  src="/hook7-logo.svg" 
                  alt="Hook7 - API WhatsApp"
                  loading="lazy"
                  width="48"
                  height="48"
                  className="w-12 h-12 object-contain drop-shadow-2xl rounded-full"
                />
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Hook7
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                {isPortuguese ? "Comece a automatizar seu" : "Start automating your"}
                <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  WhatsApp
                </span>
              </h1>
              <p className="text-muted-foreground text-lg">
                {isPortuguese
                  ? "Crie sua conta gratuita e descubra como é fácil integrar o WhatsApp ao seu negócio."
                  : "Create your free account and discover how easy it is to integrate WhatsApp into your business."}
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 text-left">
                  <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{benefit.title}</h3>
                    <p className="text-muted-foreground text-xs">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{isPortuguese ? "Mais de 10.000 mensagens enviadas" : "Over 10,000 messages sent"}</span>
            </div>
          </div>

          {/* Right side - Form */}
          <Card className="w-full max-w-md relative bg-card border-border shadow-xl animate-fade-in">
            <CardContent className="pt-8 pb-6 px-6 md:px-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">{isPortuguese ? "Criar conta" : "Create account"}</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('auth.signupTitle')}
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('auth.namePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-muted/50 border-border/50 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-muted/50 border-border/50 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {isPortuguese ? "WhatsApp (opcional)" : "WhatsApp (optional)"}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={isPortuguese ? "5511999999999" : "5511999999999"}
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="bg-muted/50 border-border/50 pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPortuguese
                      ? "Formato: 55 + DDD + número (ex: 5511999999999)"
                      : "Format: country code + area code + number (e.g. 5511999999999)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('auth.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="bg-muted/50 border-border/50 pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-secondary to-primary hover:opacity-90 transition-opacity" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.creatingAccount')}
                    </>
                  ) : (
                    t('auth.signupButton')
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {t('auth.hasAccount')}{" "}
                <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  {t('auth.loginLink')}
                </Link>
              </div>
              <div className="mt-4 text-center text-xs text-muted-foreground/60">
                {t('common.poweredBy')} <span className="font-medium">S7</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Signup;

