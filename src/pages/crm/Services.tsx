import { FormEvent, useEffect, useState } from "react";
import { Plus, X, BarChart3, Settings, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { Service } from "@/types/crm";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type ServiceTab = "services" | "variants" | "surcharges" | "discounts";

const serviceTabs: { key: ServiceTab; label: { en: string; es: string } }[] = [
  { key: "services", label: { en: "Services", es: "Servicios" } },
  { key: "variants", label: { en: "Variants", es: "Variantes" } },
  { key: "surcharges", label: { en: "Surcharges", es: "Recargos" } },
  { key: "discounts", label: { en: "Discounts", es: "Descuentos" } },
];

type ModalTab = "basic" | "pricing" | "images";

const COLORS = ["#3B82F6", "#F97316", "#EAB308", "#D1D5DB", "#10B981", "#06B6D4", "#6366F1", "#A855F7"];

export default function ServicesPage() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<ServiceTab>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("basic");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", includes: "", guarantee: "",
    base_price: "", duration_minutes: "", is_active: true, is_trojan_horse: false,
    color: COLORS[0], category: "", position: 0,
    featured: false, visible: true,
  });

  const fetchServices = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setServices((data as Service[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [businessId]);

  const resetForm = () => {
    setForm({ name: "", description: "", includes: "", guarantee: "", base_price: "", duration_minutes: "", is_active: true, is_trojan_horse: false, color: COLORS[0], category: "", position: 0, featured: false, visible: true });
    setShowModal(false);
    setModalTab("basic");
  };

  const handleSubmit = async () => {
    if (!businessId || !form.name.trim()) return;
    await supabase.from("services").insert({
      business_id: businessId,
      name: form.name.trim(),
      description: form.description || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      is_active: form.is_active,
      is_trojan_horse: form.is_trojan_horse,
    });
    resetForm();
    fetchServices();
  };

  const filtered = services.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  // Tab-specific columns
  const tabConfigs: Record<ServiceTab, { columns: { key: string; label: string }[]; createLabel: string; emptyLabel: string }> = {
    services: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "price", label: isEs ? "PRECIO (EUR)" : "PRICE (EUR)" },
        { key: "duration", label: isEs ? "DURACIÓN" : "DURATION" },
        { key: "visible", label: "VISIBLE" },
      ],
      createLabel: isEs ? "Servicio" : "Service",
      emptyLabel: isEs ? "Servicio" : "Service",
    },
    variants: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "description", label: isEs ? "DESCRIPCIÓN" : "DESCRIPTION" },
        { key: "guide", label: isEs ? "MOSTRAR EN GUÍA" : "SHOW IN GUIDE" },
        { key: "used", label: isEs ? "¿SE USA?" : "USED?" },
      ],
      createLabel: isEs ? "Variante" : "Variant",
      emptyLabel: isEs ? "Variante" : "Variant",
    },
    surcharges: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "price", label: isEs ? "PRECIO" : "PRICE" },
        { key: "services", label: isEs ? "SERVICIOS" : "SERVICES" },
      ],
      createLabel: isEs ? "Recargo" : "Surcharge",
      emptyLabel: isEs ? "Recargo" : "Surcharge",
    },
    discounts: {
      columns: [
        { key: "code", label: isEs ? "CÓDIGO" : "CODE" },
        { key: "discount", label: isEs ? "DESCUENTO" : "DISCOUNT" },
        { key: "validity", label: isEs ? "VÁLIDEZ" : "VALIDITY" },
        { key: "status", label: isEs ? "ESTADO" : "STATUS" },
        { key: "services", label: isEs ? "SERVICIOS" : "SERVICES" },
      ],
      createLabel: isEs ? "Descuento" : "Discount",
      emptyLabel: isEs ? "Descuento" : "Discount",
    },
  };

  const config = tabConfigs[activeTab];
  const isServicesTab = activeTab === "services";

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{isEs ? "Servicios" : "Services"}</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{isEs ? "Tu página" : "Your page"}</span>
          <span className="text-emerald-600 underline text-xs truncate max-w-[200px]">
            anothertool.es/reservas/...
          </span>
          <button className="text-muted-foreground hover:text-foreground">{isEs ? "Copiar" : "Copy"}</button>
        </div>
      </div>

      {/* Tabs + actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {serviceTabs.map((tab) => (
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
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver Estadísticas" : "View Stats"}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
            {isEs ? "Ajustes" : "Settings"}
          </button>
        </div>
      </div>

      {/* Search bar (services tab only) */}
      {isServicesTab && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder={isEs ? "Escribe para buscar..." : "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border rounded-lg px-3 py-2">
            <ArrowUpDown className="h-4 w-4" />
            {isEs ? "Orden" : "Order"}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {config.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    onClick={() => { resetForm(); setShowModal(true); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {config.createLabel}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-4 py-20 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : (isServicesTab ? filtered : []).length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-muted-foreground">
                        {isEs ? `Aún no hay ningún ${config.emptyLabel} creado` : `No ${config.emptyLabel} yet`}
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        {isEs ? "Haz click en " : "Click "}
                        <button
                          onClick={() => { resetForm(); setShowModal(true); }}
                          className="text-emerald-600 font-semibold hover:underline"
                        >
                          + {config.createLabel}
                        </button>
                        {isEs ? " para crear uno nuevo" : " to create one"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((service) => (
                  <tr key={service.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{service.name}</td>
                    <td className="px-4 py-3">{service.base_price != null ? `${service.base_price}€` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{service.duration_minutes ? `${service.duration_minutes} min` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", service.is_active ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/30" onClick={resetForm} />
          <div className="relative w-full max-w-3xl bg-background rounded-xl shadow-2xl border overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{isEs ? "Crear Servicio" : "Create Service"}</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <ToggleSwitch checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
                  {isEs ? "Destacado" : "Featured"}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <ToggleSwitch checked={form.visible} onChange={(v) => setForm({ ...form, visible: v })} />
                  {isEs ? "Visible en perfil" : "Visible on profile"}
                </label>
                <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-5 w-5" /></Button>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex gap-1 px-6 pt-3 border-b">
              {([
                { key: "basic" as ModalTab, label: isEs ? "Básico" : "Basic" },
                { key: "pricing" as ModalTab, label: isEs ? "Precios" : "Pricing", soon: true },
                { key: "images" as ModalTab, label: isEs ? "Imágenes" : "Images" },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setModalTab(t.key)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px relative",
                    modalTab === t.key
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {t.soon && (
                    <span className="ml-1 text-[9px] uppercase bg-orange-500 text-white px-1 py-0.5 rounded font-bold">
                      {isEs ? "PRONTO" : "SOON"}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {modalTab === "basic" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{isEs ? "Nombre" : "Name"} <span className="text-red-500">*</span></label>
                      <input
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder={isEs ? "Ej: Limpieza integral" : "e.g. Full detail"}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "Descripción" : "Description"}</label>
                      <textarea
                        rows={3}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "¿Qué Incluye?" : "What's included?"}</label>
                      <textarea
                        rows={3}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                        value={form.includes}
                        onChange={(e) => setForm({ ...form, includes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "Garantía" : "Guarantee"}</label>
                      <input
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        placeholder={isEs ? "¿Este servicio incluye alguna garantía?" : "Any guarantee?"}
                        value={form.guarantee}
                        onChange={(e) => setForm({ ...form, guarantee: e.target.value })}
                      />
                    </div>
                  </div>
                  {/* Right */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex gap-2 mt-2">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setForm({ ...form, color: c })}
                            className={cn("h-7 w-7 rounded-full border-2 transition-all", form.color === c ? "border-foreground scale-110" : "border-transparent")}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">{isEs ? "Categoría" : "Category"}</label>
                        <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                          <option value="">{isEs ? "Elige un categoría" : "Choose category"}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">{isEs ? "Posición" : "Position"}</label>
                        <input
                          type="number"
                          className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                          value={form.position}
                          onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "No Disponible" : "Not Available"}</label>
                      <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder={isEs ? "Escribe para buscar" : "Search..."} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "Asignar trabajador" : "Assign worker"}</label>
                      <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder={isEs ? "Escribe para buscar" : "Search..."} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{isEs ? "URL Más Información" : "More Info URL"}</label>
                      <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="https://" />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <ToggleSwitch checked={false} onChange={() => {}} />
                      {isEs ? "Excluir de Pagos" : "Exclude from Payments"}
                    </label>
                  </div>
                </div>
              )}
              {modalTab === "pricing" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{isEs ? "Precios" : "Pricing"}</h3>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                      <Plus className="h-3.5 w-3.5" /> {isEs ? "Precio" : "Price"}
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{isEs ? "Variante" : "Variant"}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{isEs ? "Duración" : "Duration"}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{isEs ? "Tipo de precio" : "Price type"}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{isEs ? "Precio(EUR)" : "Price(EUR)"}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{isEs ? "Precio rebajado(EUR)" : "Discount Price(EUR)"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">{isEs ? "Sin precios" : "No prices"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {modalTab === "images" && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>{isEs ? "Próximamente" : "Coming soon"}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm}>{isEs ? "Cancelar" : "Cancel"}</Button>
              <Button className="bg-muted-foreground/80 hover:bg-muted-foreground text-white" onClick={handleSubmit} disabled={!form.name.trim()}>
                {isEs ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple toggle switch component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-emerald-600" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform",
        checked ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );
}
