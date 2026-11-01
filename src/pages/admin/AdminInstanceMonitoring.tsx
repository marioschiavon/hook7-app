import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Activity, AlertTriangle, Bell, Copy, Hourglass, Pencil, Search, Server, Trash2, Wifi, WifiOff, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados gravados pelas edge functions evolution-monitor e instance-cleanup
// (ver INSTANCE_MONITORING.sql e INSTANCE_CLEANUP.sql).
// As tabelas não estão nos tipos gerados do Supabase, por isso os casts `as any`.

interface InstanceRow {
  instance_name: string;
  state: string;
  phone: string | null;
  last_phone: string | null;
  profile_name: string | null;
  client_label: string | null;
  state_changed_at: string;
  removed_at: string | null;
  keep: boolean;
  disconnected_since: string | null;
}

interface DeletionRow {
  id: number;
  instance_name: string;
  reason: "inactive" | "superseded";
  dry_run: boolean;
  phone: string | null;
  client_label: string | null;
  api_status: number | null;
  created_at: string;
}

interface CleanupConfig {
  enabled?: boolean;
  dry_run_until?: string | null;
  inactive_days?: number;
  superseded_hours?: number;
}

interface AlertRow {
  id: number;
  kind: string;
  severity: string;
  instance_name: string | null;
  message: string;
  status: string;
  created_at: string;
}

interface LastCheck {
  at?: string;
  api_ok?: boolean;
  error?: string | null;
  total?: number;
  open?: number;
}

type FilterType = "all" | "open" | "down" | "connecting" | "duplicate";

// O cron roda a cada minuto; sem pulso por mais que isso o próprio monitor parou
const STALE_AFTER_MS = 3 * 60 * 1000;

const STATE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  open:       { label: "Conectada",    dot: "bg-green-500",       badge: "border-green-500/30 text-green-400" },
  connecting: { label: "Conectando",   dot: "bg-yellow-500",      badge: "border-yellow-500/30 text-yellow-400" },
  close:      { label: "Desconectada", dot: "bg-red-500",         badge: "border-red-500/30 text-red-400" },
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  security: "bg-orange-400",
  info: "bg-green-500",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const STAGGER = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const ITEM = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const AdminInstanceMonitoring = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [drops24h, setDrops24h] = useState<Record<string, number>>({});
  const [appInstances, setAppInstances] = useState<Set<string>>(new Set());
  const [lastCheck, setLastCheck] = useState<LastCheck>({});
  const [deletions, setDeletions] = useState<DeletionRow[]>([]);
  const [cleanupConfig, setCleanupConfig] = useState<CleanupConfig>({});
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [, setTick] = useState(0);
  const refetchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) navigate("/dashboard");
  }, [authLoading, isSuperAdmin, navigate]);

  const fetchAll = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [instRes, alertRes, eventRes, statusRes, sessionRes, deletionRes, cleanupRes] = await Promise.all([
      supabase.from("evolution_instances" as any).select("*").is("removed_at", null),
      supabase.from("monitor_alerts" as any).select("id, kind, severity, instance_name, message, status, created_at")
        .order("created_at", { ascending: false }).limit(40),
      supabase.from("instance_events" as any).select("instance_name").eq("event_type", "disconnected").gte("created_at", since),
      supabase.from("monitor_status" as any).select("value").eq("key", "last_check").maybeSingle(),
      supabase.from("sessions").select("api_session"),
      supabase.from("instance_deletions" as any)
        .select("id, instance_name, reason, dry_run, phone, client_label, api_status, created_at")
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("monitor_status" as any).select("value").eq("key", "cleanup_config").maybeSingle(),
    ]);

    if (instRes.error || alertRes.error) {
      toast.error("Erro ao carregar o monitoramento");
      return;
    }

    setInstances((instRes.data as unknown as InstanceRow[]) ?? []);
    setAlerts((alertRes.data as unknown as AlertRow[]) ?? []);

    const drops: Record<string, number> = {};
    for (const e of (eventRes.data as unknown as { instance_name: string }[]) ?? []) {
      drops[e.instance_name] = (drops[e.instance_name] ?? 0) + 1;
    }
    setDrops24h(drops);
    setLastCheck(((statusRes.data as any)?.value as LastCheck) ?? {});
    setAppInstances(new Set((sessionRes.data ?? []).map((s) => s.api_session).filter(Boolean) as string[]));
    setDeletions((deletionRes.data as unknown as DeletionRow[]) ?? []);
    setCleanupConfig(((cleanupRes.data as any)?.value as CleanupConfig) ?? {});
    setLoading(false);
  }, []);

  // Realtime: qualquer mudança nas tabelas do monitor dispara um recarregamento (agrupado)
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchAll();

    const scheduleRefetch = () => {
      clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(fetchAll, 500);
    };

    const channel = supabase.channel("admin-instance-monitoring");
    for (const table of ["evolution_instances", "instance_events", "monitor_alerts", "monitor_status", "instance_deletions"]) {
      channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, scheduleRefetch);
    }
    channel.subscribe();

    // Atualiza os tempos relativos ("há 2 min") e a detecção de monitor parado
    const tick = setInterval(() => setTick((n) => n + 1), 15_000);

    return () => {
      clearTimeout(refetchTimer.current);
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin, fetchAll]);

  const saveLabel = async (instanceName: string) => {
    const value = labelDraft.trim() || null;
    setEditing(null);
    const { error } = await supabase
      .from("evolution_instances" as any)
      .update({ client_label: value })
      .eq("instance_name", instanceName);
    if (error) {
      toast.error("Não foi possível salvar o cliente");
      return;
    }
    setInstances((prev) => prev.map((i) => (i.instance_name === instanceName ? { ...i, client_label: value } : i)));
  };

  const toggleKeep = async (inst: InstanceRow, keep: boolean) => {
    setInstances((prev) => prev.map((i) => (i.instance_name === inst.instance_name ? { ...i, keep } : i)));
    const { error } = await supabase
      .from("evolution_instances" as any)
      .update({ keep })
      .eq("instance_name", inst.instance_name);
    if (error) {
      toast.error("Não foi possível salvar");
      setInstances((prev) => prev.map((i) => (i.instance_name === inst.instance_name ? { ...i, keep: !keep } : i)));
      return;
    }
    toast.success(keep ? "Instância não será removida automaticamente" : "Instância volta para a limpeza automática");
  };

  // Número conectado em mais de uma instância ao mesmo tempo
  const openByPhone = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of instances) {
      const phone = i.phone ?? i.last_phone;
      if (i.state === "open" && phone) map.set(phone, (map.get(phone) ?? 0) + 1);
    }
    return map;
  }, [instances]);

  // Mesma regra da edge function instance-cleanup, só para exibir no painel
  const flagsFor = (inst: InstanceRow) => {
    const phone = inst.phone ?? inst.last_phone;
    const openWithPhone = phone ? openByPhone.get(phone) ?? 0 : 0;
    const duplicate = inst.state === "open" && openWithPhone > 1;
    const superseded = inst.state !== "open" && openWithPhone > 0;
    const protectedFromCleanup = inst.keep || appInstances.has(inst.instance_name);
    let removalAt: Date | null = null;
    if (inst.state !== "open" && inst.disconnected_since && !protectedFromCleanup) {
      const since = new Date(inst.disconnected_since).getTime();
      removalAt = superseded
        ? new Date(since + (cleanupConfig.superseded_hours ?? 48) * 60 * 60 * 1000)
        : new Date(since + (cleanupConfig.inactive_days ?? 15) * DAY_MS);
    }
    return { duplicate, superseded, removalAt, isApp: appInstances.has(inst.instance_name) };
  };

  const dryRunActive = !!cleanupConfig.dry_run_until && Date.now() < new Date(cleanupConfig.dry_run_until).getTime();

  const counts = useMemo(() => ({
    all: instances.length,
    open: instances.filter((i) => i.state === "open").length,
    connecting: instances.filter((i) => i.state === "connecting").length,
    down: instances.filter((i) => i.state === "close").length,
    duplicate: instances.filter((i) => {
      const phone = i.phone ?? i.last_phone;
      return i.state === "open" && !!phone && (openByPhone.get(phone) ?? 0) > 1;
    }).length,
  }), [instances, openByPhone]);

  const totalDrops = Object.values(drops24h).reduce((a, b) => a + b, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return instances
      .filter((i) => {
        if (filter === "open") return i.state === "open";
        if (filter === "down") return i.state === "close";
        if (filter === "connecting") return i.state === "connecting";
        if (filter === "duplicate") {
          const phone = i.phone ?? i.last_phone;
          return i.state === "open" && !!phone && (openByPhone.get(phone) ?? 0) > 1;
        }
        return true;
      })
      .filter((i) => !q || [i.instance_name, i.client_label, i.profile_name, i.phone, i.last_phone]
        .some((v) => v?.toLowerCase().includes(q)))
      // Problemas primeiro: desconectadas, conectando, depois as conectadas
      .sort((a, b) => {
        const rank = (s: string) => (s === "close" ? 0 : s === "connecting" ? 1 : 2);
        return rank(a.state) - rank(b.state) || a.instance_name.localeCompare(b.instance_name);
      });
  }, [instances, filter, search, openByPhone]);

  const lastCheckAt = lastCheck.at ? new Date(lastCheck.at) : null;
  const monitorStale = !lastCheckAt || Date.now() - lastCheckAt.getTime() > STALE_AFTER_MS;
  const apiHealthy = !monitorStale && lastCheck.api_ok !== false;

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const statCards = [
    {
      label: "API do Hook7",
      value: monitorStale ? "Monitor parado" : apiHealthy ? "Online" : "Fora do ar",
      hint: lastCheckAt
        ? `Verificado ${formatDistanceToNow(lastCheckAt, { addSuffix: true, locale: ptBR })}`
        : "Sem verificações ainda",
      icon: Server,
      tone: apiHealthy ? "text-green-400" : "text-red-400",
    },
    { label: "Conectadas", value: `${counts.open} / ${counts.all}`, hint: "instâncias no Hook7", icon: Wifi, tone: "text-green-400" },
    {
      label: "Desconectadas",
      value: String(counts.down),
      hint: counts.connecting ? `${counts.connecting} conectando` : "aguardando reconexão ou QR",
      icon: WifiOff,
      tone: counts.down ? "text-red-400" : "text-foreground/70",
    },
    { label: "Quedas em 24h", value: String(totalDrops), hint: "desconexões registradas", icon: Zap, tone: totalDrops ? "text-orange-400" : "text-foreground/70" },
  ];

  const filterChips = [
    { f: "all" as FilterType, label: "Todas", dot: "bg-foreground/30", n: counts.all },
    { f: "down" as FilterType, label: "Desconectadas", dot: "bg-red-500", n: counts.down },
    { f: "connecting" as FilterType, label: "Conectando", dot: "bg-yellow-500", n: counts.connecting },
    { f: "open" as FilterType, label: "Conectadas", dot: "bg-green-500", n: counts.open },
    ...(counts.duplicate ? [{ f: "duplicate" as FilterType, label: "Duplicadas", dot: "bg-orange-400", n: counts.duplicate }] : []),
  ];

  // Marcações de duplicidade e remoção automática, iguais na tabela e nos cartões
  const renderFlags = (inst: InstanceRow) => {
    const { duplicate, superseded, removalAt } = flagsFor(inst);
    if (!duplicate && !superseded && !removalAt) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {duplicate && (
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] border-orange-400/40 text-orange-300" title="O mesmo número está conectado em outra instância">
            <Copy className="h-2.5 w-2.5" /> Número duplicado
          </Badge>
        )}
        {superseded && (
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] border-foreground/15 text-foreground/50" title="Este número está conectado em outra instância">
            <Copy className="h-2.5 w-2.5" /> Sobra
          </Badge>
        )}
        {removalAt && (
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] border-yellow-500/30 text-yellow-300/90" title={format(removalAt, "dd/MM/yyyy HH:mm")}>
            <Hourglass className="h-2.5 w-2.5" />
            {removalAt.getTime() <= Date.now()
              ? (dryRunActive ? "Seria removida" : "Remoção pendente")
              : `Removida ${formatDistanceToNow(removalAt, { addSuffix: true, locale: ptBR })}`}
          </Badge>
        )}
      </div>
    );
  };

  const renderKeep = (inst: InstanceRow) => {
    if (appInstances.has(inst.instance_name)) {
      return <span className="text-[11px] text-foreground/30" title="Instâncias do app nunca são removidas automaticamente">Protegida (app)</span>;
    }
    return (
      <label className="flex items-center gap-2 text-[11px] text-foreground/45 cursor-pointer select-none">
        <Switch checked={inst.keep} onCheckedChange={(v) => toggleKeep(inst, v)} className="scale-75 origin-left" />
        Manter
      </label>
    );
  };

  // Campo "Cliente" editável, usado na tabela (desktop) e nos cartões (celular/tablet)
  const renderClientLabel = (inst: InstanceRow) =>
    editing === inst.instance_name ? (
      <Input
        autoFocus
        value={labelDraft}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={() => saveLabel(inst.instance_name)}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveLabel(inst.instance_name);
          if (e.key === "Escape") setEditing(null);
        }}
        placeholder="Nome do cliente"
        className="h-9 xl:h-7 text-sm xl:text-xs border-foreground/15"
      />
    ) : (
      <button
        onClick={() => { setEditing(inst.instance_name); setLabelDraft(inst.client_label ?? ""); }}
        className="group flex min-h-9 xl:min-h-0 items-center gap-1.5 text-left text-sm text-foreground/70 hover:text-foreground"
        title="Definir o cliente desta instância"
      >
        {inst.client_label || <span className="text-foreground/25 text-xs">Definir cliente</span>}
        {/* Sem hover no toque: no celular/tablet o lápis fica sempre visível */}
        <Pencil className="h-3 w-3 opacity-40 xl:opacity-0 xl:group-hover:opacity-60 transition-opacity" />
      </button>
    );

  return (
    <div className="container mx-auto px-3 py-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
      {/* Resumo */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" variants={STAGGER} initial="hidden" animate="show">
        {statCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <motion.div key={label} variants={ITEM}>
            <Card className="glass-card border-foreground/5 h-full">
              <CardContent className="p-3 sm:p-4 space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-foreground/40">
                  <span className="truncate">{label}</span>
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                </div>
                <p className={`text-lg sm:text-xl font-semibold tabular-nums leading-tight ${tone}`}>{value}</p>
                <p className="text-[11px] text-foreground/35 truncate">{hint}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {monitorStale && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs sm:text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          O monitor não registra verificações há mais de 3 minutos. Confira o cron evolution-monitor no Supabase.
        </div>
      )}
      {!monitorStale && lastCheck.api_ok === false && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs sm:text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          A API do Hook7 não respondeu na última verificação{lastCheck.error ? `: ${lastCheck.error}` : ""}. Os estados abaixo podem estar desatualizados.
        </div>
      )}

      <div className="grid gap-4 sm:gap-5 2xl:grid-cols-[1fr_360px]">
        {/* Instâncias */}
        <Card className="glass-card border-foreground/5 overflow-hidden min-w-0">
          <CardHeader className="p-3 sm:p-6 pb-3 space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              {/* No celular os filtros rolam na horizontal em vez de quebrar em várias linhas */}
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                {filterChips.map(({ f, label, dot, n }) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 xl:py-1.5 text-sm transition-colors ${
                      filter === f
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-foreground/8 bg-muted/20 text-foreground/50 hover:border-foreground/15 hover:text-foreground/70"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {label}
                    <span className="tabular-nums font-semibold">{n}</span>
                  </button>
                ))}
              </div>
              <div className="relative w-full xl:w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/30" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar instância, cliente ou número"
                  className="h-10 xl:h-9 pl-8 text-sm border-foreground/10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Activity className="h-8 w-8 text-foreground/15" />
                <p className="text-sm text-foreground/30">Nenhuma instância com este filtro</p>
              </div>
            ) : (
              <>
                {/* Celular, tablet e notebook pequeno: cartões. As colunas seguem a largura disponível, que no tablet
                    muda bastante com o menu lateral aberto ou fechado. */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-2 px-3 pb-3 sm:px-6 sm:pb-6 xl:hidden">
                  {filtered.map((inst) => {
                    const cfg = STATE_CONFIG[inst.state] ?? STATE_CONFIG.close;
                    const phone = inst.phone ?? inst.last_phone;
                    const drops = drops24h[inst.instance_name] ?? 0;
                    return (
                      <div key={inst.instance_name} className="rounded-lg border border-foreground/8 bg-muted/10 p-3 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-foreground/85 break-all">{inst.instance_name}</p>
                            <p className="text-[11px] text-foreground/35 truncate">
                              {inst.profile_name || "—"} · {appInstances.has(inst.instance_name) ? "App" : "API direta"}
                            </p>
                          </div>
                          <Badge variant="outline" className={`flex-shrink-0 gap-1 text-[10px] h-5 px-1.5 whitespace-nowrap ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </Badge>
                        </div>
                        {renderClientLabel(inst)}
                        {renderFlags(inst)}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-foreground/40">
                          <span className="font-mono">{phone ? `+${phone}` : "—"}</span>
                          <span>{formatDistanceToNow(new Date(inst.state_changed_at), { addSuffix: true, locale: ptBR })}</span>
                          <span className={drops ? "text-orange-400 font-semibold" : ""}>
                            {drops} {drops === 1 ? "queda" : "quedas"} em 24h
                          </span>
                        </div>
                        <div className="border-t border-foreground/5 pt-2">{renderKeep(inst)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Telas largas: tabela */}
                <div className="hidden xl:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-foreground/5 hover:bg-transparent">
                        <TableHead className="text-foreground/40 text-xs font-medium">Status</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium">Instância</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium">Cliente</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium">Número</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium">No estado desde</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium text-right">Quedas 24h</TableHead>
                        <TableHead className="text-foreground/40 text-xs font-medium">Limpeza</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((inst) => {
                        const cfg = STATE_CONFIG[inst.state] ?? STATE_CONFIG.close;
                        const phone = inst.phone ?? inst.last_phone;
                        const drops = drops24h[inst.instance_name] ?? 0;
                        return (
                          <TableRow key={inst.instance_name} className="border-foreground/5 hover:bg-foreground/3">
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 whitespace-nowrap ${cfg.badge}`}>
                                  {cfg.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-mono text-xs text-foreground/80">{inst.instance_name}</p>
                              <p className="text-[11px] text-foreground/35">
                                {inst.profile_name || "—"} · {appInstances.has(inst.instance_name) ? "App" : "API direta"}
                              </p>
                              <div className="mt-1">{renderFlags(inst)}</div>
                            </TableCell>
                            <TableCell className="min-w-[150px]">{renderClientLabel(inst)}</TableCell>
                            <TableCell className="font-mono text-xs text-foreground/50 whitespace-nowrap">
                              {phone ? `+${phone}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-foreground/40 whitespace-nowrap">
                              {formatDistanceToNow(new Date(inst.state_changed_at), { addSuffix: true, locale: ptBR })}
                            </TableCell>
                            <TableCell className={`text-right text-sm tabular-nums ${drops ? "text-orange-400 font-semibold" : "text-foreground/30"}`}>
                              {drops}
                            </TableCell>
                            <TableCell>{renderKeep(inst)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 sm:space-y-5 min-w-0">
        {/* Alertas recentes */}
        <Card className="glass-card border-foreground/5 min-w-0">
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Bell className="h-4 w-4" />
              Alertas recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-foreground/30">Nenhum alerta ainda</p>
            ) : (
              <ScrollArea className="h-[420px] 2xl:h-[640px]">
                <ul className="divide-y divide-foreground/5">
                  {alerts.map((a) => {
                    const [title, ...rest] = a.message.split("\n").filter(Boolean);
                    return (
                      <li key={a.id} className="px-3 sm:px-4 py-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[a.severity] ?? "bg-foreground/30"}`} />
                            <p className="text-sm text-foreground/80 truncate">{title}</p>
                          </div>
                          <span className="text-[11px] text-foreground/30 whitespace-nowrap" title={format(new Date(a.created_at), "dd/MM/yyyy HH:mm:ss")}>
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        {rest.length > 0 && (
                          <p className="pl-3.5 text-xs text-foreground/40 whitespace-pre-line line-clamp-4 break-words">{rest.join("\n")}</p>
                        )}
                        {a.status !== "sent" && (
                          <p className="pl-3.5 text-[11px] text-yellow-400/80">
                            {a.status === "failed" ? "Falhou ao enviar ao Telegram" : "Aguardando envio"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Remoções automáticas */}
        <Card className="glass-card border-foreground/5 min-w-0">
          <CardHeader className="p-3 sm:p-6 pb-2 space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/70">
              <Trash2 className="h-4 w-4" />
              Limpeza automática
            </CardTitle>
            <p className="text-[11px] text-foreground/35">
              {cleanupConfig.enabled === false
                ? "Desligada"
                : `Desconectadas há ${cleanupConfig.inactive_days ?? 15} dias, ou sobras após ${cleanupConfig.superseded_hours ?? 48}h`}
              {dryRunActive && cleanupConfig.dry_run_until && (
                <> · <span className="text-yellow-300/80">simulação até {format(new Date(cleanupConfig.dry_run_until), "dd/MM HH:mm")}</span></>
              )}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {deletions.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-foreground/30">Nenhuma remoção ainda</p>
            ) : (
              <>
                <p className="px-3 sm:px-4 pb-2 text-xs text-foreground/50">
                  <span className="font-semibold text-foreground/80 tabular-nums">
                    {deletions.filter((d) => !d.dry_run && Date.now() - new Date(d.created_at).getTime() < 30 * DAY_MS).length}
                  </span>{" "}
                  removidas nos últimos 30 dias
                </p>
                <ScrollArea className="max-h-[320px]">
                  <ul className="divide-y divide-foreground/5">
                    {deletions.map((d) => (
                      <li key={d.id} className="px-3 sm:px-4 py-2.5 space-y-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs text-foreground/75 break-all">{d.instance_name}</p>
                          <span className="text-[11px] text-foreground/30 whitespace-nowrap">
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/40">
                          {d.dry_run ? <span className="text-yellow-300/80">Simulação · </span> : null}
                          {d.reason === "superseded" ? "Sobra de número duplicado" : "Inatividade"}
                          {d.client_label ? ` · ${d.client_label}` : ""}
                          {d.phone ? ` · +${d.phone}` : ""}
                          {!d.dry_run && d.api_status && (d.api_status < 200 || (d.api_status >= 300 && d.api_status !== 404))
                            ? <span className="text-red-400"> · falhou ({d.api_status})</span>
                            : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminInstanceMonitoring;
