import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        toast.success(t('auth.loginSuccess'));
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Login | Hook7"
        description="Acesse sua conta Hook7 e gerencie suas sessões de API WhatsApp."
        canonical="https://app.hook7.com.br/login"
        noindex={true}
      />
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,hsl(262_83%_62%/0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse,hsl(217_91%_60%/0.08),transparent_70%)] pointer-events-none" />
        
        {/* Back to landing */}
        <a 
          href="https://hook7.com.br" 
          className="absolute top-6 left-6 text-sm text-muted-foreground hover:text-foreground transition-colors z-10 flex items-center gap-1.5"
        >
          ← {t('nav.back')}
        </a>

        {/* Login Card */}
        <div className="w-full max-w-md relative animate-fade-in">
          <div className="glass-card p-8 space-y-6">
            {/* Logo + Title */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow" />
                <img 
                  src="/hook7-logo.svg" 
                  alt="Hook7"
                  width="80"
                  height="80"
                  className="w-full h-full object-contain drop-shadow-2xl animate-scale-in rounded-full relative"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t('auth.loginTitle')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('auth.loginSubtitle')}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10 bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-colors"
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
              <div className="flex items-center justify-end">
                <Link 
                  to="/reset-password" 
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 hook7-btn-glow text-white font-semibold" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.loggingIn')}
                  </>
                ) : (
                  t('auth.loginButton')
                )}
              </Button>
            </form>

            {/* Footer links */}
            <div className="space-y-3 pt-2">
              <div className="text-center text-sm text-muted-foreground">
                {t('auth.noAccount')}{" "}
                <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  {t('auth.signupLink')}
                </Link>
              </div>
              <div className="text-center text-xs text-muted-foreground/50">
                {t('common.poweredBy')} <span className="font-medium">S7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;