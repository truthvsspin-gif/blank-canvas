import { useState, useEffect } from "react";
import { UsersRound, Phone, Mail, X, User, Palette } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabKey = "equipo" | "fichajes";

const COLOR_OPTIONS = [
  "#3b82f6", "#f97316", "#eab308", "#d1d5db", "#22c55e", "#86efac", "#93c5fd", "#a78bfa",
];

type TeamMember = {
  id: string;
  name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  has_access: boolean;
  color: string | null;
  commission_pct: number | null;
  created_at: string;
};

export default function Equipo() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  const [tab, setTab] = useState<TabKey>("equipo");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    color: "#3b82f6",
    commission_pct: "",
    email: "",
    role_title: "",
  });

  const fetchMembers = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    setMembers((data as TeamMember[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) return;
    await supabase.from("team_members").insert({
      business_id: businessId,
      name: form.name.trim(),
      phone: form.phone || null,
      color: form.color,
      commission_pct: form.commission_pct ? Number(form.commission_pct) : 0,
      email: form.email || null,
      role_title: form.role_title || null,
      has_access: !!form.email,
    });
    setForm({ name: "", phone: "", color: "#3b82f6", commission_pct: "", email: "", role_title: "" });
    setDrawerOpen(false);
    fetchMembers();
  };

  const tabs: { key: TabKey; label: string; extra?: boolean }[] = [
    { key: "equipo", label: isEs ? "Equipo" : "Team" },
    { key: "fichajes", label: isEs ? "Fichajes" : "Clock-ins", extra: true },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3">
        <UsersRound className="h-7 w-7 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">
          {isEs ? "Equipo" : "Team"}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              tab === t.key
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {t.extra && (
              <span className="ml-1.5 text-[9px] font-bold uppercase bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                EXTRA
              </span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        {tab === "equipo" && (
          <span className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">
            📊 {isEs ? "Ver Estadísticas" : "View Stats"}
          </span>
        )}
      </div>

      {/* Content */}
      {tab === "equipo" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-2 px-4 py-3 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isEs ? "NOMBRE" : "NAME"}</span>
            <span>{isEs ? "CARGO" : "ROLE"}</span>
            <span>{isEs ? "TELÉFONO" : "PHONE"}</span>
            <span>EMAIL</span>
            <span>{isEs ? "¿ACCESO?" : "ACCESS?"}</span>
            <span>COLOR</span>
            <span className="flex justify-end">
              <Button size="sm" onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground text-xs">
                + {isEs ? "Trabajador" : "Worker"}
              </Button>
            </span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              {isEs ? "Cargando..." : "Loading..."}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground mt-4">
                {isEs ? "Aún no hay ningún Trabajador creado" : "No workers created yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isEs ? (
                  <>Haz click en <span className="text-primary font-semibold">+ Trabajador</span> para crear uno nuevo</>
                ) : (
                  <>Click <span className="text-primary font-semibold">+ Worker</span> to create one</>
                )}
              </p>
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="grid grid-cols-7 gap-2 px-4 py-3 border-t text-sm items-center">
                <span className="font-medium truncate">{m.name}</span>
                <span className="text-muted-foreground truncate">{m.role_title || "—"}</span>
                <span className="text-muted-foreground truncate">{m.phone || "—"}</span>
                <span className="text-muted-foreground truncate">{m.email || "—"}</span>
                <span>{m.has_access ? "✅" : "❌"}</span>
                <span>
                  <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: m.color || "#3b82f6" }} />
                </span>
                <span />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "fichajes" && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
          <p className="text-muted-foreground font-medium">
            {isEs ? "Próximamente" : "Coming soon"}
          </p>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-card shadow-xl flex flex-col h-full animate-in slide-in-from-right">
            {/* Drawer header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{isEs ? "Crear Trabajador" : "Create Worker"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {isEs ? "Nombre" : "Name"} <span className="text-destructive">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {isEs ? "Teléfono" : "Phone"}
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Color */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={cn(
                        "h-9 w-9 rounded-lg border-2 transition-all",
                        form.color === c ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Comisión */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <span className="text-muted-foreground">$</span>
                  {isEs ? "Comisión (%)" : "Commission (%)"}
                </label>
                <input
                  type="number"
                  value={form.commission_pct}
                  onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Acceso independiente */}
              <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    🔐 {isEs ? "Crear acceso independiente" : "Create independent access"}
                  </span>
                  <span className="text-[9px] font-bold uppercase bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">EXTRA</span>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    Rol
                  </label>
                  <select
                    value={form.role_title}
                    onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">{isEs ? "Selecciona..." : "Select..."}</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="worker">{isEs ? "Trabajador" : "Worker"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>
                {isEs ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
