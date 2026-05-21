import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink,
  AlertTriangle,
  MessageSquare,
  DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionWithSubscription {
  id: string;
  name: string;
  created_at: string;
  requires_subscription: boolean;
  subscription?: {
    id: string;
    status: string;
    amount: number;
    next_payment_date: string | null;
    created_at: string;
    stripe_customer_id?: string;
    cancel_at_period_end?: boolean;
    current_period_end?: string;
  };
}

const Subscriptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionWithSubscription[]>([]);
  const [isLegacy, setIsLegacy] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Buscar organização do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (userError || !userData?.organization_id) {
        toast.error("Organização não encontrada");
        navigate("/dashboard");
        return;
      }

      setOrganizationId(userData.organization_id);

      // Verificar se é cliente legacy
      const { data: orgData } = await supabase
        .from("organizations")
        .select("is_legacy")
        .eq("id", userData.organization_id)
        .single();

      setIsLegacy((orgData as any)?.is_legacy || false);

      // Buscar todas as sessões
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Buscar assinaturas de cada sessão
      const sessionsWithSubs: SessionWithSubscription[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const { data: subData } = await supabase
            .from("subscriptions" as any)
            .select("*")
            .eq("session_id", session.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: session.id,
            name: session.name || "",
            created_at: session.created_at,
            requires_subscription: (session as any).requires_subscription ?? true,
            subscription: subData ? {
              id: (subData as any).id,
              status: (subData as any).status,
              amount: (subData as any).amount,
              next_payment_date: (subData as any).next_payment_date,
              created_at: (subData as any).created_at,
              stripe_customer_id: (subData as any).stripe_customer_id,
              cancel_at_period_end: (subData as any).cancel_at_period_end,
              current_period_end: (subData as any).current_period_end,
            } : undefined,
          };
        })
      );

      setSessions(sessionsWithSubs);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (session: SessionWithSubscription) => {
    if (!session.requires_subscription) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Liberada
        </Badge>
      );
    }

    if (!session.subscription) {
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando Pagamento
        </Badge>
      );
    }

    // Badge especial para cancelamento agendado
    if (session.subscription.status === "active" && session.subscription.cancel_at_period_end) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Cancelamento Agendado
        </Badge>
      );
    }

    switch (session.subscription.status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Pagamento Pendente
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case "cancelled":
      case "paused":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {session.subscription.status}
          </Badge>
        );
    }
  };

  const handleManageSubscription = async (customerId?: string) => {
    if (!customerId) {
      toast.error('ID do cliente não encontrado');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-portal', {
        body: { customer_id: customerId }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao abrir portal:', error);
      toast.error('Erro ao abrir portal de gerenciamento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando assinaturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Minhas Assinaturas</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie suas sessões e assinaturas do Hook7
        </p>
      </div>

      {/* Cliente Legacy Alert */}
      {isLegacy && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Cliente Legacy:</strong> Você possui acesso especial sem cobrança por sessão.
            Suas sessões foram criadas antes do novo modelo de assinatura.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title="Total de Sessões"
            value={sessions.length}
            icon={MessageSquare}
            color="blue"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title="Assinaturas Ativas"
            value={sessions.filter(s => 
              (s.subscription?.status === "active" && !s.subscription?.cancel_at_period_end) || 
              !s.requires_subscription
            ).length}
            icon={CheckCircle2}
            subtitle="Sem cancelamento agendado"
            color="green"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title="Pendentes"
            value={sessions.filter(s => 
              s.requires_subscription && !s.subscription
            ).length}
            icon={Clock}
            subtitle="Aguardando pagamento"
            color="orange"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title="Custo Mensal"
            value={isLegacy ? "Grátis" : `R$ ${(sessions.filter(s => s.subscription?.status === "active").length * 69.90).toFixed(2)}`}
            icon={DollarSign}
            subtitle={isLegacy ? "Cliente Legacy" : "Total das assinaturas"}
            color="purple"
          />
        </motion.div>
      </motion.div>

      {/* Sessions List */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não possui nenhuma sessão
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Criar Primeira Sessão
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{session.name}</CardTitle>
                        {getStatusBadge(session)}
                      </div>
                      <CardDescription>
                        Criada em {format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Separator className="mb-4" />

                  {/* Aviso de Cancelamento Agendado */}
                  {session.subscription?.status === "active" && session.subscription?.cancel_at_period_end && (
                    <Alert className="border-orange-200 bg-orange-50 mb-4">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="space-y-3">
                          <div>
                            <p className="font-semibold mb-2">⚠️ Cancelamento Agendado</p>
                            <p className="mb-2">
                              Você cancelou esta assinatura, mas ela continuará ativa até{" "}
                              <strong>
                                {session.subscription.current_period_end && 
                                  format(new Date(session.subscription.current_period_end), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </strong>
                            </p>
                            <p className="text-sm mb-3">
                              Após essa data, a sessão será desconectada automaticamente e você precisará reativar a assinatura para voltar a usar.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManageSubscription(
                              session.subscription?.stripe_customer_id
                            )}
                            className="border-orange-300"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Reverter Cancelamento
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Informações da Assinatura */}
                  {session.subscription ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
                          <p className="text-lg font-semibold">
                            R$ {session.subscription.amount.toFixed(2)}
                          </p>
                        </div>

                        {session.subscription.next_payment_date && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Próxima Cobrança</p>
                            <p className="text-lg font-semibold">
                              {format(new Date(session.subscription.next_payment_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {session.subscription.status === "past_due" && (
                        <div className="space-y-3">
                          <Alert className="border-red-300 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <div className="space-y-3">
                                <div>
                                  <p className="font-semibold mb-2">⚠️ Pagamento Não Processado</p>
                                  <p className="mb-2">
                                    Seu último pagamento não foi processado. Atualize seu método de pagamento para evitar a desconexão da sessão.
                                  </p>
                                  <p className="text-sm mb-3">
                                    Acesse o portal do Stripe para atualizar seu cartão de crédito. O pagamento será processado automaticamente após a atualização.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleManageSubscription(
                                      session.subscription?.stripe_customer_id
                                    )}
                                    disabled={!session.subscription?.stripe_customer_id}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Atualizar Pagamento
                                  </Button>
                                  {session.subscription?.stripe_customer_id && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleManageSubscription(
                                        session.subscription?.stripe_customer_id
                                      )}
                                      className="border-red-300"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Gerenciar no Portal
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      {session.subscription.status === "active" && (
                        <div className="flex flex-col gap-3">
                          <Button
                            variant="outline"
                            onClick={() => handleManageSubscription(
                              session.subscription?.stripe_customer_id
                            )}
                            disabled={!session.subscription?.stripe_customer_id}
                            className="w-full"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Gerenciar Assinatura
                          </Button>
                          <div className="text-xs text-muted-foreground text-center">
                            Use o portal para cancelar ou atualizar método de pagamento
                          </div>
                        </div>
                      )}

                      {session.subscription.status === "pending" && (
                        <div className="space-y-3">
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                              Aguardando confirmação de pagamento. Isso pode levar alguns minutos.
                            </AlertDescription>
                          </Alert>
                          {session.subscription?.stripe_customer_id && (
                            <Button
                              variant="outline"
                              onClick={() => handleManageSubscription(
                                session.subscription?.stripe_customer_id
                              )}
                              className="w-full"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Gerenciar no Portal
                            </Button>
                          )}
                        </div>
                      )}

                      {(session.subscription.status === "cancelled" || session.subscription.status === "paused") && (
                        <div className="space-y-3">
                          <Alert className="border-red-200 bg-red-50">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-800">
                              <p className="mb-3">Esta assinatura foi cancelada. A sessão não pode ser utilizada.</p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => navigate(`/checkout?session_id=${session.id}&session_name=${encodeURIComponent(session.name)}`)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Reativar Assinatura
                                </Button>
                                {session.subscription?.stripe_customer_id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleManageSubscription(
                                      session.subscription?.stripe_customer_id
                                    )}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Gerenciar no Portal
                                  </Button>
                                )}
                              </div>
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  ) : session.requires_subscription ? (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <div className="flex flex-col gap-3">
                          <p>Esta sessão ainda não possui assinatura ativa.</p>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/checkout?session_id=${session.id}&session_name=${encodeURIComponent(session.name)}`)}
                            className="bg-primary hover:bg-primary/90 w-fit"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Ativar Assinatura (R$ 69,90/mês)
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Esta sessão está liberada e não requer assinatura.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Help Section */}
      <Card className="mt-8 border-primary/20 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Como Funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
              1
            </div>
            <div>
              <p className="font-medium text-foreground">Gerenciar Assinatura</p>
              <p className="text-muted-foreground">
                Clique no botão "Gerenciar Assinatura" para acessar o portal do Stripe onde você pode cancelar, atualizar método de pagamento ou ver histórico de cobranças.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
              2
            </div>
            <div>
              <p className="font-medium text-foreground">Assinaturas Independentes</p>
              <p className="text-muted-foreground">
                Cada sessão possui uma assinatura separada de R$ 69,90/mês. Cancelar uma não afeta as outras.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
              3
            </div>
            <div>
              <p className="font-medium text-foreground">Cancelamento e Período de Uso</p>
              <p className="text-muted-foreground">
                Ao cancelar, você pode usar a sessão até o fim do período já pago (30 dias). Após essa data, a sessão será desconectada automaticamente.
                Após cancelar, a sessão permanece ativa até o fim do período pago. Depois disso, será desconectada automaticamente. Você pode reativar a qualquer momento.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 font-semibold text-xs">
              ✓
            </div>
            <div>
              <p className="font-medium text-foreground">Reativação Instantânea</p>
              <p className="text-muted-foreground">
                Sessões canceladas podem ser reativadas imediatamente clicando em "Reativar Assinatura".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Subscriptions;

