import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as hook7Api from "@/services/hook7Api";

interface OnlineSessionsState {
  online: number;
  total: number;
}

export function useOnlineSessions(): OnlineSessionsState {
  const [state, setState] = useState<OnlineSessionsState>({ online: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRecord } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!userRecord?.organization_id) return;

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, api_session, api_token")
        .eq("organization_id", userRecord.organization_id);

      if (!sessions || sessions.length === 0) return;

      const results = await Promise.allSettled(
        sessions.map((s: any) =>
          s.api_session && s.api_token
            ? hook7Api.checkConnection(s.api_session, s.api_token)
            : Promise.resolve({ status: false })
        )
      );

      if (cancelled) return;

      const onlineCount = results.filter(
        (r) => r.status === "fulfilled" && (r.value as any).status === true
      ).length;

      setState({ online: onlineCount, total: sessions.length });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
