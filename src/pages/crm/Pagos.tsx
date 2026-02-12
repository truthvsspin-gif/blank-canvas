import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, Save } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentSettings = {
  enabled: boolean;
  requireDeposit: boolean;
  depositPct: number;
  allowCard: boolean;
  allowBankTransfer: boolean;
  allowCash: boolean;
};

type PaymentStats = {
  paidInvoicesAmount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  upcomingBookingsAmount: number;
};

const defaultSettings: PaymentSettings = {
  enabled: false,
  requireDeposit: false,
  depositPct: 20,
  allowCard: true,
  allowBankTransfer: true,
  allowCash: true,
};

export default function Pagos() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PaymentSettings>(defaultSettings);
  const [stats, setStats] = useState<PaymentStats>({
    paidInvoicesAmount: 0,
    paidInvoicesCount: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesAmount: 0,
    upcomingBookingsAmount: 0,
  });

  const copy = isEs
    ? {
        title: "Pagos",
        subtitle: "Configura cobros online y controla facturacion desde una sola vista.",
        active: "Cobro online activo",
        inactive: "Cobro online inactivo",
        methods: "Metodos permitidos",
        requireDeposit: "Solicitar senal",
        depositPct: "Porcentaje de senal",
        save: "Guardar configuracion",
        paidAmount: "Cobrado (facturas pagadas)",
        paidCount: "Facturas pagadas",
        pendingCount: "Facturas pendientes",
        pendingAmount: "Pendiente por cobrar",
        upcomingBookings: "Reservas futuras con importe",
        card: "Tarjeta",
        transfer: "Transferencia",
        cash: "Efectivo",
        noBusiness: "No hay negocio seleccionado.",
      }
    : {
        title: "Payments",
        subtitle: "Configure online payments and track billing from one operational view.",
        active: "Online payments enabled",
        inactive: "Online payments disabled",
        methods: "Allowed methods",
        requireDeposit: "Require deposit",
        depositPct: "Deposit percentage",
        save: "Save settings",
        paidAmount: "Collected (paid invoices)",
        paidCount: "Paid invoices",
        pendingCount: "Pending invoices",
        pendingAmount: "Pending amount",
        upcomingBookings: "Upcoming bookings with price",
        card: "Card",
        transfer: "Bank transfer",
        cash: "Cash",
        noBusiness: "No business selected.",
      };

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const nowIso = new Date().toISOString();
      const [businessRes, paidRes, pendingRes, upcomingRes] = await Promise.all([
        supabase.from("businesses").select("booking_rules").eq("id", businessId).single(),
        supabase
          .from("documents")
          .select("total", { count: "exact" })
          .eq("business_id", businessId)
          .eq("doc_type", "invoice")
          .eq("status", "paid"),
        supabase
          .from("documents")
          .select("total", { count: "exact" })
          .eq("business_id", businessId)
          .eq("doc_type", "invoice")
          .in("status", ["draft", "sent"]),
        supabase
          .from("bookings")
          .select("price")
          .eq("business_id", businessId)
          .gte("scheduled_at", nowIso)
          .not("price", "is", null),
      ]);

      if (businessRes.error) {
        setError(businessRes.error.message);
      } else {
        const raw = businessRes.data?.booking_rules;
        const asRecord = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
        const payments =
          asRecord &&
          "payments" in asRecord &&
          asRecord.payments &&
          typeof asRecord.payments === "object" &&
          !Array.isArray(asRecord.payments)
            ? (asRecord.payments as Partial<Record<string, unknown>>)
            : null;

        setSettings({
          enabled: typeof payments?.enabled === "boolean" ? payments.enabled : defaultSettings.enabled,
          requireDeposit:
            typeof payments?.requireDeposit === "boolean" ? payments.requireDeposit : defaultSettings.requireDeposit,
          depositPct:
            typeof payments?.depositPct === "number"
              ? payments.depositPct
              : typeof payments?.depositPct === "string"
                ? Number(payments.depositPct) || defaultSettings.depositPct
                : defaultSettings.depositPct,
          allowCard: typeof payments?.allowCard === "boolean" ? payments.allowCard : defaultSettings.allowCard,
          allowBankTransfer:
            typeof payments?.allowBankTransfer === "boolean"
              ? payments.allowBankTransfer
              : defaultSettings.allowBankTransfer,
          allowCash: typeof payments?.allowCash === "boolean" ? payments.allowCash : defaultSettings.allowCash,
        });
      }

      const paidAmount = (paidRes.data || []).reduce((acc, row) => acc + Number(row.total || 0), 0);
      const pendingAmount = (pendingRes.data || []).reduce((acc, row) => acc + Number(row.total || 0), 0);
      const upcomingBookingsAmount = (upcomingRes.data || []).reduce((acc, row) => acc + Number(row.price || 0), 0);

      setStats({
        paidInvoicesAmount: paidAmount,
        paidInvoicesCount: paidRes.count || 0,
        pendingInvoicesCount: pendingRes.count || 0,
        pendingInvoicesAmount: pendingAmount,
        upcomingBookingsAmount,
      });

      setLoading(false);
    };

    load();
  }, [businessId]);

  const canSave = useMemo(() => settings.depositPct >= 0 && settings.depositPct <= 100, [settings.depositPct]);

  const handleSave = async () => {
    if (!businessId || !canSave || saving) return;
    setSaving(true);
    setError(null);

    const { data: businessRes, error: businessErr } = await supabase
      .from("businesses")
      .select("booking_rules")
      .eq("id", businessId)
      .single();
    if (businessErr) {
      setError(businessErr.message);
      setSaving(false);
      return;
    }

    const currentRules =
      businessRes?.booking_rules && typeof businessRes.booking_rules === "object" && !Array.isArray(businessRes.booking_rules)
        ? { ...businessRes.booking_rules }
        : {};

    const nextRules = {
      ...currentRules,
      payments: {
        enabled: settings.enabled,
        requireDeposit: settings.requireDeposit,
        depositPct: settings.depositPct,
        allowCard: settings.allowCard,
        allowBankTransfer: settings.allowBankTransfer,
        allowCash: settings.allowCash,
      },
    };

    const { error: updateErr } = await supabase
      .from("businesses")
      .update({ booking_rules: nextRules, updated_at: new Date().toISOString() })
      .eq("id", businessId);
    if (updateErr) setError(updateErr.message);

    setSaving(false);
  };

  if (!businessId) {
    return <div className="text-sm text-muted-foreground">{copy.noBusiness}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
            <Badge className={settings.enabled ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
              {settings.enabled ? copy.active : copy.inactive}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label={copy.paidAmount} value={stats.paidInvoicesAmount} money />
        <KpiCard label={copy.paidCount} value={stats.paidInvoicesCount} />
        <KpiCard label={copy.pendingCount} value={stats.pendingInvoicesCount} />
        <KpiCard label={copy.pendingAmount} value={stats.pendingInvoicesAmount} money />
        <KpiCard label={copy.upcomingBookings} value={stats.upcomingBookingsAmount} money />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.methods}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ToggleRow
            label={copy.active}
            checked={settings.enabled}
            onChange={(checked) => setSettings((prev) => ({ ...prev, enabled: checked }))}
          />
          <ToggleRow
            label={copy.requireDeposit}
            checked={settings.requireDeposit}
            onChange={(checked) => setSettings((prev) => ({ ...prev, requireDeposit: checked }))}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{copy.depositPct}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.depositPct}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  depositPct: Number(event.target.value),
                }))
              }
              className="input-field max-w-xs"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ToggleRow
              label={copy.card}
              checked={settings.allowCard}
              onChange={(checked) => setSettings((prev) => ({ ...prev, allowCard: checked }))}
            />
            <ToggleRow
              label={copy.transfer}
              checked={settings.allowBankTransfer}
              onChange={(checked) => setSettings((prev) => ({ ...prev, allowBankTransfer: checked }))}
            />
            <ToggleRow
              label={copy.cash}
              checked={settings.allowCash}
              onChange={(checked) => setSettings((prev) => ({ ...prev, allowCash: checked }))}
            />
          </div>
          <Button onClick={handleSave} disabled={saving || loading || !canSave} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {copy.save}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, money = false }: { label: string; value: number; money?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{money ? `€${value.toFixed(2)}` : value}</p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
