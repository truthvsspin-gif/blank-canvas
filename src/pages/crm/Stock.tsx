import { useState, useEffect } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, X, Search, BarChart3 } from "lucide-react";

type StockTab = "inventory" | "purchases" | "fixed" | "sales" | "consumption" | "suppliers";

const tabs: { key: StockTab; label: { en: string; es: string } }[] = [
  { key: "inventory", label: { en: "Inventory", es: "Inventario" } },
  { key: "purchases", label: { en: "Purchases", es: "Compras" } },
  { key: "fixed", label: { en: "Fixed Costs", es: "Gastos fijos" } },
  { key: "sales", label: { en: "Sales", es: "Ventas" } },
  { key: "consumption", label: { en: "Material Use", es: "Consumo material" } },
  { key: "suppliers", label: { en: "Suppliers", es: "Proveedores" } },
];

type StockItem = {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  available_qty: number;
  min_qty: number;
  unit: string;
  expiry_date: string | null;
  supplier: string | null;
};

export default function Stock() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<StockTab>("inventory");
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    reference: "",
    available_qty: 0,
    min_qty: 0,
    unit: "units",
    expiry_date: "",
    supplier: "",
  });

  const fetchItems = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("stock_items")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setItems((data as StockItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [businessId]);

  const handleCreate = async () => {
    if (!businessId || !form.name.trim()) return;
    await supabase.from("stock_items").insert({
      business_id: businessId,
      name: form.name.trim(),
      description: form.description || null,
      reference: form.reference || null,
      available_qty: form.available_qty,
      min_qty: form.min_qty,
      unit: form.unit,
      expiry_date: form.expiry_date || null,
      supplier: form.supplier || null,
    });
    setForm({ name: "", description: "", reference: "", available_qty: 0, min_qty: 0, unit: "units", expiry_date: "", supplier: "" });
    setShowCreate(false);
    fetchItems();
  };

  const filtered = items.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(s) ||
      i.reference?.toLowerCase().includes(s) ||
      i.supplier?.toLowerCase().includes(s)
    );
  });

  const columns = [
    { key: "name", label: isEs ? "NOMBRE" : "NAME" },
    { key: "description", label: isEs ? "DESCRIPCIÓN" : "DESCRIPTION" },
    { key: "reference", label: "REF." },
    { key: "available_qty", label: isEs ? "DISPONIBLE" : "AVAILABLE" },
    { key: "min_qty", label: "MIN" },
    { key: "expiry_date", label: isEs ? "CADUCIDAD" : "EXPIRY" },
    { key: "supplier", label: isEs ? "PROVEEDOR" : "SUPPLIER" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs + Stats link */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
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
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BarChart3 className="h-4 w-4" />
          {isEs ? "Ver Estadísticas" : "View Stats"}
        </button>
      </div>

      {/* Inventory tab content */}
      {activeTab === "inventory" ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Table header */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => setShowCreate(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Stock
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
                    <td colSpan={8} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-muted-foreground">
                          {isEs ? "Aún no hay ningún Stock creado" : "No stock items yet"}
                        </p>
                        <p className="text-sm text-muted-foreground/70">
                          {isEs ? "Haz click en " : "Click "}
                          <button
                            onClick={() => setShowCreate(true)}
                            className="text-emerald-600 font-semibold hover:underline"
                          >
                            + Stock
                          </button>
                          {isEs ? " para crear uno nuevo" : " to create one"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.description || "—"}</td>
                      <td className="px-4 py-3">{item.reference || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "font-medium",
                          item.available_qty <= item.min_qty ? "text-red-600" : "text-foreground"
                        )}>
                          {item.available_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.min_qty}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.supplier || "—"}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
          <p className="text-muted-foreground font-medium">
            {isEs ? "Próximamente" : "Coming soon"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {isEs ? "Esta sección estará disponible pronto." : "This section will be available soon."}
          </p>
        </div>
      )}

      {/* Create Stock Drawer */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-background shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{isEs ? "Crear Stock" : "Create Stock"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium">
                  {isEs ? "Nombre" : "Name"} <span className="text-red-500">*</span>
                </label>
                <input
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Descripción" : "Description"}</label>
                <input
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Referencia" : "Reference"}</label>
                <input
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Cantidad disponible" : "Available qty"}</label>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.available_qty}
                  onChange={(e) => setForm({ ...form, available_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Cantidad mínima" : "Minimum qty"}</label>
                <input
                  type="number"
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.min_qty}
                  onChange={(e) => setForm({ ...form, min_qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Unidad de medida" : "Unit"}</label>
                <select
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="units">{isEs ? "Unidades" : "Units"}</option>
                  <option value="liters">{isEs ? "Litros" : "Liters"}</option>
                  <option value="kg">Kg</option>
                  <option value="meters">{isEs ? "Metros" : "Meters"}</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Caducidad" : "Expiry"}</label>
                <input
                  type="date"
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Proveedor" : "Supplier"}</label>
                <input
                  className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder={isEs ? "Escribe para buscar" : "Search..."}
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreate}
                disabled={!form.name.trim()}
              >
                {isEs ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
