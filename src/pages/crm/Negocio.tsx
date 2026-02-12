import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { BarChart3, ImagePlus, Loader2, Plus, Save, Settings, Trash2, X } from "lucide-react";

import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NegocioTab = "business" | "hours" | "extras" | "images" | "faqs" | "theme";

type BusinessHours = Record<
  string,
  {
    enabled: boolean;
    open: string;
    close: string;
  }
>;

type NegocioSettings = {
  contact: {
    email: string;
    phone: string;
    currency: string;
    timezone: string;
    address: string;
  };
  socials: {
    tiktok: string;
    instagram: string;
    facebook: string;
    youtube: string;
    web: string;
  };
  hours: BusinessHours;
  extras: {
    allowPickup: boolean;
    allowDelivery: boolean;
    automatedReminders: boolean;
  };
  images: string[];
  faqs: Array<{ q: string; a: string }>;
  theme: {
    accentColor: string;
    logoUrl: string;
    coverUrl: string;
  };
};

type BusinessStats = {
  customersTotal: number;
  bookingsThisMonth: number;
  confirmedThisMonth: number;
  workOrdersCompletedThisMonth: number;
  imagesCount: number;
  faqsCount: number;
  openDays: number;
};

const defaultHours: BusinessHours = {
  monday: { enabled: true, open: "09:00", close: "18:00" },
  tuesday: { enabled: true, open: "09:00", close: "18:00" },
  wednesday: { enabled: true, open: "09:00", close: "18:00" },
  thursday: { enabled: true, open: "09:00", close: "18:00" },
  friday: { enabled: true, open: "09:00", close: "18:00" },
  saturday: { enabled: true, open: "09:00", close: "14:00" },
  sunday: { enabled: false, open: "09:00", close: "14:00" },
};

const defaultSettings: NegocioSettings = {
  contact: {
    email: "",
    phone: "",
    currency: "EUR",
    timezone: "Europe/Madrid",
    address: "",
  },
  socials: {
    tiktok: "",
    instagram: "",
    facebook: "",
    youtube: "",
    web: "",
  },
  hours: defaultHours,
  extras: {
    allowPickup: false,
    allowDelivery: false,
    automatedReminders: true,
  },
  images: [],
  faqs: [],
  theme: {
    accentColor: "#16a34a",
    logoUrl: "",
    coverUrl: "",
  },
};

const tabs: { key: NegocioTab; label: { en: string; es: string } }[] = [
  { key: "business", label: { en: "Your Business", es: "Tu negocio" } },
  { key: "hours", label: { en: "Hours", es: "Horarios" } },
  { key: "extras", label: { en: "Extras", es: "Extras" } },
  { key: "images", label: { en: "Images", es: "Imagenes" } },
  { key: "faqs", label: { en: "FAQs", es: "FAQs" } },
  { key: "theme", label: { en: "Theme", es: "Tema" } },
];

const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export default function Negocio() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<NegocioTab>("business");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    business_description: "",
    domain: "",
    language_preference: "",
  });
  const [settings, setSettings] = useState<NegocioSettings>(defaultSettings);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [stats, setStats] = useState<BusinessStats>({
    customersTotal: 0,
    bookingsThisMonth: 0,
    confirmedThisMonth: 0,
    workOrdersCompletedThisMonth: 0,
    imagesCount: 0,
    faqsCount: 0,
    openDays: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("businesses")
        .select("name, business_description, domain, language_preference, booking_rules")
        .eq("id", businessId)
        .single();
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      setForm({
        name: data.name || "",
        business_description: data.business_description || "",
        domain: data.domain || "",
        language_preference: data.language_preference || "",
      });

      const rules = data.booking_rules && typeof data.booking_rules === "object" && !Array.isArray(data.booking_rules) ? data.booking_rules : {};
      const negocio =
        "negocio" in rules && rules.negocio && typeof rules.negocio === "object" && !Array.isArray(rules.negocio)
          ? (rules.negocio as Partial<NegocioSettings>)
          : null;

      setSettings({
        contact: {
          ...defaultSettings.contact,
          ...(negocio?.contact || {}),
        },
        socials: {
          ...defaultSettings.socials,
          ...(negocio?.socials || {}),
        },
        hours: {
          ...defaultHours,
          ...(negocio?.hours || {}),
        },
        extras: {
          ...defaultSettings.extras,
          ...(negocio?.extras || {}),
        },
        images: Array.isArray(negocio?.images) ? negocio.images.filter((v) => typeof v === "string") : [],
        faqs: Array.isArray(negocio?.faqs)
          ? negocio.faqs
              .filter((v): v is { q: string; a: string } => !!v && typeof v.q === "string" && typeof v.a === "string")
              .map((v) => ({ q: v.q, a: v.a }))
          : [],
        theme: {
          ...defaultSettings.theme,
          ...(negocio?.theme || {}),
        },
      });

      setLoading(false);
    };

    load();
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !statsOpen) return;
    const loadStats = async () => {
      setStatsLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [customersRes, bookingsRes, confirmedRes, completedOrdersRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["confirmed", "in_progress", "completed"])
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
        supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd),
      ]);

      setStats({
        customersTotal: customersRes.count || 0,
        bookingsThisMonth: bookingsRes.count || 0,
        confirmedThisMonth: confirmedRes.count || 0,
        workOrdersCompletedThisMonth: completedOrdersRes.count || 0,
        imagesCount: settings.images.length,
        faqsCount: settings.faqs.length,
        openDays: Object.values(settings.hours).filter((day) => day.enabled).length,
      });
      setStatsLoading(false);
    };
    loadStats();
  }, [businessId, settings.faqs.length, settings.hours, settings.images.length, statsOpen]);

  const completion = useMemo(() => {
    let score = 0;
    if (form.name.trim()) score += 1;
    if (settings.contact.email.trim()) score += 1;
    if (settings.contact.phone.trim()) score += 1;
    if (form.domain.trim()) score += 1;
    if (settings.images.length > 0) score += 1;
    return Math.round((score / 5) * 100);
  }, [form.domain, form.name, settings.contact.email, settings.contact.phone, settings.images.length]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    setError(null);

    const { data: current, error: currentError } = await supabase
      .from("businesses")
      .select("booking_rules")
      .eq("id", businessId)
      .single();
    if (currentError) {
      setError(currentError.message);
      setSaving(false);
      return;
    }

    const rules = current.booking_rules && typeof current.booking_rules === "object" && !Array.isArray(current.booking_rules)
      ? { ...current.booking_rules }
      : {};
    const nextRules = { ...rules, negocio: settings };

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        business_description: form.business_description,
        domain: form.domain,
        language_preference: form.language_preference,
        booking_rules: nextRules,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) setError(updateError.message);
    setSaving(false);
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    setSettings((prev) => ({ ...prev, images: [...prev.images, url] }));
    setNewImageUrl("");
  };

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });

  const compressImage = async (file: File) => {
    const src = await toDataUrl(file);
    const image = await loadImage(src);
    const maxSize = 1280;
    const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError(isEs ? "Solo se permiten archivos de imagen." : "Only image files are allowed.");
      event.target.value = "";
      return;
    }
    setUploadError(null);
    setUploadingImage(true);
    try {
      const encoded = await compressImage(file);
      setSettings((prev) => ({ ...prev, images: [...prev.images, encoded] }));
    } catch {
      setUploadError(isEs ? "No se pudo procesar la imagen." : "Could not process the image.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  const dayLabel = (key: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      monday: { en: "Monday", es: "Lunes" },
      tuesday: { en: "Tuesday", es: "Martes" },
      wednesday: { en: "Wednesday", es: "Miercoles" },
      thursday: { en: "Thursday", es: "Jueves" },
      friday: { en: "Friday", es: "Viernes" },
      saturday: { en: "Saturday", es: "Sabado" },
      sunday: { en: "Sunday", es: "Domingo" },
    };
    return labels[key][lang];
  };

  if (!businessId) {
    return <div className="text-sm text-muted-foreground">{isEs ? "No hay negocio seleccionado." : "No business selected."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEs ? "Tu negocio" : "Your Business"}</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-32 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{completion}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStatsOpen(true)}
            type="button"
          >
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver Estadisticas" : "View Stats"}
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

      <div className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
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

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isEs ? "Cargando..." : "Loading..."}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-5">
          {activeTab === "business" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label={isEs ? "Nombre del negocio" : "Business name"}>
                <input className="input-field" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </Field>
              <Field label={isEs ? "Idioma principal" : "Main language"}>
                <select
                  className="input-field"
                  value={form.language_preference}
                  onChange={(event) => setForm((prev) => ({ ...prev, language_preference: event.target.value }))}
                >
                  <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                  <option value="es">Espanol</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={isEs ? "Descripcion" : "Description"}>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  value={form.business_description}
                  onChange={(event) => setForm((prev) => ({ ...prev, business_description: event.target.value }))}
                />
              </Field>
              <Field label={isEs ? "Slug de reservas" : "Booking slug"}>
                <input className="input-field" value={form.domain} onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))} />
              </Field>
              <Field label="Email">
                <input
                  className="input-field"
                  value={settings.contact.email}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, email: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Telefono" : "Phone"}>
                <input
                  className="input-field"
                  value={settings.contact.phone}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, phone: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Moneda" : "Currency"}>
                <select
                  className="input-field"
                  value={settings.contact.currency}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, currency: event.target.value } }))
                  }
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
              <Field label={isEs ? "Zona horaria" : "Timezone"}>
                <input
                  className="input-field"
                  value={settings.contact.timezone}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, timezone: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Direccion" : "Address"}>
                <input
                  className="input-field"
                  value={settings.contact.address}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, address: event.target.value } }))
                  }
                />
              </Field>
              <div className="space-y-3">
                <p className="text-sm font-medium">{isEs ? "Redes sociales" : "Social links"}</p>
                {(["tiktok", "instagram", "facebook", "youtube", "web"] as const).map((key) => (
                  <input
                    key={key}
                    className="input-field"
                    placeholder={key}
                    value={settings.socials[key]}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, socials: { ...prev.socials, [key]: event.target.value } }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="space-y-3">
              {dayKeys.map((day) => (
                <div key={day} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4 sm:items-center">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={settings.hours[day].enabled}
                      onChange={(event) =>
                        setSettings((prev) => ({
                          ...prev,
                          hours: {
                            ...prev.hours,
                            [day]: { ...prev.hours[day], enabled: event.target.checked },
                          },
                        }))
                      }
                    />
                    {dayLabel(day)}
                  </label>
                  <input
                    type="time"
                    className="input-field"
                    value={settings.hours[day].open}
                    disabled={!settings.hours[day].enabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        hours: {
                          ...prev.hours,
                          [day]: { ...prev.hours[day], open: event.target.value },
                        },
                      }))
                    }
                  />
                  <input
                    type="time"
                    className="input-field"
                    value={settings.hours[day].close}
                    disabled={!settings.hours[day].enabled}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        hours: {
                          ...prev.hours,
                          [day]: { ...prev.hours[day], close: event.target.value },
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === "extras" && (
            <div className="grid gap-3 sm:max-w-xl">
              <ToggleRow
                label={isEs ? "Recogida de vehiculo" : "Vehicle pickup"}
                checked={settings.extras.allowPickup}
                onChange={(checked) =>
                  setSettings((prev) => ({ ...prev, extras: { ...prev.extras, allowPickup: checked } }))
                }
              />
              <ToggleRow
                label={isEs ? "Entrega de vehiculo" : "Vehicle delivery"}
                checked={settings.extras.allowDelivery}
                onChange={(checked) =>
                  setSettings((prev) => ({ ...prev, extras: { ...prev.extras, allowDelivery: checked } }))
                }
              />
              <ToggleRow
                label={isEs ? "Recordatorios automaticos" : "Automated reminders"}
                checked={settings.extras.automatedReminders}
                onChange={(checked) =>
                  setSettings((prev) => ({ ...prev, extras: { ...prev.extras, automatedReminders: checked } }))
                }
              />
            </div>
          )}

          {activeTab === "images" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  className="input-field flex-1 min-w-[220px]"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={(event) => setNewImageUrl(event.target.value)}
                />
                <Button onClick={addImage} size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Plus className="mr-1 h-4 w-4" />
                  {isEs ? "Agregar" : "Add"}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  variant="outline"
                  disabled={uploadingImage}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  {uploadingImage ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 h-4 w-4" />}
                  {isEs ? "Subir imagen" : "Upload image"}
                </Button>
              </div>
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              {settings.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">{isEs ? "Sin imagenes." : "No images yet."}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {settings.images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="rounded-lg border p-2 text-sm">
                      <div className="mb-2 aspect-video w-full overflow-hidden rounded bg-muted">
                        <img src={url} alt={`business-${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <div className="mb-2 truncate text-xs text-muted-foreground">{url.startsWith("data:image") ? (isEs ? "Imagen subida" : "Uploaded image") : url}</div>
                      <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, imageIdx) => imageIdx !== idx),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "faqs" && (
            <div className="space-y-3">
              {settings.faqs.length === 0 && <p className="text-sm text-muted-foreground">{isEs ? "Sin FAQs." : "No FAQs yet."}</p>}
              {settings.faqs.map((faq, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border p-3">
                  <input
                    className="input-field"
                    placeholder={isEs ? "Pregunta" : "Question"}
                    value={faq.q}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        faqs: prev.faqs.map((row, rowIdx) => (rowIdx === idx ? { ...row, q: event.target.value } : row)),
                      }))
                    }
                  />
                  <textarea
                    rows={3}
                    className="input-field resize-none"
                    placeholder={isEs ? "Respuesta" : "Answer"}
                    value={faq.a}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        faqs: prev.faqs.map((row, rowIdx) => (rowIdx === idx ? { ...row, a: event.target.value } : row)),
                      }))
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        faqs: prev.faqs.filter((_, rowIdx) => rowIdx !== idx),
                      }))
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {isEs ? "Eliminar" : "Remove"}
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    faqs: [...prev.faqs, { q: "", a: "" }],
                  }))
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                {isEs ? "Agregar FAQ" : "Add FAQ"}
              </Button>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Field label={isEs ? "Color principal" : "Primary color"}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.theme.accentColor}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: event.target.value } }))
                    }
                    className="h-10 w-12 rounded border p-1"
                  />
                  <input
                    className="input-field"
                    value={settings.theme.accentColor}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: event.target.value } }))
                    }
                  />
                </div>
              </Field>
              <Field label={isEs ? "Logo URL" : "Logo URL"}>
                <input
                  className="input-field"
                  value={settings.theme.logoUrl}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, theme: { ...prev.theme, logoUrl: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Portada URL" : "Cover URL"}>
                <input
                  className="input-field"
                  value={settings.theme.coverUrl}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, theme: { ...prev.theme, coverUrl: event.target.value } }))
                  }
                />
              </Field>
            </div>
          )}
        </div>
      )}

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <Button onClick={handleSave} disabled={saving || loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {isEs ? "Guardar" : "Save"}
      </Button>

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatsOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Estadisticas del negocio" : "Business stats"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              {statsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEs ? "Cargando..." : "Loading..."}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatsCard label={isEs ? "Clientes totales" : "Total customers"} value={stats.customersTotal} />
                  <StatsCard label={isEs ? "Reservas este mes" : "Bookings this month"} value={stats.bookingsThisMonth} />
                  <StatsCard label={isEs ? "Confirmadas este mes" : "Confirmed this month"} value={stats.confirmedThisMonth} />
                  <StatsCard label={isEs ? "Ordenes completadas" : "Completed work orders"} value={stats.workOrdersCompletedThisMonth} />
                  <StatsCard label={isEs ? "Imagenes" : "Images"} value={stats.imagesCount} />
                  <StatsCard label={isEs ? "FAQs" : "FAQs"} value={stats.faqsCount} />
                  <StatsCard label={isEs ? "Dias abiertos/semana" : "Open days/week"} value={stats.openDays} />
                  <StatsCard label={isEs ? "Completitud perfil" : "Profile completion"} value={`${completion}%`} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l bg-background shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Ajustes del negocio" : "Business settings"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">{isEs ? "Ir a seccion" : "Go to section"}</p>
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <Button
                      key={tab.key}
                      size="sm"
                      variant={activeTab === tab.key ? "default" : "outline"}
                      onClick={() => {
                        setActiveTab(tab.key);
                        setSettingsOpen(false);
                      }}
                    >
                      {tab.label[lang]}
                    </Button>
                  ))}
                </div>
              </div>
              <Field label={isEs ? "Idioma principal" : "Main language"}>
                <select
                  className="input-field"
                  value={form.language_preference}
                  onChange={(event) => setForm((prev) => ({ ...prev, language_preference: event.target.value }))}
                >
                  <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                  <option value="es">Espanol</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={isEs ? "Moneda" : "Currency"}>
                <select
                  className="input-field"
                  value={settings.contact.currency}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, currency: event.target.value } }))
                  }
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
              <Field label={isEs ? "Zona horaria" : "Timezone"}>
                <input
                  className="input-field"
                  value={settings.contact.timezone}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, timezone: event.target.value } }))
                  }
                />
              </Field>
              <ToggleRow
                label={isEs ? "Recordatorios automaticos" : "Automated reminders"}
                checked={settings.extras.automatedReminders}
                onChange={(checked) =>
                  setSettings((prev) => ({ ...prev, extras: { ...prev.extras, automatedReminders: checked } }))
                }
              />
            </div>
            <div className="sticky bottom-0 border-t bg-background p-6">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={async () => {
                  await handleSave();
                  setSettingsOpen(false);
                }}
                disabled={saving || loading}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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

