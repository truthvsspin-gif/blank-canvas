import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { Link } from "react-router-dom";
import { ClipboardList, Loader2, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { WorkOrder } from "@/types/crm";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type StaffMember = {
  user_id: string;
  users:
    | { full_name: string | null; email: string | null }
    | Array<{ full_name: string | null; email: string | null }>
    | null;
};

type BookingRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  service_name: string;
  status: string;
  assigned_to: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
};

type UnifiedWorkOrder = WorkOrder & {
  source: "work_order" | "booking";
  booking_status: string;
};

const COLUMNS = [
  { key: "open", labelEn: "Pending", labelEs: "Pendientes", color: "text-amber-600", bg: "bg-amber-100" },
  { key: "in_progress", labelEn: "In Progress", labelEs: "En curso", color: "text-blue-600", bg: "bg-blue-100" },
  { key: "completed", labelEn: "Completed", labelEs: "Completadas", color: "text-emerald-600", bg: "bg-emerald-100" },
  { key: "cancelled", labelEn: "Cancelled", labelEs: "Canceladas", color: "text-muted-foreground", bg: "bg-muted" },
] as const;

type WorkColumn = (typeof COLUMNS)[number]["key"];

function mapBookingToWorkStatus(status: string): WorkColumn {
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "no_show") return "cancelled";
  return "open";
}

function mapWorkToBookingStatus(next: WorkColumn, previousBookingStatus: string): string {
  if (next === "in_progress") return "in_progress";
  if (next === "completed") return "completed";
  if (next === "cancelled") return "cancelled";
  if (["requested", "pending", "new"].includes(previousBookingStatus)) return previousBookingStatus;
  return "confirmed";
}

export default function WorkOrdersPage() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<UnifiedWorkOrder[]>([]);
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all");

  const copy = isEs
    ? {
        title: "Ordenes",
        newOrder: "+ Orden de trabajo",
        search: "Escribe para buscar.",
        today: "Hoy",
        week: "Semana",
        month: "Mes",
        all: "Todo",
        loading: "Cargando...",
        emptyPending: "No tienes nuevas ordenes para mostrar. Haz click en + Orden para crear una nueva.",
        emptyProgress: "Aqui se mostraran las ordenes de trabajo en las que estas trabajando.",
        emptyCompleted: "En esta estacion se mostraran las ordenes de trabajo completadas.",
        emptyCancelled: "No hay ordenes canceladas.",
        unassigned: "Sin asignar",
        bookingBadge: "Reserva",
        workOrderBadge: "Orden",
      }
    : {
        title: "Work Orders",
        newOrder: "+ Work Order",
        search: "Search...",
        today: "Today",
        week: "Week",
        month: "Month",
        all: "All",
        loading: "Loading...",
        emptyPending: "No new orders to show. Click + Order to create one.",
        emptyProgress: "Orders currently being worked on will appear here.",
        emptyCompleted: "Completed orders will appear here.",
        emptyCancelled: "No cancelled orders.",
        unassigned: "Unassigned",
        bookingBadge: "Booking",
        workOrderBadge: "Work order",
      };

  const emptyMessages: Record<WorkColumn, string> = {
    open: copy.emptyPending,
    in_progress: copy.emptyProgress,
    completed: copy.emptyCompleted,
    cancelled: copy.emptyCancelled,
  };

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [{ data: workOrdersData }, { data: bookingsData }, { data: membershipData }] = await Promise.all([
      supabase.from("work_orders").select("*").eq("business_id", businessId).order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("bookings")
        .select("id, business_id, customer_id, vehicle_id, service_name, status, assigned_to, scheduled_at, created_at, updated_at")
        .eq("business_id", businessId)
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase.from("memberships").select("user_id, users(full_name, email)").eq("business_id", businessId),
    ]);

    const realOrders = ((workOrdersData as WorkOrder[]) || []).map<UnifiedWorkOrder>((row) => ({
      ...row,
      source: "work_order",
      booking_status: row.status,
    }));

    const existingBookingIds = new Set(realOrders.map((row) => row.booking_id));
    const syntheticFromBookings = ((bookingsData as BookingRow[]) || [])
      .filter((booking) => !existingBookingIds.has(booking.id))
      .map<UnifiedWorkOrder>((booking) => ({
        id: `booking:${booking.id}`,
        business_id: booking.business_id,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        vehicle_id: booking.vehicle_id,
        service_name: booking.service_name,
        status: mapBookingToWorkStatus(booking.status),
        assigned_to: booking.assigned_to,
        scheduled_at: booking.scheduled_at,
        started_at: null,
        completed_at: null,
        notes: null,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        source: "booking",
        booking_status: booking.status,
      }));

    const merged = [...realOrders, ...syntheticFromBookings].sort((a, b) => {
      const at = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bt = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return at - bt;
    });
    setOrders(merged);

    const memberships = (membershipData as StaffMember[]) || [];
    const map = new Map<string, string>();
    memberships.forEach((member) => {
      const user = Array.isArray(member.users) ? member.users[0] : member.users;
      map.set(member.user_id, user?.full_name || user?.email || member.user_id);
    });
    setStaffMap(map);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (order: UnifiedWorkOrder, status: WorkColumn) => {
    if (!businessId) return;
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: nowIso };
    if (status === "in_progress") patch.started_at = nowIso;
    if (status === "completed") patch.completed_at = nowIso;

    if (order.source === "work_order") {
      await supabase.from("work_orders").update(patch).eq("business_id", businessId).eq("id", order.id);
    } else {
      await supabase.from("work_orders").upsert(
        {
          business_id: businessId,
          booking_id: order.booking_id,
          customer_id: order.customer_id,
          vehicle_id: order.vehicle_id,
          service_name: order.service_name,
          assigned_to: order.assigned_to,
          scheduled_at: order.scheduled_at,
          status,
          started_at: status === "in_progress" ? nowIso : null,
          completed_at: status === "completed" ? nowIso : null,
          updated_at: nowIso,
        },
        { onConflict: "booking_id" }
      );
    }

    const bookingStatus = mapWorkToBookingStatus(status, order.booking_status);
    await supabase.from("bookings").update({ status: bookingStatus, updated_at: nowIso }).eq("business_id", businessId).eq("id", order.booking_id);

    load();
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (search && !order.service_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (timeFilter === "all") return true;
      const now = new Date();
      const scheduled = order.scheduled_at ? new Date(order.scheduled_at) : null;
      if (!scheduled) return false;
      if (timeFilter === "today") return scheduled.toDateString() === now.toDateString();
      if (timeFilter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        return scheduled >= weekAgo;
      }
      return scheduled.getMonth() === now.getMonth() && scheduled.getFullYear() === now.getFullYear();
    });
  }, [orders, search, timeFilter]);

  const locale = isEs ? "es-ES" : "en-US";

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Órdenes de Trabajo?"
        titleEn="How to use Work Orders?"
        storageKey="crm-tips-work-orders"
        steps={[
          { emoji: "1️⃣", textEs: "Las órdenes se crean automáticamente al confirmar una reserva.", textEn: "Work orders are created automatically when a booking is confirmed." },
          { emoji: "2️⃣", textEs: "Arrastra las órdenes entre columnas: Pendiente → En curso → Completada.", textEn: "Move orders between columns: Pending → In Progress → Completed." },
          { emoji: "3️⃣", textEs: "Usa los filtros de tiempo (Hoy, Semana, Mes) para enfocarte en lo urgente.", textEn: "Use time filters (Today, Week, Month) to focus on what's urgent." },
          { emoji: "💡", textEs: "Haz click en '+ Orden de trabajo' o crea una reserva para generar una nueva.", textEn: "Click '+ Work Order' or create a booking to generate a new one." },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
          <Button asChild size="sm" className="bg-primary text-primary-foreground">
            <Link to="/crm/bookings/new">{copy.newOrder}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.search}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background w-48 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex items-center rounded-lg border overflow-hidden">
            {(["today", "week", "month", "all"] as const).map((timeKey) => (
              <button
                key={timeKey}
                onClick={() => setTimeFilter(timeKey)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  timeFilter === timeKey ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {timeKey === "today" ? copy.today : timeKey === "week" ? copy.week : timeKey === "month" ? copy.month : copy.all}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {copy.loading}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnOrders = filtered.filter((order) => order.status === column.key);
            return (
              <div key={column.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={cn("text-sm font-bold", column.color)}>{isEs ? column.labelEs : column.labelEn}</h3>
                  <Badge variant="secondary" className={cn("text-xs font-bold", column.bg, column.color)}>
                    {columnOrders.length}
                  </Badge>
                </div>

                <div className="h-px bg-border" />

                {columnOrders.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/50 p-6 text-center">
                    <p className="text-xs text-muted-foreground leading-relaxed">{emptyMessages[column.key]}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {columnOrders.map((order) => (
                      <Card key={order.id} className="border shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-foreground">{order.service_name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {order.source === "booking" ? copy.bookingBadge : copy.workOrderBadge}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              {staffMap.get(order.assigned_to || "") || copy.unassigned}
                            </div>
                            {order.scheduled_at && (
                              <div className="flex items-center gap-1.5">
                                <ClipboardList className="h-3 w-3" />
                                {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(order.scheduled_at))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 pt-1 flex-wrap">
                            {COLUMNS.filter((target) => target.key !== column.key && target.key !== "cancelled").map((target) => (
                              <button
                                key={target.key}
                                onClick={() => updateStatus(order, target.key)}
                                className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-colors", target.bg, target.color, "hover:opacity-80")}
                              >
                                {isEs ? target.labelEs : target.labelEn}
                              </button>
                            ))}
                          </div>
                          <Button variant="ghost" size="sm" asChild className="px-0 text-xs h-6">
                            <Link to={`/crm/bookings/${order.booking_id}`}>{isEs ? "Ver reserva" : "View booking"}</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
