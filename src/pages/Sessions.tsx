import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateSessionModal from "@/components/CreateSessionModal";
import SessionQrModal from "@/components/SessionQrModal";
import { SessionsGrid } from "@/components/dashboard/SessionsGrid";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { toast } from "sonner";
import { MessageSquare, Zap, Clock, AlertTriangle, Plus } from "lucide-react";
import { motion } from "framer-motion";
import * as evolutionApi from "@/services/evolutionApi";
import { NormalizedConnectionStatus, isValidEvolutionToken } from "@/services/evolutionApi";

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  api_token_full: string | null;
  status: string | null;
  qr: string | null;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
  requires_subscription?: boolean;
  pairing_code?: string | null;
  webhook_url?: string | null;
  webhook_enabled?: boolean;
  webhook_events?: string[];
}

interface SessionStatus {
  status: boolean;
  message?: string;
  qrCode?: string;
  pairingCode?: string;
}

interface OrgData {
  id: string;
  name: string;
  plan: string | null;
  session_limit: number | null;
  is_legacy: boolean;
}

const Sessions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionsStatus, setSessionsStatus] = useState<Record<string, SessionStatus>>({});
  const [creatingSession, setCreatingSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [qrExpiresIn, setQrExpiresIn] = useState<number | null>(null);
  const [generatingQrCode, setGeneratingQrCode] = useState(false);
  const [qrCodeKey, setQrCodeKey] = useState<string>("");
  const [reconfiguringSession, setReconfiguringSession] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      if (!userRecord.organization_id) {
        toast.error(t('sessions.organizationNotFound'));
        navigate("/dashboard");
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userRecord.organization_id)
        .single();

      if (orgError) throw orgError;
      
      const orgDataTyped: OrgData = {
        id: org.id,
        name: org.name,
        plan: org.plan,
        session_limit: org.session_limit,
        is_legacy: (org as any).is_legacy || false
      };
      
      setOrgData(orgDataTyped);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('organization_id', userRecord.organization_id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      } else if (sessionsData && sessionsData.length > 0) {
        const typedSessions: SessionData[] = sessionsData.map((s: any) => ({
          id: s.id,
          name: s.name,
          api_session: s.api_session,
          api_token: s.api_token,
          api_token_full: s.api_token_full,
          status: s.status,
          qr: s.qr,
          organization_id: s.organization_id,
          created_at: s.created_at,
          updated_at: s.updated_at,
          requires_subscription: s.requires_subscription,
          pairing_code: s.pairing_code,
          webhook_url: s.webhook_url,
          webhook_enabled: s.webhook_enabled,
          webhook_events: s.webhook_events
        }));
        
        setSessions(typedSessions);
        
        await Promise.all(
          typedSessions.map(async (session) => {
            if (session.api_session && session.api_token) {
              await fetchSessionStatus(session.id, session.api_session, session.api_token);
            }
          })
        );
      }
    } catch (error: any) {
      console.error("❌ Error fetching data:", error);
      toast.error(`${t('dashboard.errorLoadingData')}: ${error.message || t('common.error')}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStatus = async (sessionId: string, apiSession: string, apiToken: string) => {
    try {
      const result = await evolutionApi.checkConnection(apiToken);
      setSessionsStatus(prev => ({
        ...prev,
        [sessionId]: result
      }));
    } catch (error) {
      console.error(`Error fetching session status for ${sessionId}:`, error);
      setSessionsStatus(prev => ({
        ...prev,
        [sessionId]: { status: false, message: 'Offline' }
      }));
    }
  };

  const checkConnectionStatus = useCallback(async (sessionId: string, apiSession: string, apiToken: string) => {
    try {
      const result = await evolutionApi.checkConnection(apiToken);
      
      setSessionsStatus(currentStatus => {
        const current = currentStatus[sessionId];
        if (result.status === true) {
          return { ...currentStatus, [sessionId]: result };
        }
        if (!current?.qrCode) {
          return { ...currentStatus, [sessionId]: result };
        }
        return currentStatus;
      });
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
    }
  }, []);

  const handleReconfigureSession = async (session: SessionData) => {
    setReconfiguringSession(session.id);
    
    try {
      toast.info(t('sessions.reconfiguringSession'));
      
      const { data, error } = await supabase.functions.invoke('generate-whatsapp-token', {
        body: { session_name: session.name }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(t('sessions.sessionReconfigured'));
        await fetchSessions();
      } else {
        throw new Error(data.error || t('sessions.reconfigureError'));
      }
    } catch (error: any) {
      console.error('Erro ao reconfigurar sessão:', error);
      toast.error(error.message || t('sessions.reconfigureError'));
    } finally {
      setReconfiguringSession(null);
    }
  };

  const handleStartSession = useCallback(async (session: SessionData) => {
    // Verificar se o token é válido para Evolution API
    if (session.api_token && !isValidEvolutionToken(session.api_token)) {
      toast.warning(t('sessions.outdatedToken'));
      await handleReconfigureSession(session);
      return;
    }

    // Validar se precisa de assinatura
    if (session.requires_subscription) {
      const { data: subscription } = await supabase
        .from('subscriptions' as any)
        .select('status')
        .eq('session_id', session.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!subscription) {
        toast.error(t('sessions.subscriptionRequired'));
        navigate(`/checkout?session_name=${session.name}`);
        return;
      }
    }

    // Se não tem api_session ainda, gerar token primeiro
    if (!session.api_session) {
      toast.info(t('sessions.configuringSession'));
      setStartingSession(true);
      
      try {
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
          'generate-whatsapp-token',
          { body: { session_name: session.name } }
        );
        
        if (tokenError || !tokenData.success) {
          throw new Error(tokenError?.message || t('sessions.configuringError'));
        }
        
        toast.success(t('sessions.sessionConfigured'));
        await fetchSessions();
        return;
      } catch (error: any) {
        console.error('Erro ao configurar sessão:', error);
        toast.error(error.message || t('sessions.configuringError'));
        return;
      } finally {
        setStartingSession(false);
      }
    }

    if (!session.api_token) {
      toast.error(t('sessions.tokenNotFound'));
      return;
    }
    
    setStartingSession(true);
    setGeneratingQrCode(true);
    setSelectedSession(session);
    setShowSessionModal(true);
    
    try {
      toast.info(t('sessions.connectingApi'));
      
      // Usar Evolution API para conectar e obter QR Code
      const qrData = await evolutionApi.connectInstance(session.api_token);
      
      if (qrData) {
        // Salvar pairing code se disponível
        if (qrData.pairingCode) {
          await supabase
            .from('sessions')
            .update({ pairing_code: qrData.pairingCode } as any)
            .eq('id', session.id);
          console.log('Pairing code salvo:', qrData.pairingCode);
        }

        // QR Code vem em base64 diretamente da Evolution API
        if (qrData.base64) {
          setSessionsStatus(prev => ({
            ...prev,
            [session.id]: {
              status: false,
              message: 'qrcode',
              qrCode: qrData.base64,
              pairingCode: qrData.pairingCode
            }
          }));
          setQrCodeKey(Date.now().toString());
          setGeneratingQrCode(false);
          toast.success(t('sessions.qrGenerated'));
          
          // Atualizar timestamp da última ação
          await supabase
            .from('sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', session.id);
        } else {
          // Se não veio QR, aguardar um pouco e buscar novamente
          toast.info("Aguardando QR Code...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const retryQr = await evolutionApi.fetchQRCode(session.api_token);
          if (retryQr?.base64) {
            setSessionsStatus(prev => ({
              ...prev,
              [session.id]: {
                status: false,
                message: 'qrcode',
                qrCode: retryQr.base64,
                pairingCode: retryQr.pairingCode
              }
            }));
            setQrCodeKey(Date.now().toString());
            setGeneratingQrCode(false);
            toast.success(t('sessions.qrGenerated'));
          } else {
            throw new Error(t('sessions.qrNotAvailable'));
          }
        }
      } else {
        throw new Error(t('sessions.evolutionConnectionError'));
      }
      
    } catch (error: any) {
      console.error('Erro ao iniciar sessão:', error);
      toast.error(error.message || t('sessions.startSessionError'));
      setGeneratingQrCode(false);
      setShowSessionModal(false);
    } finally {
      setStartingSession(false);
    }
  }, [navigate]);

  const handleQrExpiration = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) return;
    
    try {
      const result = await evolutionApi.checkConnection(session.api_token);
      
      if (result.status === false) {
        setSessionsStatus(prev => ({
          ...prev,
          [session.id]: {
            status: false,
            message: 'Disconnected'
          }
        }));
        
        setShowSessionModal(false);
        setSelectedSession(null);
        
        toast.info(
          t('sessions.qrExpiredMessage'),
          { duration: 5000 }
        );
      } else if (result.status === true) {
        setSessionsStatus(prev => ({
          ...prev,
          [session.id]: result
        }));
        toast.success(t('sessions.sessionConnectedSuccess'));
      }
    } catch (error) {
      console.error('Erro ao verificar status na expiração:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (sessions.length === 0) return;
    
    const intervalId = setInterval(() => {
      sessions.forEach(session => {
        if (session.api_session && session.api_token) {
          checkConnectionStatus(session.id, session.api_session, session.api_token);
        }
      });
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [sessions, checkConnectionStatus]);

  useEffect(() => {
    if (!selectedSession || !showSessionModal) return;
    
    const sessionStatus = sessionsStatus[selectedSession.id];
    
    if (sessionStatus?.status === false && (generatingQrCode || sessionStatus.qrCode)) {
      const intervalId = setInterval(async () => {
        if (!selectedSession.api_session || !selectedSession.api_token) return;
        
        try {
          const qrData = await evolutionApi.fetchQRCode(selectedSession.api_token);
          
          if (qrData?.base64) {
            setSessionsStatus(prev => ({
              ...prev,
              [selectedSession.id]: {
                status: false,
                message: 'qrcode',
                qrCode: qrData.base64,
                pairingCode: qrData.pairingCode
              }
            }));
            setGeneratingQrCode(false);
          }
        } catch (error) {
          console.error('Erro no polling de QR Code:', error);
        }
      }, 5000);
      
      return () => clearInterval(intervalId);
    }
  }, [selectedSession, showSessionModal, sessionsStatus, generatingQrCode]);

  useEffect(() => {
    if (selectedSession && sessionsStatus[selectedSession.id]?.qrCode && qrCodeKey) {
      setQrExpiresIn(120);
      
      const intervalId = setInterval(() => {
        setQrExpiresIn(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(intervalId);
            
            if (selectedSession) {
              handleQrExpiration(selectedSession);
            }
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(intervalId);
    } else {
      setQrExpiresIn(null);
    }
  }, [selectedSession, qrCodeKey]);

  const handleCreateSession = async (sessionName: string) => {
    if (!orgData) return;
    
    if (orgData.is_legacy) {
      const activeSessionsCount = sessions.length;
      if (orgData.session_limit && activeSessionsCount >= orgData.session_limit) {
        toast.error(t('sessions.limitReached', { limit: orgData.session_limit }));
        return;
      }
      
      setCreatingSession(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-whatsapp-token', {
          body: { session_name: sessionName }
        });

        if (error) throw error;

        if (data.success && data.session_id) {
          await fetchSessions();
          setShowCreateSessionModal(false);
          toast.success(t('sessions.sessionCreatedSuccess'));
        } else {
          throw new Error(data.error || t('sessions.tokenError'));
        }
      } catch (error: any) {
        console.error("Erro ao criar sessão:", error);
        toast.error(error.message || t('sessions.startSessionError'));
      } finally {
        setCreatingSession(false);
      }
      return;
    }
    
    // Primeiro criar a sessão para obter o ID, depois redirecionar com ambos parâmetros
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userRecord?.organization_id) return;

      // Verificar se sessão já existe
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('name', sessionName)
        .eq('organization_id', userRecord.organization_id)
        .maybeSingle();

      if (existingSession) {
        // Sessão já existe, redirecionar com ID
        toast.info(t('sessions.configurePayment'));
        navigate(`/checkout?session_id=${existingSession.id}&session_name=${encodeURIComponent(sessionName)}`);
      } else {
        // Criar nova sessão pendente
        const { data: newSession, error } = await supabase
          .from('sessions')
          .insert({
            name: sessionName,
            organization_id: userRecord.organization_id,
            requires_subscription: true,
            status: 'pending_payment'
          })
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar sessão:', error);
          toast.error(t('sessions.startSessionError'));
          return;
        }

        toast.info(t('sessions.configurePayment'));
        navigate(`/checkout?session_id=${newSession.id}&session_name=${encodeURIComponent(sessionName)}`);
      }
    } catch (error) {
      console.error('Erro ao preparar checkout:', error);
      toast.error(t('sessions.startSessionError'));
    }
  };

  const handleRefreshQr = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) {
      toast.error(t('sessions.sessionNotFound'));
      return;
    }
    
    setRefreshingQr(true);
    setGeneratingQrCode(true);
    
    try {
      toast.info(t('sessions.fetchingQr'));
      
      const qrData = await evolutionApi.fetchQRCode(session.api_token);
      
      if (qrData?.base64) {
        setSessionsStatus(prev => ({
          ...prev,
          [session.id]: {
            status: false,
            message: 'qrcode',
            qrCode: qrData.base64,
            pairingCode: qrData.pairingCode
          }
        }));
        setQrCodeKey(Date.now().toString());
        setGeneratingQrCode(false);
        toast.success(t('sessions.qrUpdated'));
        
        // Atualizar timestamp da última ação
        await supabase
          .from('sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', session.id);
      } else {
        throw new Error(t('sessions.qrNotAvailable'));
      }
      
    } catch (error: any) {
      console.error('Erro ao atualizar QR Code:', error);
      toast.error(error.message || t('sessions.qrUpdateError'));
      setGeneratingQrCode(false);
    } finally {
      setRefreshingQr(false);
    }
  };

  const handleCloseSession = async (session: SessionData) => {
    if (!session.api_session || !session.api_token) {
      toast.error(t('sessions.sessionNotFound'));
      return;
    }
    
    setClosingSession(true);
    
    try {
      const success = await evolutionApi.logoutInstance(session.api_token);
      
      if (success) {
        setSessionsStatus(prev => ({
          ...prev,
          [session.id]: { status: false, message: 'offline' }
        }));
        
        toast.success(t('sessions.sessionDisconnected'));
        await fetchSessions();
      } else {
        throw new Error(t('sessions.disconnectError'));
      }
    } catch (error: any) {
      console.error('Erro ao fechar sessão:', error);
      toast.error(error.message || t('sessions.disconnectError'));
    } finally {
      setClosingSession(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Bloquear deleção de sessões com pagamento pendente
    if (session.status === 'pending_payment') {
      toast.warning(t('sessions.pendingPaymentDelete'));
      return;
    }
    
    // Verificar se existe checkout pendente no Stripe para esta sessão
    const { data: pendingSub } = await supabase
      .from('subscriptions' as any)
      .select('status')
      .eq('session_id', sessionId)
      .eq('status', 'pending')
      .maybeSingle();
      
    if (pendingSub) {
      toast.warning(t('sessions.pendingPaymentDelete'));
      return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir a sessão "${session.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setLoggingOut(true);
    
    try {
      if (session.api_session && session.api_token) {
        // PASSO 1: Logout da instância
        try {
          console.log('🔒 Fazendo logout da instância:', session.api_session);
          await evolutionApi.logoutInstance(session.api_token);
          console.log('✅ Logout realizado');
        } catch (logoutError) {
          console.warn('⚠️ Erro ao fazer logout (continuando):', logoutError);
        }

        // PASSO 2: Deletar instância
        try {
          console.log('🗑️ Deletando instância:', session.api_session);
          await evolutionApi.deleteInstance(session.api_session, session.api_token);
          console.log('✅ Instância deletada');
        } catch (deleteError) {
          console.warn('⚠️ Erro ao deletar instância (continuando):', deleteError);
        }
      }
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id);
      
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== session.id));
      
      if (selectedSession?.id === session.id) {
        setSelectedSession(null);
        setShowSessionModal(false);
      }
      
      toast.success("Sessão excluída com sucesso!");
      
    } catch (error: any) {
      console.error('Erro ao excluir sessão:', error);
      toast.error(error.message || "Erro ao excluir sessão");
    } finally {
      setLoggingOut(false);
    }
  };

  const activeSessions = sessions.filter(s => sessionsStatus[s.id]?.status === true);
  const qrCodeSessions = sessions.filter(s => sessionsStatus[s.id]?.qrCode || sessionsStatus[s.id]?.message?.toUpperCase() === 'QRCODE');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <CreateSessionModal
        open={showCreateSessionModal}
        onSessionCreated={(sessionName) => handleCreateSession(sessionName)}
        onClose={() => setShowCreateSessionModal(false)}
        isCreating={creatingSession}
      />

      <SessionQrModal
        session={selectedSession}
        status={selectedSession ? sessionsStatus[selectedSession.id] : null}
        open={showSessionModal}
        onClose={() => {
          setShowSessionModal(false);
          setQrExpiresIn(null);
          setQrCodeKey("");
        }}
        onRefreshQr={() => selectedSession && handleRefreshQr(selectedSession)}
        onCloseSession={() => selectedSession && handleCloseSession(selectedSession)}
        onLogoutSession={() => selectedSession && handleDeleteSession(selectedSession.id)}
        refreshingQr={refreshingQr}
        closingSession={closingSession}
        loggingOut={loggingOut}
        generatingQrCode={generatingQrCode}
        qrExpiresIn={qrExpiresIn}
      />

      {/* Header with New Session Button */}
      <motion.div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sessions.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('sessions.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateSessionModal(true)}
          size="lg"
          className="gap-2 shadow-lg hover:shadow-xl transition-all"
          disabled={creatingSession}
        >
          <Plus className="h-5 w-5" />
          {t('sessions.newSession')}
        </Button>
      </motion.div>

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
            title="Sessões Ativas"
            value={activeSessions.length}
            icon={Zap}
            subtitle={`${activeSessions.length} de ${sessions.length} online`}
            color="green"
            progress={sessions.length > 0 ? (activeSessions.length / sessions.length) * 100 : 0}
          />
        </motion.div>

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
            subtitle={`Limite: ${orgData?.session_limit || '∞'}`}
            color="blue"
            progress={orgData?.session_limit ? (sessions.length / orgData.session_limit) * 100 : 0}
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            show: { opacity: 1, y: 0 }
          }}
        >
          <StatsCard
            title="Aguardando QR"
            value={qrCodeSessions.length}
            icon={Clock}
            subtitle="Esperando conexão"
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
            title="Limite Disponível"
            value={orgData?.session_limit ? Math.max(0, orgData.session_limit - sessions.length) : '∞'}
            icon={AlertTriangle}
            subtitle={orgData?.is_legacy ? "Cliente Legacy" : "Slots restantes"}
            color="purple"
          />
        </motion.div>
      </motion.div>

      {/* Sessions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Minhas Sessões WhatsApp</CardTitle>
            <CardDescription>
              {sessions.length}/{orgData?.session_limit || '∞'} sessões criadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionsGrid
              sessions={sessions}
              sessionStatuses={sessionsStatus}
              onViewQr={(session) => {
                setSelectedSession(session);
                setShowSessionModal(true);
              }}
              onStartSession={handleStartSession}
              onDeleteSession={handleDeleteSession}
              loading={loading}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Sessions;
