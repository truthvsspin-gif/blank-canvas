import { useState, useEffect } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Search, BarChart3, Settings } from "lucide-react";

type DocTab = "invoices" | "estimates" | "delivery_notes" | "receipts";

const docTabs: { key: DocTab; dbType: string; label: { en: string; es: string } }[] = [
  { key: "invoices", dbType: "invoice", label: { en: "Invoices", es: "Facturas" } },
  { key: "estimates", dbType: "estimate", label: { en: "Estimates", es: "Presupuestos" } },
  { key: "delivery_notes", dbType: "delivery_note", label: { en: "Delivery Notes", es: "Albaranes" } },
  { key: "receipts", dbType: "receipt", label: { en: "Receipts", es: "Recepciones" } },
];

type Doc = {
  id: string;
  doc_type: string;
  doc_number: string | null;
  order_id: string | null;
  customer_id: string | null;
  created_at: string;
  taxes: number;
  total: number;
  status: string;
  customers?: { full_name: string } | null;
};

export default function Docs() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<DocTab>("invoices");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const currentDbType = docTabs.find((t) => t.key === activeTab)!.dbType;

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    supabase
      .from("documents")
      .select("*, customers(full_name)")
      .eq("business_id", businessId)
      .eq("doc_type", currentDbType)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDocs((data as Doc[]) || []);
        setLoading(false);
      });
  }, [businessId, currentDbType]);

  const filtered = docs.filter((d) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.doc_number?.toLowerCase().includes(s) ||
      d.customers?.full_name?.toLowerCase().includes(s) ||
      d.status.toLowerCase().includes(s)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-100 text-blue-700",
      paid: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const createLabel = {
    invoices: isEs ? "+ Factura" : "+ Invoice",
    estimates: isEs ? "+ Presupuesto" : "+ Estimate",
    delivery_notes: isEs ? "+ Albarán" : "+ Delivery Note",
    receipts: isEs ? "+ Recepción" : "+ Receipt",
  };

  return (
    <div className="space-y-6">
      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {docTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver Estadísticas" : "View Stats"}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-4 w-4" />
            {isEs ? "Ajustes" : "Settings"}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={isEs ? "Escribe para buscar..." : "Search..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "Nº PRESUPUESTO" : "DOC #"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "ORDEN" : "ORDER"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "CLIENTE" : "CLIENT"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "CREADO" : "CREATED"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "IMPUESTOS" : "TAXES"}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  TOTAL
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                  {isEs ? "ESTADO" : "STATUS"}
                </th>
                <th className="px-4 py-3 text-right">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                    {createLabel[activeTab]}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {/* Skeleton placeholder rows like reference */}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <div
                            key={j}
                            className="h-4 rounded bg-muted animate-pulse"
                            style={{ width: `${60 + Math.random() * 80}px` }}
                          />
                        ))}
                      </div>
                    ))}
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{doc.doc_number || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.order_id ? doc.order_id.slice(0, 8) : "—"}</td>
                    <td className="px-4 py-3">{doc.customers?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.taxes ? `€${doc.taxes.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 font-medium">{doc.total ? `€${doc.total.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-xs capitalize", statusBadge(doc.status))}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
