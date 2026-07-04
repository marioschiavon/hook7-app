export const TRIAL_HOURS = 48;

export interface TrialSessionFields {
  requires_subscription?: boolean | null;
  trial_started_at?: string | null;
  trial_blocked_at?: string | null;
  message_limit?: number | null;
  messages_sent_this_month?: number | null;
}

/** Sessão criada pelo fluxo de teste grátis e que ainda não foi assinada. */
export function isTrialSession(session: TrialSessionFields): boolean {
  return !!session.trial_started_at && !!session.requires_subscription;
}

/** Teste grátis esgotado por mensagens, por tempo (48h) ou já marcado como bloqueado. */
export function isTrialExpired(session: TrialSessionFields): boolean {
  if (!isTrialSession(session)) return false;
  if (session.trial_blocked_at) return true;

  const limit = session.message_limit ?? 0;
  const used = session.messages_sent_this_month ?? 0;
  if (limit !== -1 && used >= limit) return true;

  const startedAt = new Date(session.trial_started_at as string).getTime();
  return Date.now() >= startedAt + TRIAL_HOURS * 60 * 60 * 1000;
}

/** Teste grátis em andamento (ainda não esgotado). */
export function isTrialActive(session: TrialSessionFields): boolean {
  return isTrialSession(session) && !isTrialExpired(session);
}

export function trialMessagesRemaining(session: TrialSessionFields): number {
  const limit = session.message_limit ?? 0;
  const used = session.messages_sent_this_month ?? 0;
  return Math.max(0, limit - used);
}

export function trialHoursRemaining(session: TrialSessionFields): number {
  if (!session.trial_started_at) return 0;
  const startedAt = new Date(session.trial_started_at).getTime();
  const remainingMs = startedAt + TRIAL_HOURS * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));
}
