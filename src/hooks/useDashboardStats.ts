import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

const SPARKLINE_DAYS = 12;
const WEBHOOK_STATS_DAYS = 30;
const ACTIVITY_LIMIT = 8;

interface MessageStats {
  sentTotal: number;
  sentLimit: number;
  sentIsUnlimited: boolean;
  receivedTotal: number;
  sentSparkline: number[];
  receivedSparkline: number[];
}

interface WebhookStats {
  total: number;
  delivered: number;
  deliveredPercent: number;
}

export interface ActivityRow {
  id: string;
  dot: string;
  title: string;
  sub: string;
  time: string;
}

interface DashboardStats {
  loading: boolean;
  messages: MessageStats;
  webhooks: WebhookStats;
  recentActivity: ActivityRow[];
}

const EMPTY_STATE: DashboardStats = {
  loading: true,
  messages: {
    sentTotal: 0,
    sentLimit: 0,
    sentIsUnlimited: true,
    receivedTotal: 0,
    sentSparkline: Array(SPARKLINE_DAYS).fill(0),
    receivedSparkline: Array(SPARKLINE_DAYS).fill(0),
  },
  webhooks: { total: 0, delivered: 0, deliveredPercent: 0 },
  recentActivity: [],
};

function bucketByDay(rows: { created_at: string }[], days: number): number[] {
  const buckets = Array(days).fill(0);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const row of rows) {
    const created = new Date(row.created_at);
    const dayDiff = Math.floor((startOfToday.getTime() - new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime()) / 86400000);
    const bucketIndex = days - 1 - dayDiff;
    if (bucketIndex >= 0 && bucketIndex < days) buckets[bucketIndex]++;
  }

  return buckets;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "desconhecido";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, -8)}****-${digits.slice(-4)}`;
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

export function useDashboardStats(organizationId: string | null | undefined): DashboardStats {
  const [state, setState] = useState<DashboardStats>(EMPTY_STATE);

  useEffect(() => {
    if (!organizationId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("id, messages_sent_this_month, message_limit")
        .eq("organization_id", organizationId);

      if (sessionsError || !sessionsData || sessionsData.length === 0) {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const sessionIds = sessionsData.map((s: any) => s.id);
      let sentTotal = 0;
      let sentLimit = 0;
      let sentIsUnlimited = false;
      sessionsData.forEach((s: any) => {
        sentTotal += s.messages_sent_this_month || 0;
        if (s.message_limit === -1) sentIsUnlimited = true;
        else sentLimit += s.message_limit || 0;
      });

      const sparklineSince = new Date();
      sparklineSince.setDate(sparklineSince.getDate() - (SPARKLINE_DAYS - 1));
      sparklineSince.setHours(0, 0, 0, 0);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const webhookSince = new Date();
      webhookSince.setDate(webhookSince.getDate() - WEBHOOK_STATS_DAYS);

      const [sparklineLogsRes, receivedCountRes, webhookLogsRes, recentMessagesRes, recentWebhooksRes] =
        await Promise.all([
          (supabase.from("message_logs") as any)
            .select("direction, created_at")
            .in("session_id", sessionIds)
            .gte("created_at", sparklineSince.toISOString()),
          (supabase.from("message_logs") as any)
            .select("id", { count: "exact", head: true })
            .in("session_id", sessionIds)
            .eq("direction", "in")
            .gte("created_at", startOfMonth.toISOString()),
          (supabase.from("webhook_logs") as any)
            .select("status")
            .in("session_id", sessionIds)
            .gte("created_at", webhookSince.toISOString()),
          (supabase.from("message_logs") as any)
            .select("id, phone_number, direction, status, created_at")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: false })
            .limit(ACTIVITY_LIMIT),
          (supabase.from("webhook_logs") as any)
            .select("id, event_type, status, response_code, created_at")
            .in("session_id", sessionIds)
            .order("created_at", { ascending: false })
            .limit(ACTIVITY_LIMIT),
        ]);

      if (cancelled) return;

      const sparklineLogs: { direction: string; created_at: string }[] = sparklineLogsRes.data || [];
      const sentSparkline = bucketByDay(sparklineLogs.filter((r) => r.direction !== "in"), SPARKLINE_DAYS);
      const receivedSparkline = bucketByDay(sparklineLogs.filter((r) => r.direction === "in"), SPARKLINE_DAYS);

      const receivedTotal = receivedCountRes.count || 0;

      const webhookRows: { status: string }[] = webhookLogsRes.data || [];
      const webhookTotal = webhookRows.length;
      const webhookDelivered = webhookRows.filter((r) => r.status === "delivered").length;
      const deliveredPercent = webhookTotal > 0 ? (webhookDelivered / webhookTotal) * 100 : 100;

      const messageActivity: ActivityRow[] = (recentMessagesRes.data || []).map((log: any) => ({
        id: `msg-${log.id}`,
        dot: log.direction === "in" ? "bg-blue-400" : log.status === "sent" ? "bg-green-500" : "bg-red-500",
        title: log.direction === "in" ? "Mensagem recebida" : log.status === "sent" ? "Mensagem enviada" : "Falha ao enviar",
        sub: log.direction === "in" ? `De: ${maskPhone(log.phone_number)}` : `Para: ${maskPhone(log.phone_number)}`,
        time: timeAgo(log.created_at),
        _createdAt: log.created_at,
      } as ActivityRow & { _createdAt: string }));

      const webhookActivity: ActivityRow[] = (recentWebhooksRes.data || []).map((log: any) => ({
        id: `wh-${log.id}`,
        dot: log.status === "delivered" ? "bg-purple-500" : "bg-red-500",
        title: log.status === "delivered" ? "Webhook entregue" : "Falha no webhook",
        sub: `event: ${log.event_type}${log.response_code ? ` · ${log.response_code}` : ""}`,
        time: timeAgo(log.created_at),
        _createdAt: log.created_at,
      } as ActivityRow & { _createdAt: string }));

      const recentActivity = [...messageActivity, ...webhookActivity]
        .sort((a: any, b: any) => new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime())
        .slice(0, ACTIVITY_LIMIT)
        .map(({ id, dot, title, sub, time }) => ({ id, dot, title, sub, time }));

      setState({
        loading: false,
        messages: { sentTotal, sentLimit, sentIsUnlimited, receivedTotal, sentSparkline, receivedSparkline },
        webhooks: { total: webhookTotal, delivered: webhookDelivered, deliveredPercent },
        recentActivity,
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return state;
}
