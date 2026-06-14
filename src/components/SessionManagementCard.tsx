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
import { QrCode, Play, Trash2, MoreVertical, Wifi, WifiOff, MessageSquare, PlugZap } from "lucide-react";

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

type SessionState = "online" | "qr" | "offline";

function resolveState(status: SessionStatus | null): SessionState {
  if (status?.status === true) return "online";
  if (status?.qrCode || status?.message?.toUpperCase() === "QRCODE") return "qr";
  return "offline";
}

const STATE_CONFIG = {
  online: {
    topBorder: "border-t-green-500",
    iconBg: "bg-green-500/10",
    icon: MessageSquare,
    iconColor: "text-green-400",
    badge: "bg-green-500/10 text-green-400 border-green-500/20",
    label: "Online",
    dot: "bg-green-500 animate-pulse",
  },
  qr: {
    topBorder: "border-t-yellow-500",
    iconBg: "bg-yellow-500/10",
    icon: QrCode,
    iconColor: "text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    label: "QR Code",
    dot: "bg-yellow-500",
  },
  offline: {
    topBorder: "border-t-red-500",
    iconBg: "bg-red-500/10",
    icon: WifiOff,
    iconColor: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    label: "Offline",
    dot: "bg-red-500",
  },
};

const SessionManagementCard = ({
  session,
  status,
  hasActiveSubscription,
  onViewQr,
  onStartSession,
  onDelete,
}: SessionManagementCardProps) => {
  const state = resolveState(status);
  const cfg = STATE_CONFIG[state];
  const Icon = cfg.icon;

  const isPendingPayment = session.status === "pending_payment";
  const needsSubscription = session.requires_subscription && !hasActiveSubscription;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="h-full">
      <Card
        className={`glass-card h-full flex flex-col border-t-2 border-x-white/5 border-b-white/5 overflow-hidden ${cfg.topBorder}`}
      >
        <CardContent className="p-4 flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg flex-shrink-0 ${cfg.iconBg}`}>
              <Icon className={`h-4 w-4 ${cfg.iconColor}`} aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white/90 truncate">{session.name}</h3>
              <p className="text-[10px] text-white/35 font-mono truncate mt-0.5">
                {session.api_session || "não configurada"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${cfg.badge}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${cfg.dot}`} />
                {cfg.label}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/30 hover:text-white/70"
                  >
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
          </div>

          {/* Meta */}
          <div className="flex-1 text-[11px] text-white/35 space-y-0.5">
            {isPendingPayment && (
              <p className="text-yellow-400/70">Aguardando pagamento</p>
            )}
            {session.updated_at && (
              <p>
                Atualizado{" "}
                {formatDistanceToNow(new Date(session.updated_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-white/5 flex gap-2">
            {state === "qr" && (
              <Button onClick={onViewQr} size="sm" className="flex-1 h-8 gap-1.5 text-xs hook7-btn-glow">
                <QrCode className="h-3.5 w-3.5" />
                Escanear QR
              </Button>
            )}

            {state === "online" && (
              <Button
                onClick={onViewQr}
                size="sm"
                variant="outline"
                className="flex-1 h-8 gap-1.5 text-xs border-white/10 text-white/70 hover:text-white"
              >
                <Wifi className="h-3.5 w-3.5" />
                Ver detalhes
              </Button>
            )}

            {state === "offline" && !isPendingPayment && !needsSubscription && (
              <Button onClick={onStartSession} size="sm" className="flex-1 h-8 gap-1.5 text-xs hook7-btn-glow">
                <PlugZap className="h-3.5 w-3.5" />
                Conectar
              </Button>
            )}

            {state === "offline" && needsSubscription && !isPendingPayment && (
              <Button
                onClick={() => (window.location.href = `/checkout?session_name=${session.name}`)}
                size="sm"
                className="flex-1 h-8 gap-1.5 text-xs"
              >
                Assinar para ativar
              </Button>
            )}

            {isPendingPayment && (
              <Button
                onClick={() => (window.location.href = `/checkout?session_name=${session.name}`)}
                size="sm"
                variant="outline"
                className="flex-1 h-8 gap-1.5 text-xs border-yellow-500/20 text-yellow-400/80 hover:text-yellow-400"
              >
                Finalizar pagamento
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SessionManagementCard;
