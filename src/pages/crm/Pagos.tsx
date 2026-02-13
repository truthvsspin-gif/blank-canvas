import { useEffect, useState, useCallback } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { CreditCard, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PaymentStatus = "paid" | "pending" | "all";

type BookingRow = {
  id: string;
  service_name: string;
  price: number | null;
  status: string;
  payment_status: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  customer_name: string | null;
  work_order_no: string | null;
};

const PAYMENT_BADGE: Record<string, { class: string; labelEs: string; labelEn: string }> = {
  paid: { class: "bg-emerald-100 text-emerald-700 border-emerald-200", labelEs: "Pagado", labelEn: "Paid" },
  pending: { class: "bg-amber-100 text-amber-700 border-amber-200", labelEs: "Pendiente", labelEn: "Pending" },
};

export default function Pagos() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentStatus>("all");
  const [toggling, setToggling] = useState<string | null>(null);

  const copy = isEs
    ? {
        title: "Pagos",
        subtitle: "Controla el estado de pago de las órdenes completadas.",
        all: "Todas",
        paid: "Pagadas",
        pending: "Pendientes",
        service: "Servicio",
        customer: "Cliente",
        price: "Precio",
        status: "Estado pago",
        completedAt: "Completada",
        order: "Orden",
        markPaid: "Marcar pagado",
        markPending: "Marcar pendiente",
        empty: "No hay órdenes completadas aún.",
        noBusiness: "No hay negocio seleccionado.",
        totalCollected: "Total cobrado",
        totalPending: "Pendiente de cobro",
        completedOrders: "Órdenes completadas",
      }
    : {
        title: "Payments",
        subtitle: "Track payment status for completed orders.",
        all: "All",
        paid: "Paid",
        pending: "Pending",
        service: "Service",
        customer: "Customer",
        price: "Price",
        status: "Payment status",
        completedAt: "Completed",
        order: "Order",
        markPaid: "Mark as paid",
        markPending: "Mark as pending",
        empty: "No completed orders yet.",
        noBusiness: "No business selected.",
        totalCollected: "Total collected",
        totalPending: "Pending collection",
        completedOrders: "Completed orders",
      };

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    // Fetch completed bookings with customer info
    const { data } = await supabase
      .from("bookings")
      .select("id, service_name, price, status, scheduled_at, created_at, work_order_no, confirmation_notes, customers(full_name)")
      .eq("business_id", businessId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const mapped: BookingRow[] = (data || []).map((b: any) => {
      // Use confirmation_notes to store payment_status (paid/pending)
      // Default completed orders to "pending" payment
      const paymentStatus = b.confirmation_notes?.startsWith("payment:") 
        ? b.confirmation_notes.replace("payment:", "").trim()
        : "pending";

      return {
        id: b.id,
        service_name: b.service_name,
        price: b.price,
        status: b.status,
        payment_status: paymentStatus,
        scheduled_at: b.scheduled_at,
        completed_at: b.scheduled_at, // use scheduled_at as proxy
        created_at: b.created_at,
        customer_name: b.customers?.full_name || null,
        work_order_no: b.work_order_no,
      };
    });

    setRows(mapped);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePaymentStatus = async (bookingId: string, currentStatus: string) => {
    if (!businessId) return;
    setToggling(bookingId);
    const newStatus = currentStatus === "paid" ? "pending" : "paid";

    await supabase
      .from("bookings")
      .update({ confirmation_notes: `payment:${newStatus}` })
      .eq("id", bookingId)
      .eq("business_id", businessId);

    setRows((prev) =>
      prev.map((r) => (r.id === bookingId ? { ...r, payment_status: newStatus } : r))
    );
    setToggling(null);
  };

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    return r.payment_status === filter;
  });

  const totalCollected = rows
    .filter((r) => r.payment_status === "paid")
    .reduce((acc, r) => acc + (r.price || 0), 0);

  const totalPending = rows
    .filter((r) => r.payment_status === "pending")
    .reduce((acc, r) => acc + (r.price || 0), 0);

  if (!businessId) {
    return <div className="text-sm text-muted-foreground">{copy.noBusiness}</div>;
  }

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Pagos?"
        titleEn="How to use Payments?"
        storageKey="crm-tips-pagos-v2"
        steps={[
          { emoji: "✅", textEs: "Cuando una orden se completa, aparece aquí como 'Pendiente' de pago.", textEn: "When an order is completed, it appears here as 'Pending' payment." },
          { emoji: "💰", textEs: "Haz click en 'Marcar pagado' cuando el cliente pague.", textEn: "Click 'Mark as paid' when the customer pays." },
          { emoji: "📊", textEs: "Usa los filtros para ver solo pagadas o pendientes.", textEn: "Use filters to see only paid or pending orders." },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-xs text-muted-foreground">{copy.totalCollected}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">€{totalCollected.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <p className="text-xs text-muted-foreground">{copy.totalPending}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">€{totalPending.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{copy.completedOrders}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "paid", "pending"] as PaymentStatus[]).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
              filter === key
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-input hover:text-foreground"
            )}
          >
            {key === "all" ? copy.all : key === "paid" ? copy.paid : copy.pending}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.order}</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.customer}</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.service}</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.price}</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.completedAt}</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{copy.status}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">💳</div>
                      <p className="text-muted-foreground font-medium">{copy.empty}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const badge = PAYMENT_BADGE[row.payment_status || "pending"] || PAYMENT_BADGE.pending;
                  return (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/crm/bookings/${row.id}`} className="font-medium text-emerald-700 hover:underline">
                          {row.work_order_no || row.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{row.customer_name || "—"}</td>
                      <td className="px-4 py-3">{row.service_name}</td>
                      <td className="px-4 py-3 font-medium">
                        {row.price != null ? `€${row.price.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.scheduled_at ? new Date(row.scheduled_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn("text-xs border", badge.class)}>
                          {isEs ? badge.labelEs : badge.labelEn}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggling === row.id}
                          onClick={() => togglePaymentStatus(row.id, row.payment_status || "pending")}
                          className="text-xs"
                        >
                          {row.payment_status === "paid" ? copy.markPending : copy.markPaid}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
