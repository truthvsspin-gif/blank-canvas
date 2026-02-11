import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Loader2, Plus, Save, Settings, Trash2 } from "lucide-react";

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

  const [form, setForm] = useState({
    name: "",
    business_description: "",
    domain: "",
    language_preference: "",
  });
  const [settings, setSettings] = useState<NegocioSettings>(defaultSettings);
  const [newImageUrl, setNewImageUrl] = useState("");

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
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver Estadisticas" : "View Stats"}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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
                <input className="input" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </Field>
              <Field label={isEs ? "Idioma principal" : "Main language"}>
                <select
                  className="input"
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
                  className="input resize-none"
                  value={form.business_description}
                  onChange={(event) => setForm((prev) => ({ ...prev, business_description: event.target.value }))}
                />
              </Field>
              <Field label={isEs ? "Slug de reservas" : "Booking slug"}>
                <input className="input" value={form.domain} onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))} />
              </Field>
              <Field label="Email">
                <input
                  className="input"
                  value={settings.contact.email}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, email: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Telefono" : "Phone"}>
                <input
                  className="input"
                  value={settings.contact.phone}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, phone: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Moneda" : "Currency"}>
                <select
                  className="input"
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
                  className="input"
                  value={settings.contact.timezone}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, contact: { ...prev.contact, timezone: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Direccion" : "Address"}>
                <input
                  className="input"
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
                    className="input"
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
                    className="input"
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
                    className="input"
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
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="https://..."
                  value={newImageUrl}
                  onChange={(event) => setNewImageUrl(event.target.value)}
                />
                <Button onClick={addImage} size="sm" className="bg-emerald-600 text-white hover:bg-emerald-500">
                  <Plus className="mr-1 h-4 w-4" />
                  {isEs ? "Agregar" : "Add"}
                </Button>
              </div>
              {settings.images.length === 0 ? (
                <p className="text-sm text-muted-foreground">{isEs ? "Sin imagenes." : "No images yet."}</p>
              ) : (
                <div className="space-y-2">
                  {settings.images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                      <span className="truncate">{url}</span>
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
                    className="input"
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
                    className="input resize-none"
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
                    className="input"
                    value={settings.theme.accentColor}
                    onChange={(event) =>
                      setSettings((prev) => ({ ...prev, theme: { ...prev.theme, accentColor: event.target.value } }))
                    }
                  />
                </div>
              </Field>
              <Field label={isEs ? "Logo URL" : "Logo URL"}>
                <input
                  className="input"
                  value={settings.theme.logoUrl}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, theme: { ...prev.theme, logoUrl: event.target.value } }))
                  }
                />
              </Field>
              <Field label={isEs ? "Portada URL" : "Cover URL"}>
                <input
                  className="input"
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
