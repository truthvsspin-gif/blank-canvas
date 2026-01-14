import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/providers/auth-provider";

type State = {
  businessId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useCurrentBusiness(): State {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setBusinessId(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: err } = await supabase
        .from("memberships")
        .select("business_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!active) return;
      if (err) {
        setError(err.message);
        setBusinessId(null);
      } else {
        const id = data?.business_id ?? null;
        setBusinessId(id);
        setError(id ? null : "No hay negocio activo. Crea uno para continuar.");
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [user, refreshKey]);

  const refresh = async () => {
    setRefreshKey((x) => x + 1);
  };

  return { businessId, loading, error, refresh };
}
