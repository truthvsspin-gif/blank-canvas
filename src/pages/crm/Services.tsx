import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { BarChart3, Plus, Search, Settings, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { Service } from "@/types/crm";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type ServiceTab = "services" | "variants" | "surcharges" | "discounts";

type ServiceVariant = {
  id: string;
  name: string;
  description: string;
  showInGuide: boolean;
  active: boolean;
};

type ServiceSurcharge = {
  id: string;
  name: string;
  price: number;
  services: string;
};

type ServiceDiscount = {
  id: string;
  code: string;
  discountPct: number;
  validity: string;
  status: "active" | "inactive";
  services: string;
};

const serviceTabs: { key: ServiceTab; label: { en: string; es: string } }[] = [
  { key: "services", label: { en: "Services", es: "Servicios" } },
  { key: "variants", label: { en: "Variants", es: "Variantes" } },
  { key: "surcharges", label: { en: "Surcharges", es: "Recargos" } },
  { key: "discounts", label: { en: "Discounts", es: "Descuentos" } },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ServicesPage() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [activeTab, setActiveTab] = useState<ServiceTab>("services");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [variants, setVariants] = useState<ServiceVariant[]>([]);
  const [surcharges, setSurcharges] = useState<ServiceSurcharge[]>([]);
  const [discounts, setDiscounts] = useState<ServiceDiscount[]>([]);

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    base_price: "",
    duration_minutes: "",
    is_active: true,
  });
  const [variantForm, setVariantForm] = useState({
    name: "",
    description: "",
    showInGuide: true,
    active: true,
  });
  const [surchargeForm, setSurchargeForm] = useState({
    name: "",
    price: "",
    services: "",
  });
  const [discountForm, setDiscountForm] = useState({
    code: "",
    discountPct: "",
    validity: "",
    status: "active" as "active" | "inactive",
    services: "",
  });

  const storageKey = businessId ? `crm-services-meta:${businessId}` : null;

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

  useEffect(() => {
    fetchServices();
  }, [businessId]);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setVariants([]);
      setSurcharges([]);
      setDiscounts([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        variants?: ServiceVariant[];
        surcharges?: ServiceSurcharge[];
        discounts?: ServiceDiscount[];
      };
      setVariants(parsed.variants || []);
      setSurcharges(parsed.surcharges || []);
      setDiscounts(parsed.discounts || []);
    } catch {
      setVariants([]);
      setSurcharges([]);
      setDiscounts([]);
    }
  }, [storageKey]);

  const persistMeta = (next: {
    variants?: ServiceVariant[];
    surcharges?: ServiceSurcharge[];
    discounts?: ServiceDiscount[];
  }) => {
    if (!storageKey) return;
    const merged = {
      variants,
      surcharges,
      discounts,
      ...next,
    };
    localStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const resetForms = () => {
    setServiceForm({ name: "", description: "", base_price: "", duration_minutes: "", is_active: true });
    setVariantForm({ name: "", description: "", showInGuide: true, active: true });
    setSurchargeForm({ name: "", price: "", services: "" });
    setDiscountForm({ code: "", discountPct: "", validity: "", status: "active", services: "" });
    setShowModal(false);
  };

  const handleCreate = async () => {
    if (!businessId) return;

    if (activeTab === "services") {
      if (!serviceForm.name.trim()) return;
      await supabase.from("services").insert({
        business_id: businessId,
        name: serviceForm.name.trim(),
        description: serviceForm.description || null,
        base_price: serviceForm.base_price ? Number(serviceForm.base_price) : null,
        duration_minutes: serviceForm.duration_minutes ? Number(serviceForm.duration_minutes) : null,
        is_active: serviceForm.is_active,
      });
      await fetchServices();
    } else if (activeTab === "variants") {
      if (!variantForm.name.trim()) return;
      const next = [
        {
          id: uid(),
          name: variantForm.name.trim(),
          description: variantForm.description.trim(),
          showInGuide: variantForm.showInGuide,
          active: variantForm.active,
        },
        ...variants,
      ];
      setVariants(next);
      persistMeta({ variants: next });
    } else if (activeTab === "surcharges") {
      if (!surchargeForm.name.trim()) return;
      const next = [
        {
          id: uid(),
          name: surchargeForm.name.trim(),
          price: Number(surchargeForm.price || 0),
          services: surchargeForm.services.trim(),
        },
        ...surcharges,
      ];
      setSurcharges(next);
      persistMeta({ surcharges: next });
    } else {
      if (!discountForm.code.trim()) return;
      const next = [
        {
          id: uid(),
          code: discountForm.code.trim(),
          discountPct: Number(discountForm.discountPct || 0),
          validity: discountForm.validity.trim(),
          status: discountForm.status,
          services: discountForm.services.trim(),
        },
        ...discounts,
      ];
      setDiscounts(next);
      persistMeta({ discounts: next });
    }

    resetForms();
  };

  const filteredServices = services.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredVariants = variants.filter((v) => !search || `${v.name} ${v.description}`.toLowerCase().includes(search.toLowerCase()));
  const filteredSurcharges = surcharges.filter((s) => !search || `${s.name} ${s.services}`.toLowerCase().includes(search.toLowerCase()));
  const filteredDiscounts = discounts.filter((d) => !search || `${d.code} ${d.services}`.toLowerCase().includes(search.toLowerCase()));

  const createLabel =
    activeTab === "services"
      ? isEs
        ? "Servicio"
        : "Service"
      : activeTab === "variants"
        ? isEs
          ? "Variante"
          : "Variant"
        : activeTab === "surcharges"
          ? isEs
            ? "Recargo"
            : "Surcharge"
          : isEs
            ? "Descuento"
            : "Discount";

  const hasData =
    activeTab === "services"
      ? filteredServices.length > 0
      : activeTab === "variants"
        ? filteredVariants.length > 0
        : activeTab === "surcharges"
          ? filteredSurcharges.length > 0
          : filteredDiscounts.length > 0;

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Servicios?"
        titleEn="How to use Services?"
        storageKey="crm-tips-services"
        steps={[
          { emoji: "1️⃣", textEs: "Haz click en '+ Servicio' para crear tu primer servicio (ej: Lavado Premium).", textEn: "Click '+ Service' to create your first service (e.g. Premium Wash)." },
          { emoji: "2️⃣", textEs: "Define nombre, precio y duración estimada.", textEn: "Set a name, price, and estimated duration." },
          { emoji: "3️⃣", textEs: "Los servicios aparecerán al crear órdenes y en el chatbot.", textEn: "Services will appear when creating orders and in the chatbot." },
          { emoji: "💡", textEs: "Usa 'Variantes' para tamaños, 'Recargos' para extras y 'Descuentos' para promos.", textEn: "Use 'Variants' for sizes, 'Surcharges' for extras, and 'Discounts' for promos." },
        ]}
        ctaLabelEs="+ Servicio"
        ctaLabelEn="+ Service"
        onCtaClick={() => setShowModal(true)}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{isEs ? "Servicios" : "Services"}</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver estadisticas" : "View stats"}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
            {isEs ? "Ajustes" : "Settings"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b">
          {serviceTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "border-b-2 -mb-px px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          <Plus className="mr-1 h-4 w-4" />
          {createLabel}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          placeholder={isEs ? "Escribe para buscar..." : "Search..."}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-4 py-16 text-sm text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</div>
          ) : !hasData ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              {isEs ? `Aun no hay ${createLabel.toLowerCase()}s.` : `No ${createLabel.toLowerCase()}s yet.`}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                {activeTab === "services" && (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Nombre" : "Name"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Descripcion" : "Description"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Precio" : "Price"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Duracion" : "Duration"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Activo" : "Active"}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                )}
                {activeTab === "variants" && (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Nombre" : "Name"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Descripcion" : "Description"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Guia" : "Guide"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Activo" : "Active"}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                )}
                {activeTab === "surcharges" && (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Nombre" : "Name"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Precio" : "Price"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Servicios" : "Services"}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                )}
                {activeTab === "discounts" && (
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Codigo" : "Code"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Descuento" : "Discount"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Validez" : "Validity"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Estado" : "Status"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Servicios" : "Services"}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">{isEs ? "Acciones" : "Actions"}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {activeTab === "services" &&
                  filteredServices.map((service) => (
                    <tr key={service.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{service.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{service.description || "—"}</td>
                      <td className="px-4 py-3">{service.base_price != null ? `€${service.base_price}` : "—"}</td>
                      <td className="px-4 py-3">{service.duration_minutes ? `${service.duration_minutes} min` : "—"}</td>
                      <td className="px-4 py-3">{service.is_active ? (isEs ? "Si" : "Yes") : (isEs ? "No" : "No")}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await supabase.from("services").delete().eq("id", service.id);
                            fetchServices();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === "variants" &&
                  filteredVariants.map((variant) => (
                    <tr key={variant.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{variant.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{variant.description || "—"}</td>
                      <td className="px-4 py-3">{variant.showInGuide ? (isEs ? "Si" : "Yes") : (isEs ? "No" : "No")}</td>
                      <td className="px-4 py-3">{variant.active ? (isEs ? "Si" : "Yes") : (isEs ? "No" : "No")}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const next = variants.filter((row) => row.id !== variant.id);
                            setVariants(next);
                            persistMeta({ variants: next });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === "surcharges" &&
                  filteredSurcharges.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3">€{row.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.services || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const next = surcharges.filter((s) => s.id !== row.id);
                            setSurcharges(next);
                            persistMeta({ surcharges: next });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}

                {activeTab === "discounts" &&
                  filteredDiscounts.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{row.code}</td>
                      <td className="px-4 py-3">{row.discountPct}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.validity || "—"}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.services || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const next = discounts.filter((s) => s.id !== row.id);
                            setDiscounts(next);
                            persistMeta({ discounts: next });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <div className="absolute inset-0 bg-black/30" onClick={resetForms} />
          <div className="relative w-full max-w-lg rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? `Crear ${createLabel}` : `Create ${createLabel}`}</h2>
              <Button variant="ghost" size="icon" onClick={resetForms}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4 p-6">
              {activeTab === "services" && (
                <>
                  <Field label={isEs ? "Nombre" : "Name"}>
                    <input
                      className="input"
                      value={serviceForm.name}
                      onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </Field>
                  <Field label={isEs ? "Descripcion" : "Description"}>
                    <textarea
                      rows={3}
                      className="input resize-none"
                      value={serviceForm.description}
                      onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={isEs ? "Precio base" : "Base price"}>
                      <input
                        type="number"
                        className="input"
                        value={serviceForm.base_price}
                        onChange={(event) => setServiceForm((prev) => ({ ...prev, base_price: event.target.value }))}
                      />
                    </Field>
                    <Field label={isEs ? "Duracion (min)" : "Duration (min)"}>
                      <input
                        type="number"
                        className="input"
                        value={serviceForm.duration_minutes}
                        onChange={(event) => setServiceForm((prev) => ({ ...prev, duration_minutes: event.target.value }))}
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={serviceForm.is_active}
                      onChange={(event) => setServiceForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    />
                    {isEs ? "Activo" : "Active"}
                  </label>
                </>
              )}

              {activeTab === "variants" && (
                <>
                  <Field label={isEs ? "Nombre" : "Name"}>
                    <input className="input" value={variantForm.name} onChange={(event) => setVariantForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Descripcion" : "Description"}>
                    <textarea rows={3} className="input resize-none" value={variantForm.description} onChange={(event) => setVariantForm((prev) => ({ ...prev, description: event.target.value }))} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={variantForm.showInGuide} onChange={(event) => setVariantForm((prev) => ({ ...prev, showInGuide: event.target.checked }))} />
                    {isEs ? "Mostrar en guia" : "Show in guide"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={variantForm.active} onChange={(event) => setVariantForm((prev) => ({ ...prev, active: event.target.checked }))} />
                    {isEs ? "Activo" : "Active"}
                  </label>
                </>
              )}

              {activeTab === "surcharges" && (
                <>
                  <Field label={isEs ? "Nombre" : "Name"}>
                    <input className="input" value={surchargeForm.name} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Precio" : "Price"}>
                    <input type="number" className="input" value={surchargeForm.price} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, price: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Servicios" : "Services"}>
                    <input className="input" value={surchargeForm.services} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, services: event.target.value }))} />
                  </Field>
                </>
              )}

              {activeTab === "discounts" && (
                <>
                  <Field label={isEs ? "Codigo" : "Code"}>
                    <input className="input" value={discountForm.code} onChange={(event) => setDiscountForm((prev) => ({ ...prev, code: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Descuento (%)" : "Discount (%)"}>
                    <input type="number" className="input" value={discountForm.discountPct} onChange={(event) => setDiscountForm((prev) => ({ ...prev, discountPct: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Validez" : "Validity"}>
                    <input className="input" value={discountForm.validity} onChange={(event) => setDiscountForm((prev) => ({ ...prev, validity: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Estado" : "Status"}>
                    <select className="input" value={discountForm.status} onChange={(event) => setDiscountForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}>
                      <option value="active">{isEs ? "Activo" : "Active"}</option>
                      <option value="inactive">{isEs ? "Inactivo" : "Inactive"}</option>
                    </select>
                  </Field>
                  <Field label={isEs ? "Servicios" : "Services"}>
                    <input className="input" value={discountForm.services} onChange={(event) => setDiscountForm((prev) => ({ ...prev, services: event.target.value }))} />
                  </Field>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={resetForms}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {isEs ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(142.1 76.2% 36.3% / 0.3);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
