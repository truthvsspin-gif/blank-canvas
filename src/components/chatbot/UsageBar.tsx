import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { Loader2, TrendingUp, MessageCircle, Bot } from "lucide-react";

interface UsageData {
  period: string;
  counters: {
    conversations_24h: number;
    ai_replies: number;
    qualified_leads: number;
  };
  limits: {
    conversations_24h: number;
    ai_replies: number;
  };
  plan_tier: string;
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClass =
    pct >= 95 ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-accent";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  unlimited: "Unlimited",
};

export function UsageBar() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    fetch("https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/get-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [businessId]);

  if (!businessId) return null;

  const copy = isEs
    ? {
        title: "Uso Mensual",
        desc: "Consumo de tu plan actual",
        conversations: "Conversaciones",
        aiReplies: "Respuestas IA",
        plan: "Plan",
        upgrade: "Contacta soporte para ampliar tu plan",
      }
    : {
        title: "Monthly Usage",
        desc: "Current plan consumption",
        conversations: "Conversations",
        aiReplies: "AI Replies",
        plan: "Plan",
        upgrade: "Contact support to upgrade your plan",
      };

  const isOverLimit =
    data &&
    ((data.counters.conversations_24h >= data.limits.conversations_24h) ||
     (data.counters.ai_replies >= data.limits.ai_replies));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base">{copy.title}</CardTitle>
              <CardDescription className="text-xs">{copy.desc}</CardDescription>
            </div>
          </div>
          {data && (
            <Badge variant="secondary" className="capitalize text-xs">
              {copy.plan}: {PLAN_LABELS[data.plan_tier] || data.plan_tier}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <>
            <ProgressBar
              value={data.counters.conversations_24h}
              max={data.limits.conversations_24h}
              label={copy.conversations}
            />
            <ProgressBar
              value={data.counters.ai_replies}
              max={data.limits.ai_replies}
              label={copy.aiReplies}
            />
            {isOverLimit && (
              <p className="text-xs text-destructive font-medium mt-2">
                ⚠️ {copy.upgrade}
              </p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
