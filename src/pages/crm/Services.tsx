import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { BarChart3, Plus, Search, Settings, Trash2, X, Car } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { Service } from "@/types/crm";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const VEHICLE_SIZES = ["small", "medium", "large", "suv"] as const;
type VehicleSize = (typeof VEHICLE_SIZES)[number];

const SIZE_LABELS: Record<VehicleSize, { en: string; es: string }> = {
  small: { en: "Small", es: "Pequeño" },
  medium: { en: "Medium", es: "Mediano" },
  large: { en: "Large", es: "Grande" },
  suv: { en: "SUV", es: "SUV" },
};

type SizePriceRow = { size: VehicleSize; price: number };
type SizePricesMap = Record<string, SizePriceRow[]>; // keyed by service_id

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

type ServicesSettings = {
  defaultDurationMinutes: number;
  defaultTaxPct: number;
  autoActivateNewServices: boolean;
  showServicesInChatbot: boolean;
};

const serviceTabs: { key: ServiceTab; label: { en: string; es: string } }[] = [
  { key: "services", label: { en: "Services", es: "Servicios" } },
  { key: "variants", label: { en: "Variants", es: "Variantes" } },
  { key: "surcharges", label: { en: "Surcharges", es: "Recargos" } },
  { key: "discounts", label: { en: "Discounts", es: "Descuentos" } },
];

const defaultServicesSettings: ServicesSettings = {
  defaultDurationMinutes: 60,
  defaultTaxPct: 21,
  autoActivateNewServices: true,
  showServicesInChatbot: true,
};

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
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [variants, setVariants] = useState<ServiceVariant[]>([]);
  const [surcharges, setSurcharges] = useState<ServiceSurcharge[]>([]);
  const [discounts, setDiscounts] = useState<ServiceDiscount[]>([]);
  const [pageSettings, setPageSettings] = useState<ServicesSettings>(defaultServicesSettings);

  const [sizePrices, setSizePrices] = useState<SizePricesMap>({});
  const [formSizePrices, setFormSizePrices] = useState<Record<VehicleSize, string>>({
    small: "", medium: "", large: "", suv: "",
  });

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
  const settingsStorageKey = businessId ? `crm-services-settings:${businessId}` : null;

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

  const fetchSizePrices = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("service_size_prices")
      .select("service_id, size, price")
      .eq("business_id", businessId);
    const map: SizePricesMap = {};
    for (const row of data || []) {
      if (!map[row.service_id]) map[row.service_id] = [];
      map[row.service_id].push({ size: row.size as VehicleSize, price: Number(row.price) });
    }
    setSizePrices(map);
  }, [businessId]);

  useEffect(() => {
    fetchServices();
    fetchSizePrices();
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

  useEffect(() => {
    if (!settingsStorageKey) {
      setPageSettings(defaultServicesSettings);
      return;
    }
    const raw = localStorage.getItem(settingsStorageKey);
    if (!raw) {
      setPageSettings(defaultServicesSettings);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<ServicesSettings>;
      setPageSettings({
        defaultDurationMinutes:
          typeof parsed.defaultDurationMinutes === "number"
            ? parsed.defaultDurationMinutes
            : defaultServicesSettings.defaultDurationMinutes,
        defaultTaxPct:
          typeof parsed.defaultTaxPct === "number"
            ? parsed.defaultTaxPct
            : defaultServicesSettings.defaultTaxPct,
        autoActivateNewServices:
          typeof parsed.autoActivateNewServices === "boolean"
            ? parsed.autoActivateNewServices
            : defaultServicesSettings.autoActivateNewServices,
        showServicesInChatbot:
          typeof parsed.showServicesInChatbot === "boolean"
            ? parsed.showServicesInChatbot
            : defaultServicesSettings.showServicesInChatbot,
      });
    } catch {
      setPageSettings(defaultServicesSettings);
    }
  }, [settingsStorageKey]);

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
    setFormSizePrices({ small: "", medium: "", large: "", suv: "" });
    setVariantForm({ name: "", description: "", showInGuide: true, active: true });
    setSurchargeForm({ name: "", price: "", services: "" });
    setDiscountForm({ code: "", discountPct: "", validity: "", status: "active", services: "" });
    setShowModal(false);
  };

  const handleCreate = async () => {
    if (!businessId) return;

    if (activeTab === "services") {
      if (!serviceForm.name.trim()) return;
      const { data: inserted } = await supabase.from("services").insert({
        business_id: businessId,
        name: serviceForm.name.trim(),
        description: serviceForm.description || null,
        base_price: serviceForm.base_price ? Number(serviceForm.base_price) : null,
        duration_minutes: serviceForm.duration_minutes ? Number(serviceForm.duration_minutes) : null,
        is_active: serviceForm.is_active,
      }).select("id").single();

      // Save size prices if any were provided
      if (inserted?.id) {
        const sizePriceRows = VEHICLE_SIZES
          .filter((size) => formSizePrices[size] && Number(formSizePrices[size]) > 0)
          .map((size) => ({
            service_id: inserted.id,
            business_id: businessId,
            size,
            price: Number(formSizePrices[size]),
          }));
        if (sizePriceRows.length > 0) {
          await supabase.from("service_size_prices").insert(sizePriceRows);
        }
      }

      await fetchServices();
      await fetchSizePrices();
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
  const serviceStats = useMemo(() => {
    const activeCount = services.filter((service) => service.is_active).length;
    const prices = services
      .map((service) => Number(service.base_price))
      .filter((value) => Number.isFinite(value) && value > 0);
    const durations = services
      .map((service) => Number(service.duration_minutes))
      .filter((value) => Number.isFinite(value) && value > 0);

    const averagePrice = prices.length > 0 ? prices.reduce((acc, value) => acc + value, 0) / prices.length : 0;
    const averageDuration = durations.length > 0 ? durations.reduce((acc, value) => acc + value, 0) / durations.length : 0;
    const activeDiscounts = discounts.filter((discount) => discount.status === "active").length;
    const surchargeTotal = surcharges.reduce((acc, surcharge) => acc + Number(surcharge.price || 0), 0);

    return {
      totalServices: services.length,
      activeServices: activeCount,
      inactiveServices: Math.max(services.length - activeCount, 0),
      variantsCount: variants.length,
      activeDiscounts,
      averagePrice,
      averageDuration,
      surchargeTotal,
    };
  }, [discounts, services, surcharges, variants.length]);

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

  const saveSettings = () => {
    if (settingsStorageKey) {
      localStorage.setItem(settingsStorageKey, JSON.stringify(pageSettings));
    }
    setSettingsOpen(false);
  };

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
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStatsOpen(true)}
            type="button"
          >
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver estadisticas" : "View stats"}
          </button>
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Precio base" : "Base Price"}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">{isEs ? "Precios por tamaño" : "Size Prices"}</th>
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
                  filteredServices.map((service) => {
                    const sp = sizePrices[service.id] || [];
                    return (
                      <tr key={service.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{service.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{service.description || "—"}</td>
                        <td className="px-4 py-3">{service.base_price != null ? `€${service.base_price}` : "—"}</td>
                        <td className="px-4 py-3">
                          {sp.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sp.map((row) => (
                                <span key={row.size} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                                  {SIZE_LABELS[row.size][lang]}: €{row.price}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{service.duration_minutes ? `${service.duration_minutes} min` : "—"}</td>
                        <td className="px-4 py-3">{service.is_active ? (isEs ? "Si" : "Yes") : (isEs ? "No" : "No")}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              await supabase.from("services").delete().eq("id", service.id);
                              fetchServices();
                              fetchSizePrices();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

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
                      className="input-field"
                      value={serviceForm.name}
                      onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </Field>
                  <Field label={isEs ? "Descripcion" : "Description"}>
                    <textarea
                      rows={3}
                      className="input-field resize-none"
                      value={serviceForm.description}
                      onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={isEs ? "Precio base" : "Base price"}>
                      <input
                        type="number"
                        className="input-field"
                        value={serviceForm.base_price}
                        onChange={(event) => setServiceForm((prev) => ({ ...prev, base_price: event.target.value }))}
                      />
                    </Field>
                    <Field label={isEs ? "Duracion (min)" : "Duration (min)"}>
                      <input
                        type="number"
                        className="input-field"
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

                  {/* Size-based pricing grid */}
                  <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      {isEs ? "Precios por tamaño" : "Prices by size"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Deja en blanco para usar el precio base" : "Leave blank to use base price"}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {VEHICLE_SIZES.map((size) => (
                        <div key={size} className="flex items-center gap-2">
                          <span className="text-xs font-medium w-16">{SIZE_LABELS[size][lang]}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="€"
                            className="input-field flex-1"
                            value={formSizePrices[size]}
                            onChange={(e) =>
                              setFormSizePrices((prev) => ({ ...prev, [size]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "variants" && (
                <>
                  <Field label={isEs ? "Nombre" : "Name"}>
                    <input className="input-field" value={variantForm.name} onChange={(event) => setVariantForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Descripcion" : "Description"}>
                    <textarea rows={3} className="input-field resize-none" value={variantForm.description} onChange={(event) => setVariantForm((prev) => ({ ...prev, description: event.target.value }))} />
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
                    <input className="input-field" value={surchargeForm.name} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, name: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Precio" : "Price"}>
                    <input type="number" className="input-field" value={surchargeForm.price} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, price: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Servicios" : "Services"}>
                    <input className="input-field" value={surchargeForm.services} onChange={(event) => setSurchargeForm((prev) => ({ ...prev, services: event.target.value }))} />
                  </Field>
                </>
              )}

              {activeTab === "discounts" && (
                <>
                  <Field label={isEs ? "Codigo" : "Code"}>
                    <input className="input-field" value={discountForm.code} onChange={(event) => setDiscountForm((prev) => ({ ...prev, code: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Descuento (%)" : "Discount (%)"}>
                    <input type="number" className="input-field" value={discountForm.discountPct} onChange={(event) => setDiscountForm((prev) => ({ ...prev, discountPct: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Validez" : "Validity"}>
                    <input className="input-field" value={discountForm.validity} onChange={(event) => setDiscountForm((prev) => ({ ...prev, validity: event.target.value }))} />
                  </Field>
                  <Field label={isEs ? "Estado" : "Status"}>
                    <select className="input-field" value={discountForm.status} onChange={(event) => setDiscountForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))}>
                      <option value="active">{isEs ? "Activo" : "Active"}</option>
                      <option value="inactive">{isEs ? "Inactivo" : "Inactive"}</option>
                    </select>
                  </Field>
                  <Field label={isEs ? "Servicios" : "Services"}>
                    <input className="input-field" value={discountForm.services} onChange={(event) => setDiscountForm((prev) => ({ ...prev, services: event.target.value }))} />
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

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatsOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Estadisticas de servicios" : "Services stats"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard label={isEs ? "Servicios totales" : "Total services"} value={serviceStats.totalServices} />
              <StatsCard label={isEs ? "Servicios activos" : "Active services"} value={serviceStats.activeServices} />
              <StatsCard label={isEs ? "Servicios inactivos" : "Inactive services"} value={serviceStats.inactiveServices} />
              <StatsCard label={isEs ? "Variantes" : "Variants"} value={serviceStats.variantsCount} />
              <StatsCard label={isEs ? "Descuentos activos" : "Active discounts"} value={serviceStats.activeDiscounts} />
              <StatsCard label={isEs ? "Promedio precio" : "Avg price"} value={`€${serviceStats.averagePrice.toFixed(2)}`} />
              <StatsCard label={isEs ? "Promedio duracion" : "Avg duration"} value={`${Math.round(serviceStats.averageDuration)} min`} />
              <StatsCard label={isEs ? "Recargos acumulados" : "Surcharges total"} value={`€${serviceStats.surchargeTotal.toFixed(2)}`} />
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l bg-background shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Ajustes de servicios" : "Services settings"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4 p-6">
              <Field label={isEs ? "Duracion por defecto (min)" : "Default duration (min)"}>
                <input
                  type="number"
                  className="input-field"
                  value={pageSettings.defaultDurationMinutes}
                  onChange={(event) =>
                    setPageSettings((prev) => ({
                      ...prev,
                      defaultDurationMinutes: Number(event.target.value || 0),
                    }))
                  }
                />
              </Field>
              <Field label={isEs ? "Impuesto por defecto (%)" : "Default tax (%)"}>
                <input
                  type="number"
                  className="input-field"
                  value={pageSettings.defaultTaxPct}
                  onChange={(event) =>
                    setPageSettings((prev) => ({
                      ...prev,
                      defaultTaxPct: Number(event.target.value || 0),
                    }))
                  }
                />
              </Field>
              <ToggleRow
                label={isEs ? "Activar servicios nuevos automaticamente" : "Auto-activate new services"}
                checked={pageSettings.autoActivateNewServices}
                onChange={(checked) =>
                  setPageSettings((prev) => ({ ...prev, autoActivateNewServices: checked }))
                }
              />
              <ToggleRow
                label={isEs ? "Mostrar servicios en chatbot" : "Show services in chatbot"}
                checked={pageSettings.showServicesInChatbot}
                onChange={(checked) =>
                  setPageSettings((prev) => ({ ...prev, showServicesInChatbot: checked }))
                }
              />
            </div>
            <div className="sticky bottom-0 border-t bg-background p-6">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={saveSettings}>
                {isEs ? "Guardar cambios" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

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

function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
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

