import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, Info, Webhook, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  notification_phone?: string | null;
  status?: 'online' | 'offline' | 'qrcode' | 'loading' | 'no-session';
  statusMessage?: string;
  webhook_url?: string | null;
  webhook_enabled?: boolean;
  webhook_events?: string[];
}

interface SessionDetailsModalProps {
  session: SessionData | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const WEBHOOK_EVENTS = [
  { id: 'MESSAGES_UPSERT', required: true },
  { id: 'MESSAGES_UPDATE', required: false },
  { id: 'CONNECTION_UPDATE', required: false },
] as const;

const SessionDetailsModal = ({ session, open, onClose, onRefresh }: SessionDetailsModalProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('pt') ? ptBR : enUS;

  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['MESSAGES_UPSERT']);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session) {
      const defaultUrl = session.webhook_url || '';
      setWebhookUrl(session.webhook_url || defaultUrl);
      setSelectedEvents(session.webhook_events?.length ? session.webhook_events : ['MESSAGES_UPSERT']);
    }
  }, [session]);

  if (!session) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const toggleEvent = (eventId: string) => {
    if (eventId === 'MESSAGES_UPSERT') return; // Cannot disable required event
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(e => e !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl.startsWith('https://')) {
      toast.error(t('webhooks.httpsRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error(t('auth.loginRequired'));
        return;
      }

      const response = await supabase.functions.invoke('hook7-update-webhook', {
        body: {
          session_id: session.id,
          webhook_url: webhookUrl,
          webhook_enabled: true,
          webhook_events: selectedEvents,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(t('webhooks.saveSuccess'));
      onRefresh?.();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      toast.error(t('webhooks.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusConfig = () => {
    switch (session.status) {
      case 'online':
        return {
          color: 'bg-primary',
          textColor: 'text-primary',
          bgColor: 'bg-primary/10',
          label: 'Online',
          emoji: '🟢'
        };
      case 'qrcode':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950',
          label: 'QR Code',
          emoji: '🟡'
        };
      case 'offline':
        return {
          color: 'bg-destructive',
          textColor: 'text-destructive',
          bgColor: 'bg-destructive/10',
          label: 'Offline',
          emoji: '🔴'
        };
      default:
        return {
          color: 'bg-muted',
          textColor: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Desconhecido',
          emoji: '⚪'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const usagePercentage = session.api_message_limit
    ? Math.round(((session.api_message_usage || 0) / session.api_message_limit) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {t('sessions.sessionDetails') || 'Detalhes da Sessão'}: {session.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t('common.info') || 'Informações'}
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6 mt-4">
            {/* Status */}
            <div>
              <h3 className="font-semibold mb-2">Status</h3>
              <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 text-base px-4 py-2`}>
                <span className={`inline-block w-3 h-3 rounded-full ${statusConfig.color} mr-2 animate-pulse`} />
                {statusConfig.label}
              </Badge>
              {session.statusMessage && (
                <p className="text-sm text-muted-foreground mt-2">
                  {session.statusMessage}
                </p>
              )}
            </div>

            {/* Informações Gerais */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📋 {t('common.generalInfo') || 'Informações Gerais'}
              </h3>
              <div className="space-y-2 text-sm bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono text-xs">{session.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.name') || 'Nome'}:</span>
                  <span className="font-medium">{session.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.plan') || 'Plano'}:</span>
                  <span className="font-medium">{session.plan || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.createdAt') || 'Criado em'}:</span>
                  <span>
                    {format(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: dateLocale })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.updatedAt') || 'Atualizado em'}:</span>
                  <span>
                    {format(new Date(session.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: dateLocale })}
                  </span>
                </div>
                {session.notification_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">📱 Tel. Notificação:</span>
                    <span className="font-mono">{session.notification_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Credenciais */}
            {session.api_session && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  🔐 {t('common.credentials') || 'Credenciais'}
                </h3>
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">API Session</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(session.api_session!, "API Session")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="text-xs break-all">{session.api_session}</code>
                  </div>

                  {session.api_token && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">API Token</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(session.api_token!, "API Token")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <code className="text-xs break-all">{session.api_token.substring(0, 50)}...</code>
                    </div>
                  )}

                  {session.api_token_full && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Token Full</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(session.api_token_full!, "Token Full")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <code className="text-xs break-all">{session.api_token_full.substring(0, 50)}...</code>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Uso da API */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📊 {t('common.apiUsage') || 'Uso da API'}
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('common.messagesSent') || 'Mensagens Enviadas'}:</span>
                  <span className="font-medium">
                    {session.api_message_usage || 0} / {session.api_message_limit || 0}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('common.progress') || 'Progresso'}</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                </div>
              </div>
            </div>

            {/* Limites */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                ⚙️ {t('common.limits') || 'Limites'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">{t('common.sessions') || 'Sessões'}</div>
                  <div className="text-2xl font-bold">{session.session_limit || 0}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">{t('common.agents') || 'Agentes'}</div>
                  <div className="text-2xl font-bold">{session.agent_limit || 0}</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="mt-4">
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h3 className="font-semibold text-lg">{t('webhooks.receiveMessages')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('webhooks.receiveMessagesDescription')}
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">{t('webhooks.webhookUrl')}</Label>
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://seu-servidor.com/webhook"
                />
                <p className="text-xs text-muted-foreground">
                  {t('webhooks.webhookUrlHint')}
                </p>
              </div>

              {/* Security Token */}
              {session.api_token && (
                <div className="space-y-2">
                  <Label>{t('webhooks.securityToken')}</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted/50 p-3 rounded-lg font-mono text-xs break-all">
                      {session.api_token.substring(0, 20)}...
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(session.api_token!);
                        toast.success(t('webhooks.tokenCopied'));
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('webhooks.securityTokenHint')}
                  </p>
                </div>
              )}

              {/* Events Selection */}
              <div className="space-y-3">
                <Label>{t('webhooks.selectEvents')}</Label>
                <div className="space-y-3">
                  {WEBHOOK_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Checkbox
                        id={event.id}
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        disabled={event.required}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={event.id}
                          className="text-sm font-medium cursor-pointer flex items-center gap-2"
                        >
                          {t(`webhooks.eventTypes.${event.id}`)}
                          {event.required && (
                            <Badge variant="secondary" className="text-xs">
                              {t('webhooks.requiredEvent')}
                            </Badge>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(`webhooks.eventDescriptions.${event.id}`)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveWebhook}
                disabled={isSaving || !webhookUrl}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.saving', 'Salvando...')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('webhooks.saveConfiguration')}
                  </>
                )}
              </Button>

              {/* Status indicator */}
              {session.webhook_enabled && session.webhook_url && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-primary text-sm">
                  <Webhook className="h-4 w-4" />
                  {t('webhooks.webhookActiveMessage')}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>{t('common.close') || 'Fechar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDetailsModal;
