import { useState } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TabKey = "orders" | "vehicles" | "customers" | "requests";

const tabs: { key: TabKey; label: { en: string; es: string } }[] = [
  { key: "orders", label: { en: "Orders", es: "Órdenes" } },
  { key: "vehicles", label: { en: "Vehicles", es: "Vehículos" } },
  { key: "customers", label: { en: "Customers", es: "Clientes" } },
  { key: "requests", label: { en: "Requests", es: "Solicitudes" } },
];

export default function Datos() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);

    const fetchData = async () => {
      let result: any[] = [];
      if (activeTab === "orders") {
        const { data } = await supabase
          .from("work_orders")
          .select("*, customers(full_name), vehicles(brand, model, license_plate)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        result = data || [];
      } else if (activeTab === "vehicles") {
        const { data } = await supabase
          .from("vehicles")
          .select("*, customers(full_name)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        result = data || [];
      } else if (activeTab === "customers") {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        result = data || [];
      } else if (activeTab === "requests") {
        const { data } = await supabase
          .from("bookings")
          .select("*, customers(full_name)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false });
        result = data || [];
      }
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [businessId, activeTab]);

  const filtered = data.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return JSON.stringify(item).toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEs ? "Datos" : "Data"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEs
            ? "Consulta y gestiona órdenes, vehículos, clientes y solicitudes."
            : "Browse and manage orders, vehicles, customers and requests."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label[lang]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isEs ? "Buscar..." : "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          {isEs ? "Filtrar" : "Filter"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            {isEs ? "Cargando..." : "Loading..."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {isEs ? "Sin resultados" : "No results"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {activeTab === "orders" && (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Servicio" : "Service"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Cliente" : "Customer"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Vehículo" : "Vehicle"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Estado" : "Status"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Fecha" : "Date"}</th>
                    </>
                  )}
                  {activeTab === "vehicles" && (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Marca" : "Brand"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Modelo" : "Model"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Matrícula" : "Plate"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Propietario" : "Owner"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Color" : "Color"}</th>
                    </>
                  )}
                  {activeTab === "customers" && (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Nombre" : "Name"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Teléfono" : "Phone"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Etiquetas" : "Tags"}</th>
                    </>
                  )}
                  {activeTab === "requests" && (
                    <>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Servicio" : "Service"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Cliente" : "Customer"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Estado" : "Status"}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{isEs ? "Fecha" : "Date"}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    {activeTab === "orders" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.service_name}</td>
                        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3">{item.vehicles ? `${item.vehicles.brand || ""} ${item.vehicles.model || ""}`.trim() || "—" : "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "—"}</td>
                      </>
                    )}
                    {activeTab === "vehicles" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.brand || "—"}</td>
                        <td className="px-4 py-3">{item.model || "—"}</td>
                        <td className="px-4 py-3">{item.license_plate || "—"}</td>
                        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3">{item.color || "—"}</td>
                      </>
                    )}
                    {activeTab === "customers" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.full_name}</td>
                        <td className="px-4 py-3">{item.phone || "—"}</td>
                        <td className="px-4 py-3">{item.email || "—"}</td>
                        <td className="px-4 py-3">
                          {item.tags?.length ? item.tags.map((t: string) => (
                            <Badge key={t} variant="outline" className="text-xs mr-1">{t}</Badge>
                          )) : "—"}
                        </td>
                      </>
                    )}
                    {activeTab === "requests" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.service_name}</td>
                        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize">{item.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "—"}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
