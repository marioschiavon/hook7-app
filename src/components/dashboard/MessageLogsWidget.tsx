import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, AlertCircle, ArrowRight, BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface MessageLog {
  id: string;
  phone_number: string;
  type: string;
  status: string;
  created_at: string;
}

interface MessageLogsWidgetProps {
  organizationId: string;
}

export const MessageLogsWidget = ({ organizationId }: MessageLogsWidgetProps) => {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sent: 0, limit: 0, isUnlimited: true });
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogsAndStats();
  }, [organizationId]);

  const fetchLogsAndStats = async () => {
    setLoading(true);
    try {
      // Fetch session stats
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, messages_sent_this_month, message_limit")
        .eq("organization_id", organizationId);

      if (sessionsError) throw sessionsError;

      let totalSent = 0;
      let totalLimit = 0;
      let hasUnlimited = false;

      const sessionIds: string[] = [];

      sessionsData?.forEach((session: any) => {
        sessionIds.push(session.id);
        totalSent += session.messages_sent_this_month || 0;
        if (session.message_limit === -1) {
          hasUnlimited = true;
        } else {
          totalLimit += session.message_limit || 0;
        }
      });

      setStats({
        sent: totalSent,
        limit: totalLimit,
        isUnlimited: hasUnlimited
      });

      // Fetch recent logs
      if (sessionIds.length > 0) {
        const { data: logsData, error: logsError } = await supabase
          .from("message_logs")
          .select("*")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (logsError) throw logsError;
        setLogs(logsData || []);
      }
    } catch (error) {
      console.error("Error fetching message logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Skeleton className="w-full h-64 rounded-xl" />;
  }

  const progressPercentage = stats.isUnlimited ? 0 : Math.min((stats.sent / Math.max(stats.limit, 1)) * 100, 100);
  const isNearLimit = !stats.isUnlimited && progressPercentage > 85;

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-gradient-to-br from-card to-muted/20 border-muted-foreground/10 overflow-hidden shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              Uso de Mensagens
            </CardTitle>
            <CardDescription>Resumo de envios deste mês</CardDescription>
          </div>
          {isNearLimit && (
            <Badge variant="destructive" className="animate-pulse">
              Limite Próximo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado Esquerdo: Progresso e Upgrade */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Mensagens Enviadas</span>
              <span className="font-bold">
                {stats.sent} / {stats.isUnlimited ? "Ilimitado" : stats.limit}
              </span>
            </div>
            {!stats.isUnlimited && (
              <Progress 
                value={progressPercentage} 
                className={`h-2.5 ${isNearLimit ? "bg-red-100 dark:bg-red-950" : ""}`}
                indicatorColor={isNearLimit ? "bg-red-500" : "bg-primary"}
              />
            )}
          </div>

          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Precisa de mais limite?</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
                  Evite bloqueios. Faça o upgrade do seu plano para aumentar o limite de mensagens das suas sessões.
                </p>
                <Button size="sm" variant="default" className="w-full text-xs" onClick={() => navigate("/plans")}>
                  Ver Planos <ArrowRight className="w-3 h-3 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Logs Recentes */}
        <div>
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            Últimos Envios
          </h4>
          
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                Nenhum envio recente registrado.
              </div>
            ) : (
              logs.map((log) => (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={log.id} 
                  className="flex items-center justify-between p-2.5 rounded-lg bg-background border text-sm"
                >
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="font-medium truncate">{log.phone_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-[10px] uppercase h-5">
                    {log.status === 'sent' ? 'Enviado' : 'Erro'}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
