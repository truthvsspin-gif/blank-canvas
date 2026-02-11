import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Loader2,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type RecentBooking = {
  id: string;
  service_name: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
  customer_id: string | null;
};

type CalendarView = "day" | "week" | "month";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 – 20:00

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export default function CrmPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();

  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [calendarBookings, setCalendarBookings] = useState<RecentBooking[]>([]);
  const [focusDate, setFocusDate] = useState(new Date());
  const [calView, setCalView] = useState<CalendarView>("day");
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map());

  const copy = isEs
    ? {
        workRequests: "Solicitudes de trabajo",
        idleMessage: "No hay solicitudes pendientes en este momento.",
        pendingMessage: "Solicitudes pendientes por revisar.",
        recentOrders: "Últimas órdenes",
        createFirst: "Crea tu primera órden de trabajo",
        newOrder: "+ Orden de trabajo",
        today: "Hoy",
        day: "Día",
        week: "Semana",
        month: "Mes",
        pending: "pendientes",
      }
    : {
        workRequests: "Work Requests",
        idleMessage: "No pending requests at the moment.",
        pendingMessage: "Pending requests waiting for review.",
        recentOrders: "Recent Orders",
        createFirst: "Create your first work order",
        newOrder: "+ Work Order",
        today: "Today",
        day: "Day",
        week: "Week",
        month: "Month",
        pending: "pending",
      };

  const locale = isEs ? "es-ES" : "en-US";

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      const [{ data: bookings }, { count: pCount }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, service_name, status, scheduled_at, created_at, customer_id")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["requested", "pending", "new"]),
      ]);
      setRecentBookings((bookings as RecentBooking[]) || []);
      setPendingCount(pCount || 0);
      setLoading(false);
    };
    fetchData();
  }, [businessId]);

  // Fetch calendar bookings for current view
  useEffect(() => {
    if (!businessId) return;
    const fetchCalendar = async () => {
      const start = startOfDay(focusDate);
      let end: Date;
      if (calView === "day") {
        end = addDays(start, 1);
      } else if (calView === "week") {
        const dayOfWeek = (start.getDay() + 6) % 7;
        const weekStart = addDays(start, -dayOfWeek);
        end = addDays(weekStart, 7);
      } else {
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      }
      const { data } = await supabase
        .from("bookings")
        .select("id, service_name, status, scheduled_at, created_at, customer_id")
        .eq("business_id", businessId)
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      setCalendarBookings((data as RecentBooking[]) || []);

      // Fetch customer names
      const ids = Array.from(
        new Set((data || []).map((b: RecentBooking) => b.customer_id).filter(Boolean))
      ) as string[];
      if (ids.length) {
        const { data: custs } = await supabase
          .from("customers")
          .select("id, full_name")
          .in("id", ids);
        setCustomerMap(new Map((custs || []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])));
      }
    };
    fetchCalendar();
  }, [businessId, focusDate, calView]);

  const dateLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions =
      calView === "day"
        ? { weekday: "long", day: "numeric", month: "short" }
        : calView === "week"
        ? { day: "numeric", month: "short" }
        : { month: "long", year: "numeric" };
    return new Intl.DateTimeFormat(locale, opts).format(focusDate);
  }, [focusDate, calView, locale]);

  const shiftDate = (dir: -1 | 1) => {
    if (calView === "day") setFocusDate((d) => addDays(d, dir));
    else if (calView === "week") setFocusDate((d) => addDays(d, dir * 7));
    else
      setFocusDate(
        (d) => new Date(d.getFullYear(), d.getMonth() + dir, 1)
      );
  };

  // Group calendar bookings by hour for day view
  const bookingsByHour = useMemo(() => {
    const map = new Map<number, RecentBooking[]>();
    calendarBookings.forEach((b) => {
      if (!b.scheduled_at) return;
      const hour = new Date(b.scheduled_at).getHours();
      const list = map.get(hour) || [];
      list.push(b);
      map.set(hour, list);
    });
    return map;
  }, [calendarBookings]);

  const isLoading = bizLoading || loading;

  return (
    <div className="space-y-0">
      {/* Title with badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {copy.workRequests}
          </h1>
          {pendingCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground rounded-full text-xs px-2">
              {pendingCount}
            </Badge>
          )}
        </div>
        <Button asChild size="sm" className="bg-primary text-primary-foreground">
          <Link to="/crm/bookings/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {copy.newOrder}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Work Requests */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 ? copy.pendingMessage : copy.idleMessage}
          </p>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{copy.recentOrders}</h3>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full border-primary/30 text-primary"
              asChild
            >
              <Link to="/crm/bookings/new">
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{isEs ? "Cargando..." : "Loading..."}</span>
            </div>
          ) : recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {copy.createFirst}
            </p>
          ) : (
            <div className="space-y-2">
              {recentBookings.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  to={`/crm/bookings/${b.id}`}
                  className="block rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">
                      {b.service_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] uppercase",
                        b.status === "confirmed" || b.status === "completed"
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                          : b.status === "cancelled"
                          ? "border-destructive/30 text-destructive bg-destructive/5"
                          : "border-amber-300 text-amber-700 bg-amber-50"
                      )}
                    >
                      {b.status}
                    </Badge>
                  </div>
                  {b.scheduled_at && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(b.scheduled_at))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Calendar */}
        <div className="flex-1 min-w-0">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFocusDate(new Date())}
              >
                {copy.today}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-sm font-medium text-foreground capitalize">
              {dateLabel}
            </span>

            <div className="flex items-center rounded-lg border overflow-hidden">
              {(["day", "week", "month"] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors",
                    calView === v
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {v === "day" ? copy.day : v === "week" ? copy.week : copy.month}
                </button>
              ))}
            </div>
          </div>

          {/* Day View - Hourly slots */}
          {calView === "day" && (
            <Card className="border overflow-hidden">
              <CardContent className="p-0">
                <div className="divide-y">
                  {HOURS.map((hour) => {
                    const hourBookings = bookingsByHour.get(hour) || [];
                    return (
                      <div key={hour} className="flex min-h-[48px]">
                        <div className="w-16 shrink-0 py-2 pr-3 text-right text-xs text-muted-foreground border-r">
                          {`${hour}:00`}
                        </div>
                        <div className="flex-1 py-1 px-2">
                          {hourBookings.map((b) => (
                            <Link
                              key={b.id}
                              to={`/crm/bookings/${b.id}`}
                              className="block rounded bg-primary/10 border border-primary/20 px-2 py-1 mb-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                            >
                              <span className="font-medium">{b.service_name}</span>
                              {b.customer_id && customerMap.get(b.customer_id) && (
                                <span className="text-muted-foreground ml-1">
                                  — {customerMap.get(b.customer_id)}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week View */}
          {calView === "week" && (
            <Card className="border overflow-hidden">
              <CardContent className="p-0">
                {(() => {
                  const dayOfWeek = (focusDate.getDay() + 6) % 7;
                  const weekStart = addDays(startOfDay(focusDate), -dayOfWeek);
                  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                  return (
                    <div className="grid grid-cols-7 divide-x">
                      {days.map((day) => {
                        const dayStr = day.toISOString().slice(0, 10);
                        const dayBookings = calendarBookings.filter(
                          (b) => b.scheduled_at && b.scheduled_at.slice(0, 10) === dayStr
                        );
                        const isToday =
                          day.toDateString() === new Date().toDateString();
                        return (
                          <div key={dayStr} className="min-h-[200px] p-2">
                            <div
                              className={cn(
                                "text-xs font-medium mb-2 text-center",
                                isToday
                                  ? "text-primary font-bold"
                                  : "text-muted-foreground"
                              )}
                            >
                              {new Intl.DateTimeFormat(locale, {
                                weekday: "short",
                                day: "numeric",
                              }).format(day)}
                            </div>
                            <div className="space-y-1">
                              {dayBookings.slice(0, 4).map((b) => (
                                <Link
                                  key={b.id}
                                  to={`/crm/bookings/${b.id}`}
                                  className="block rounded bg-primary/10 px-1.5 py-1 text-[10px] text-primary hover:bg-primary/20"
                                >
                                  {b.service_name}
                                </Link>
                              ))}
                              {dayBookings.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{dayBookings.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Month View */}
          {calView === "month" && (
            <Card className="border overflow-hidden">
              <CardContent className="p-0">
                {(() => {
                  const monthStart = new Date(
                    focusDate.getFullYear(),
                    focusDate.getMonth(),
                    1
                  );
                  const startDay = (monthStart.getDay() + 6) % 7;
                  const gridStart = addDays(monthStart, -startDay);
                  const cells = Array.from({ length: 42 }, (_, i) =>
                    addDays(gridStart, i)
                  );
                  return (
                    <div className="grid grid-cols-7">
                      {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                        <div
                          key={d}
                          className="py-2 text-center text-xs font-medium text-muted-foreground border-b"
                        >
                          {d}
                        </div>
                      ))}
                      {cells.map((day) => {
                        const dayStr = day.toISOString().slice(0, 10);
                        const dayBookings = calendarBookings.filter(
                          (b) =>
                            b.scheduled_at &&
                            b.scheduled_at.slice(0, 10) === dayStr
                        );
                        const isCurrentMonth =
                          day.getMonth() === focusDate.getMonth();
                        const isToday =
                          day.toDateString() === new Date().toDateString();
                        return (
                          <div
                            key={dayStr}
                            className={cn(
                              "min-h-[80px] border-b border-r p-1",
                              !isCurrentMonth && "opacity-40"
                            )}
                          >
                            <div
                              className={cn(
                                "text-xs mb-1",
                                isToday
                                  ? "font-bold text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              {day.getDate()}
                            </div>
                            {dayBookings.slice(0, 2).map((b) => (
                              <div
                                key={b.id}
                                className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary truncate mb-0.5"
                              >
                                {b.service_name}
                              </div>
                            ))}
                            {dayBookings.length > 2 && (
                              <div className="text-[9px] text-muted-foreground">
                                +{dayBookings.length - 2}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
