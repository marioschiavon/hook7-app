import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { QrCode, Play, Trash2, MoreVertical, Wifi, WifiOff } from "lucide-react";

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
}

interface SessionStatus {
  status: boolean;
  message?: string;
  qrCode?: string;
}

interface SessionManagementCardProps {
  session: SessionData;
  status: SessionStatus | null;
  hasActiveSubscription?: boolean;
  onViewQr: () => void;
  onStartSession: () => void;
  onDelete: () => void;
}

const SessionManagementCard = ({ 
  session, 
  status,
  hasActiveSubscription,
  onViewQr,
  onStartSession,
  onDelete
}: SessionManagementCardProps) => {
  const getStatusConfig = () => {
    if (status?.status === true) {
      return {
        color: 'bg-green-500',
        textColor: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        label: 'Online',
        emoji: '🟢'
      };
    }
    
    if (status?.qrCode || status?.message?.toUpperCase() === 'QRCODE') {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        label: 'QR Code',
        emoji: '🟡'
      };
    }
    
    return {
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      label: 'Offline',
      emoji: '🔴'
    };
  };

  const statusConfig = getStatusConfig();
  const isOnline = status?.status === true;
  const hasQrCode = status?.qrCode || status?.message?.toUpperCase() === 'QRCODE';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="h-full"
    >
      <Card className={`glass-card transition-all border ${statusConfig.borderColor} hover:border-primary/40 h-full flex flex-col overflow-hidden`}>
        {/* Barra de status no topo */}
        <div className={`h-0.5 ${statusConfig.color} opacity-80`} />

        <CardContent className="p-5 flex-1 flex flex-col gap-3">
          {/* Header: badge + menu */}
          <div className="flex items-center justify-between">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 font-medium text-xs px-2 py-0.5`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusConfig.color} mr-1.5 ${isOnline ? 'animate-pulse' : ''}`} />
              {statusConfig.label}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nome e ID */}
          <div className="flex-1">
            <h3 className="font-semibold text-base leading-tight truncate">{session.name}</h3>
            <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
              {session.api_session || 'Sessão não configurada'}
            </p>
          </div>

          {/* Timestamp */}
          {session.updated_at && (
            <p className="text-xs text-muted-foreground/70">
              Atualizado{' '}
              {formatDistanceToNow(new Date(session.updated_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          )}

          {/* Ações principais */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            {hasQrCode && (
              <Button onClick={onViewQr} className="w-full gap-2" size="sm">
                <QrCode className="w-3.5 h-3.5" />
                Escanear QR Code
              </Button>
            )}

            {!isOnline && !hasQrCode && (session.requires_subscription === undefined || session.requires_subscription === false || hasActiveSubscription) && (
              <Button onClick={onStartSession} className="w-full gap-2" size="sm">
                <Play className="w-3.5 h-3.5" />
                Conectar
              </Button>
            )}

            {!isOnline && !hasQrCode && session.requires_subscription && !hasActiveSubscription && (
              <Button
                onClick={() => window.location.href = `/checkout?session_name=${session.name}`}
                className="w-full gap-2"
                size="sm"
              >
                Assinar para Ativar
              </Button>
            )}

            {isOnline && (
              <Button onClick={onViewQr} className="w-full gap-2" variant="outline" size="sm">
                <Wifi className="w-3.5 h-3.5" />
                Ver Detalhes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SessionManagementCard;
