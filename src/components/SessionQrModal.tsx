import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, XCircle, Trash2, Loader2, Server, Settings, ChevronDown, AlertTriangle, Link, Webhook, Check, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { GroupExtractor } from "./dashboard/GroupExtractor";

interface SessionData {
  id: string;
  name: string;
  api_session: string | null;
  api_token: string | null;
  api_token_full: string | null;
  status: string | null;
  qr: string | null;
  organization_id: string;
  pairing_code?: string | null;
  webhook_url?: string | null;
  webhook_enabled?: boolean;
  webhook_events?: string[];
}

interface SessionStatus {
  status: boolean;
  message?: string;
  qrCode?: string;
}



interface SessionQrModalProps {
  session: SessionData | null;
  status: SessionStatus | null;
  open: boolean;
  onClose: () => void;
  onRefreshQr: () => void;
  onCloseSession: () => void;
  onLogoutSession: () => void;
  refreshingQr?: boolean;
  closingSession?: boolean;
  loggingOut?: boolean;
  generatingQrCode?: boolean;
  qrExpiresIn?: number | null;
}

const SessionQrModal = ({ 
  session, 
  status, 
  open, 
  onClose,
  onRefreshQr,
  onCloseSession,
  onLogoutSession,
  refreshingQr = false,
  closingSession = false,
  loggingOut = false,
  generatingQrCode = false,
  qrExpiresIn = null
}: SessionQrModalProps) => {
  const { t } = useTranslation();
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'close' | 'delete' | null>(null);
  


  if (!session) return null;

  const handleCopyToken = () => {
    if (session.api_token) {
      navigator.clipboard.writeText(session.api_token);
      toast.success("Token copiado!");
    }
  };

  const handleCopyPairingCode = () => {
    if (session.pairing_code) {
      navigator.clipboard.writeText(session.pairing_code);
      toast.success("Código de pareamento copiado!");
    }
  };



  const isConnected = status?.status === true && status?.message?.toUpperCase() === 'CONNECTED';
  const hasQrCode = status?.qrCode && !isConnected;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {session.name}
          </DialogTitle>
          <DialogDescription>
            Sessão: <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{session.api_session}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-2">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              {isConnected ? 'Conectado' : hasQrCode ? 'Aguardando QR Code' : 'Desconectado'}
            </Badge>
          </div>

          {/* TABS FOR BETTER ORGANIZATION */}
          <Tabs defaultValue="connection" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="connection">Conexão</TabsTrigger>
              <TabsTrigger value="groups">Grupos</TabsTrigger>
              <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* TAB: CONEXÃO */}
            <TabsContent value="connection" className="space-y-6 pt-4">
              {generatingQrCode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-8 text-primary"
                >
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="font-medium">Gerando QR Code, aguarde...</span>
                </motion.div>
              )}

              {!generatingQrCode && hasQrCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img 
                      src={status.qrCode} 
                      alt="QR Code WhatsApp" 
                      className="w-64 h-64"
                    />
                  </div>

                  {/* Contador de expiração */}
                  {qrExpiresIn !== null && qrExpiresIn > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <p className="text-muted-foreground">
                        QR Code expira em <span className="font-bold text-foreground">{qrExpiresIn}s</span>
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground text-center">
                    Escaneie o QR Code com seu WhatsApp para conectar
                  </p>

                  {/* Pairing Code como alternativa */}
                  {session.pairing_code && (
                    <div className="w-full bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium flex items-center gap-1.5">
                          <Link className="w-3 h-3" />
                          Código de Pareamento (alternativa)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyPairingCode}
                          className="h-7 gap-1.5 text-xs"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </Button>
                      </div>
                      <code className="text-xs bg-background px-2 py-1.5 rounded block overflow-x-auto break-all">
                        {session.pairing_code}
                      </code>
                    </div>
                  )}

                  <Button
                    onClick={onRefreshQr}
                    variant="outline"
                    disabled={refreshingQr}
                    className="gap-2"
                  >
                    {refreshingQr ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Renovar QR Code
                  </Button>
                </motion.div>
              )}

              {/* Connected State */}
              {!generatingQrCode && isConnected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mb-4">
                      <Server className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <p className="text-lg font-semibold">Sessão Conectada!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Seu WhatsApp está online e pronto para uso
                    </p>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">API Key</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyToken}
                        className="gap-2"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar
                      </Button>
                    </div>
                    <code className="text-xs bg-muted px-3 py-2 rounded-md block overflow-x-auto break-all">
                      {session.api_token}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Use esta chave no header: <code className="bg-muted px-1 py-0.5 rounded">apikey: {session.api_token}</code>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Não conectado e sem QR Code */}
              {!generatingQrCode && !hasQrCode && !isConnected && (
                <div className="text-center py-8 text-muted-foreground">
                  <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sessão desconectada</p>
                  <p className="text-sm mt-2">Clique em "Iniciar Sessão" para conectar</p>
                </div>
              )}
            </TabsContent>

            {/* TAB: GRUPOS */}
            <TabsContent value="groups" className="space-y-6 pt-4">
              {isConnected && session.api_token ? (
                <GroupExtractor sessionName={session.name} apiToken={session.api_token} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Sessão não conectada</p>
                  <p className="text-sm mt-2">Conecte seu WhatsApp para visualizar e extrair grupos</p>
                </div>
              )}
            </TabsContent>

            {/* TAB: CONFIGURAÇÕES */}
            <TabsContent value="settings" className="space-y-6 pt-4">
              {/* Advanced Actions */}
              <div className="pt-2">
                <p className="text-sm font-semibold mb-3">Ações Avançadas</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  Atenção: Estas ações afetam sua sessão WhatsApp
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmAction('close')}
                    disabled={closingSession || !isConnected}
                    className="gap-2 w-1/2"
                  >
                    <XCircle className="w-4 h-4" />
                    {closingSession ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Fechando...
                      </>
                    ) : (
                      'Fechar Sessão'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmAction('delete')}
                    disabled={loggingOut}
                    className="gap-2 w-1/2 text-destructive border-destructive hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loggingOut ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      'Excluir Sessão'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                {confirmAction === 'delete' ? 'Excluir Sessão?' : 'Fechar Sessão?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction === 'delete' 
                  ? 'Esta ação é permanente e não pode ser desfeita. A sessão será completamente removida e você precisará criar uma nova sessão para reconectar.'
                  : 'Isso irá desconectar seu WhatsApp desta sessão. Você precisará escanear o QR Code novamente para reconectar.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (confirmAction === 'delete') {
                    onLogoutSession();
                  } else {
                    onCloseSession();
                  }
                  setConfirmAction(null);
                }}
                className={confirmAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {confirmAction === 'delete' ? 'Excluir Permanentemente' : 'Confirmar Fechamento'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default SessionQrModal;
