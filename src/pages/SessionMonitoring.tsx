import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, Activity, Zap, AlertCircle, QrCode, Eye } from "lucide-react";
import SessionDetailsModal from "@/components/SessionDetailsModal";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { evolutionApi } from "@/services/evolutionApi";

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  api_token_full: string | null;
  plan: string | null;
  created_at: string;
  updated_at: string;
  api_message_usage: number | null;
  api_message_limit: number | null;
  session_limit: number | null;
  agent_limit: number | null;
  status?: 'online' | 'offline' | 'qrcode' | 'loading' | 'no-session';
  statusMessage?: string;
}

type FilterType = 'all' | 'online' | 'offline' | 'qrcode' | 'no-session';

const SessionMonitoring = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [userEmail, setUserEmail] = useState<string>("");

  // Verificar se é superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Acesso negado");
        navigate("/login");
        return;
      }

      const email = user.email || "";
      setUserEmail(email);

      // Check if user is in superadmin_users table
      const { data: superadminData, error: superadminError } = await supabase
        .from('superadmin_users' as any)
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (superadminError || !superadminData) {
        toast.error("Acesso negado - apenas superadmin");
        navigate("/dashboard");
        return;
      }

      fetchSessions();
    };

    checkSuperAdmin();
  }, [navigate]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Buscar sessões com JOIN em organizations (apenas para plan e limites da org)
      const { data: sessionsData, error } = await supabase
        .from('sessions')
        .select(`
          *,
          organizations (
            name,
            plan,
            session_limit,
            agent_limit
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (sessionsData) {
        const sessionsWithStatus: SessionData[] = (sessionsData as any[]).map(session => ({
          id: session.id,
          name: session.name,
          api_session: session.api_session || null,
          api_token: session.api_token || null,
          api_token_full: session.api_token_full || null,
          plan: session.organizations?.plan || null,
          created_at: session.created_at,
          updated_at: session.updated_at,
          // Usar campos diretamente da sessão
          api_message_usage: session.api_message_usage || 0,
          api_message_limit: session.api_message_limit || 3000,
          session_limit: session.organizations?.session_limit || 0,
          agent_limit: session.organizations?.agent_limit || 0,
          status: 'loading' as const,
          statusMessage: 'Verificando...'
        }));

        setSessions(sessionsWithStatus);

        // Verificar status de cada sessão em paralelo usando Evolution API
        const statusPromises = (sessionsData as any[]).map(async (session) => {
          if (!session.api_session || !session.api_token) {
            return { id: session.id, status: 'no-session' as const, statusMessage: 'Sem sessão ativa' };
          }

          try {
            const result = await evolutionApi.checkConnection(session.api_token);
            
            if (result.message === 'QRCODE') {
              return { id: session.id, status: 'qrcode' as const, statusMessage: 'Aguardando QR Code' };
            }

            return {
              id: session.id,
              status: result.status ? 'online' as const : 'offline' as const,
              statusMessage: result.message || 'Desconhecido'
            };
          } catch (error) {
            return { id: session.id, status: 'offline' as const, statusMessage: 'Erro ao verificar' };
          }
        });

        const statuses = await Promise.all(statusPromises);

        // Atualizar sessões com status
        setSessions(prev => prev.map(session => {
          const statusUpdate = statuses.find(s => s.id === session.id);
          return statusUpdate ? { ...session, ...statusUpdate } : session;
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      toast.error("Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
    toast.success("Sessões atualizadas");
  };

  // Auto-refresh a cada 30 minutos para superadmins
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 1800000);

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (session: SessionData) => {
    setSelectedSession(session);
    setModalOpen(true);
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'offline') return session.status === 'offline' || session.status === 'no-session';
    return session.status === filter;
  });

  const getStatusCount = (status: FilterType) => {
    if (status === 'all') return sessions.length;
    return sessions.filter(s => s.status === status).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Monitoramento de Sessões
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Visão geral de todas as sessões ativas do sistema
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros como Stats Cards */}
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
          onClick={() => setFilter('all')}
          className="cursor-pointer"
        >
          <div className={cn(
            "transition-all duration-200",
            filter === 'all' && "ring-2 ring-primary ring-offset-2"
          )}>
            <StatsCard
              title="Total de Sessões"
              value={getStatusCount('all')}
              icon={Activity}
              color="blue"
            />
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          onClick={() => setFilter('online')}
          className="cursor-pointer"
        >
          <div className={cn(
            "transition-all duration-200",
            filter === 'online' && "ring-2 ring-primary ring-offset-2"
          )}>
            <StatsCard
              title="Online"
              value={getStatusCount('online')}
              icon={Zap}
              subtitle="Conectadas"
              color="green"
            />
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          onClick={() => setFilter('qrcode')}
          className="cursor-pointer"
        >
          <div className={cn(
            "transition-all duration-200",
            filter === 'qrcode' && "ring-2 ring-primary ring-offset-2"
          )}>
            <StatsCard
              title="QR Code"
              value={getStatusCount('qrcode')}
              icon={QrCode}
              subtitle="Aguardando conexão"
              color="orange"
            />
          </div>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
          onClick={() => setFilter('offline')}
          className="cursor-pointer"
        >
          <div className={cn(
            "transition-all duration-200",
            filter === 'offline' && "ring-2 ring-primary ring-offset-2"
          )}>
            <StatsCard
              title="Offline"
              value={getStatusCount('offline') + getStatusCount('no-session')}
              icon={AlertCircle}
              subtitle="Desconectadas"
              color="purple"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Tabela de Sessões */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Nenhuma sessão encontrada com este filtro
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>API Session</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Última Ação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => {
                  const getStatusBadge = () => {
                    switch (session.status) {
                      case 'online':
                        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">🟢 Online</Badge>;
                      case 'qrcode':
                        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">🟡 QR Code</Badge>;
                      case 'offline':
                        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">🔴 Offline</Badge>;
                      case 'no-session':
                        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">⚪ Sem Sessão</Badge>;
                      default:
                        return <Badge variant="secondary">⚫ Carregando...</Badge>;
                    }
                  };

                  return (
                    <TableRow key={session.id} className="hover:bg-muted/50">
                      <TableCell>{getStatusBadge()}</TableCell>
                      <TableCell className="font-medium">{session.name || 'Sem nome'}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {session.api_session || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.plan || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(session.updated_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCardClick(session)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <SessionDetailsModal
        session={selectedSession}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default SessionMonitoring;
