import { useState, useEffect } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3, Settings, Plus } from "lucide-react";

type NegocioTab = "business" | "hours" | "extras" | "images" | "faqs" | "theme";

const tabs: { key: NegocioTab; label: { en: string; es: string }; soon?: boolean }[] = [
  { key: "business", label: { en: "Your Business", es: "Tu negocio" } },
  { key: "hours", label: { en: "Hours", es: "Horarios" } },
  { key: "extras", label: { en: "Extras", es: "Extras" } },
  { key: "images", label: { en: "Images", es: "Imágenes" } },
  { key: "faqs", label: { en: "FAQs", es: "FAQs" }, soon: true },
  { key: "theme", label: { en: "Theme", es: "Tema" }, soon: true },
];

export default function Negocio() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<NegocioTab>("business");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    business_description: "",
    domain: "",
    office_hours: "",
    language_preference: "",
    // Social links stored in greeting_message as JSON (reusing field)
    tiktok: "",
    instagram: "",
    facebook: "",
    youtube: "",
    web: "",
  });

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("name, business_description, domain, office_hours, language_preference, greeting_message")
        .eq("id", businessId)
        .single();
      if (data) {
        let socials = { tiktok: "", instagram: "", facebook: "", youtube: "", web: "" };
        try {
          const parsed = typeof data.greeting_message === "string" ? JSON.parse(data.greeting_message) : null;
          if (parsed?.socials) socials = { ...socials, ...parsed.socials };
        } catch {}
        setForm({
          name: data.name || "",
          business_description: data.business_description || "",
          domain: data.domain || "",
          office_hours: data.office_hours || "",
          language_preference: data.language_preference || "",
          ...socials,
        });
      }
    })();
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    const socials = { tiktok: form.tiktok, instagram: form.instagram, facebook: form.facebook, youtube: form.youtube, web: form.web };
    await supabase
      .from("businesses")
      .update({
        name: form.name,
        business_description: form.business_description,
        domain: form.domain,
        office_hours: form.office_hours,
        language_preference: form.language_preference,
        greeting_message: JSON.stringify({ socials }),
      })
      .eq("id", businessId);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEs ? "Tu negocio" : "Your Business"}
          </h1>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-32 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground ml-1">30%</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{isEs ? "Tu página" : "Your page"}</span>
          <span className="text-emerald-600 underline text-xs truncate max-w-[200px]">
            anothertool.es/reservas/...
          </span>
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            {isEs ? "Copiar" : "Copy"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap relative",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
              {tab.soon && (
                <span className="ml-1 text-[9px] uppercase bg-orange-500 text-white px-1 py-0.5 rounded font-bold">
                  {isEs ? "PRONTO" : "SOON"}
                </span>
              )}
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

      {/* Tab content */}
      {activeTab === "business" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column */}
          <div className="space-y-6">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">{isEs ? "Nombre del negocio" : "Business name"}</label>
                <input
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            {/* Short description */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{isEs ? "Descripción corta" : "Short description"}</span>
                <button className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">+</button>
              </div>
            </div>

            {/* About us */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{isEs ? "Sobre nosotros" : "About us"}</span>
                <button className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">+</button>
              </div>
            </div>

            {/* Link */}
            <div>
              <label className="text-sm font-medium">{isEs ? "Elige tu link anothertool.es/reservas/" : "Choose your link"}</label>
              <input
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium">{isEs ? "Email del negocio" : "Business email"}</label>
              <input
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={form.business_description}
                onChange={(e) => setForm({ ...form, business_description: e.target.value })}
                placeholder="email@business.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm font-medium">{isEs ? "Teléfono" : "Phone"}</label>
              <input
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={form.office_hours}
                onChange={(e) => setForm({ ...form, office_hours: e.target.value })}
                placeholder="+34..."
              />
            </div>

            {/* Currency + Timezone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{isEs ? "Moneda" : "Currency"}</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  <option value="eur">€</option>
                  <option value="usd">$</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{isEs ? "Zona Horaria" : "Timezone"}</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                  <option value="europe">UTC+2 Europe/...</option>
                  <option value="us_east">UTC-5 US/Eastern</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {isEs ? "Elegir dirección" : "Choose address"}
            </Button>
          </div>

          {/* Right column - Social links */}
          <div className="space-y-5">
            {[
              { key: "tiktok", label: "Tiktok", icon: "♪" },
              { key: "instagram", label: "Instagram", icon: "📷" },
              { key: "facebook", label: "Facebook", icon: "f" },
              { key: "youtube", label: "Youtube", icon: "▶" },
              { key: "web", label: "Web", icon: "🌐" },
            ].map((social) => (
              <div key={social.key}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{social.icon}</span>
                  <label className="text-sm font-medium">{social.label}</label>
                </div>
                <input
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="https://"
                  value={(form as any)[social.key]}
                  onChange={(e) => setForm({ ...form, [social.key]: e.target.value })}
                />
              </div>
            ))}

            <Button
              className="w-full bg-muted-foreground/80 hover:bg-muted-foreground text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar" : "Save")}
            </Button>
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
    </div>
  );
}
