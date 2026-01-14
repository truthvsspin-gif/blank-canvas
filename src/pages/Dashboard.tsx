import { useEffect, useState } from "react";
import { Users, Calendar, UserPlus, TrendingUp } from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";

type Metrics = {
  customers: number;
  bookings: number;
  leads: number;
  pendingBookings: number;
};

export default function Dashboard() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();

  const [metrics, setMetrics] = useState<Metrics>({
    customers: 0,
    bookings: 0,
    leads: 0,
    pendingBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      setLoading(true);

      const [customersRes, bookingsRes, leadsRes, pendingRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending"),
      ]);

      setMetrics({
        customers: customersRes.count ?? 0,
        bookings: bookingsRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        pendingBookings: pendingRes.count ?? 0,
      });
      setLoading(false);
    };

    fetchMetrics();
  }, [businessId]);

  const cards = [
    {
      title: isEs ? "Clientes" : "Customers",
      value: metrics.customers,
      icon: Users,
      description: isEs ? "Total de clientes registrados" : "Total registered customers",
    },
    {
      title: isEs ? "Reservas" : "Bookings",
      value: metrics.bookings,
      icon: Calendar,
      description: isEs ? "Total de reservas" : "Total bookings",
    },
    {
      title: isEs ? "Leads" : "Leads",
      value: metrics.leads,
      icon: UserPlus,
      description: isEs ? "Leads capturados" : "Captured leads",
    },
    {
      title: isEs ? "Pendientes" : "Pending",
      value: metrics.pendingBookings,
      icon: TrendingUp,
      description: isEs ? "Reservas pendientes" : "Pending bookings",
    },
  ];

  const isLoading = bizLoading || loading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Dashboard" : "Dashboard"}
        description={
          isEs
            ? "Bienvenido de vuelta. Tu operación diaria y rendimiento a simple vista."
            : "Welcome back. Your daily operations and performance at a glance."
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
