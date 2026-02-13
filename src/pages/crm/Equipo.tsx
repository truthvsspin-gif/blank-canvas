import { useMemo, useState, useEffect } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { UsersRound, Phone, Mail, X, User, Palette, Clock3, BarChart3 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TabKey = "equipo" | "fichajes";

const COLOR_OPTIONS = ["#3b82f6", "#f97316", "#eab308", "#d1d5db", "#22c55e", "#86efac", "#93c5fd", "#a78bfa"];

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

type WorkOrderActivity = {
  id: string;
  assigned_to: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  status: string;
};

type ClockRow = {
  memberId: string;
  name: string;
  firstStart: string | null;
  lastComplete: string | null;
  activeOrders: number;
  completedOrders: number;
};

export default function Equipo() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  const [tab, setTab] = useState<TabKey>("equipo");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<WorkOrderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statsOpen, setStatsOpen] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const fetchActivity = async () => {
    if (!businessId) return;
    const start = `${activityDate}T00:00:00.000Z`;
    const end = `${activityDate}T23:59:59.999Z`;
    const { data } = await supabase
      .from("work_orders")
      .select("id, assigned_to, scheduled_at, started_at, completed_at, status")
      .eq("business_id", businessId)
      .or(`scheduled_at.gte.${start},started_at.gte.${start},completed_at.gte.${start}`)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(400);
    setActivities((data as WorkOrderActivity[]) || []);
  };

  useEffect(() => {
    fetchMembers();
  }, [businessId]);

  useEffect(() => {
    fetchActivity();
  }, [businessId, activityDate]);

  const handleSave = async () => {
    if (!businessId || !form.name.trim()) return;
    setSaving(true);
    setSaveNotice(null);
    setSaveError(null);

    const normalizedEmail = form.email.trim().toLowerCase();
    const requestedAccess = normalizedEmail.length > 0;
    let hasAccess = false;

    if (requestedAccess) {
      const membershipRole =
        form.role_title === "admin"
          ? "admin"
          : form.role_title === "manager"
            ? "manager"
            : "member";

      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-team-member", {
        body: {
          businessId,
          email: normalizedEmail,
          fullName: form.name.trim(),
          role: membershipRole,
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (inviteError || !inviteData?.success) {
        setSaveError(
          isEs
            ? `Trabajador creado sin acceso de login. Error invitacion: ${inviteData?.error || inviteError?.message || "desconocido"}`
            : `Worker created without login access. Invite error: ${inviteData?.error || inviteError?.message || "unknown"}`
        );
      } else {
        hasAccess = true;
        setSaveNotice(
          inviteData.invited
            ? (isEs ? "Invitacion enviada por email. El manager puede crear su password y entrar." : "Invite email sent. Manager can set password and log in.")
            : (isEs ? "El usuario ya existia. Se vinculo al negocio y ya puede iniciar sesion." : "User already existed. Linked to this workspace and can log in now.")
        );
      }
    }

    const { error: insertError } = await supabase.from("team_members").insert({
      business_id: businessId,
      name: form.name.trim(),
      phone: form.phone || null,
      color: form.color,
      commission_pct: form.commission_pct ? Number(form.commission_pct) : 0,
      email: normalizedEmail || null,
      role_title: form.role_title || null,
      has_access: hasAccess,
    });

    if (insertError) {
      setSaveError(insertError.message);
      setSaving(false);
      return;
    }

    if (!requestedAccess) {
      setSaveNotice(isEs ? "Trabajador creado." : "Worker created.");
    }

    setForm({ name: "", phone: "", color: "#3b82f6", commission_pct: "", email: "", role_title: "" });
    setDrawerOpen(false);
    setSaving(false);
    fetchMembers();
  };

  const tabs: { key: TabKey; label: string; extra?: boolean }[] = [
    { key: "equipo", label: isEs ? "Equipo" : "Team" },
    { key: "fichajes", label: isEs ? "Fichajes" : "Clock-ins", extra: true },
  ];

  const clockRows: ClockRow[] = useMemo(() => {
    return members.map((member) => {
      const rows = activities.filter((row) => row.assigned_to === member.id);
      const started = rows.map((r) => r.started_at).filter((v): v is string => !!v).sort();
      const completed = rows.map((r) => r.completed_at).filter((v): v is string => !!v).sort();
      return {
        memberId: member.id,
        name: member.name,
        firstStart: started[0] || null,
        lastComplete: completed[completed.length - 1] || null,
        activeOrders: rows.filter((r) => r.status === "in_progress").length,
        completedOrders: rows.filter((r) => r.status === "completed").length,
      };
    });
  }, [activities, members]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const teamStats = useMemo(() => {
    const withAccess = members.filter((member) => member.has_access).length;
    const commissions = members
      .map((member) => Number(member.commission_pct))
      .filter((value) => Number.isFinite(value) && value > 0);
    const avgCommission = commissions.length > 0
      ? commissions.reduce((acc, value) => acc + value, 0) / commissions.length
      : 0;
    const activeOrders = clockRows.reduce((acc, row) => acc + row.activeOrders, 0);
    const completedOrders = clockRows.reduce((acc, row) => acc + row.completedOrders, 0);
    const checkedIn = clockRows.filter((row) => !!row.firstStart).length;
    return {
      totalMembers: members.length,
      withAccess,
      checkedIn,
      activeOrders,
      completedOrders,
      avgCommission,
    };
  }, [clockRows, members]);

  return (
    <div className="space-y-6 relative">
      <CrmGettingStarted
        titleEs="¿Cómo usar Equipo?"
        titleEn="How to use Team?"
        storageKey="crm-tips-equipo"
        steps={[
          { emoji: "1️⃣", textEs: "Haz click en '+ Trabajador' para agregar miembros de tu equipo.", textEn: "Click '+ Worker' to add team members." },
          { emoji: "2️⃣", textEs: "Asigna un color, comisión y rol a cada trabajador.", textEn: "Assign a color, commission and role to each worker." },
          { emoji: "3️⃣", textEs: "En 'Fichajes' puedes ver la actividad diaria de cada trabajador.", textEn: "In 'Clock-ins' you can see daily activity for each worker." },
          { emoji: "💡", textEs: "Los trabajadores con email pueden tener acceso independiente al sistema.", textEn: "Workers with email can have independent system access." },
        ]}
        ctaLabelEs="+ Trabajador"
        ctaLabelEn="+ Worker"
        onCtaClick={() => setDrawerOpen(true)}
      />
      <div className="flex items-center gap-3">
        <UsersRound className="h-7 w-7 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">{isEs ? "Equipo" : "Team"}</h1>
      </div>
      {saveNotice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {saveNotice}
        </div>
      )}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="flex items-center gap-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              tab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
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
        {tab === "equipo" ? (
          <button
            className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground inline-flex items-center gap-1.5"
            onClick={() => setStatsOpen(true)}
            type="button"
          >
            <BarChart3 className="h-4 w-4" />
            {isEs ? "Ver estadisticas" : "View Stats"}
          </button>
        ) : (
          <div className="pb-2">
            <input
              type="date"
              value={activityDate}
              onChange={(event) => setActivityDate(event.target.value)}
              className="rounded-lg border bg-background px-2 py-1 text-xs"
            />
          </div>
        )}
      </div>

      {tab === "equipo" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-7 gap-2 px-4 py-3 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isEs ? "Nombre" : "Name"}</span>
            <span>{isEs ? "Cargo" : "Role"}</span>
            <span>{isEs ? "Telefono" : "Phone"}</span>
            <span>Email</span>
            <span>{isEs ? "Acceso" : "Access"}</span>
            <span>Color</span>
            <span className="flex justify-end">
              <Button size="sm" onClick={() => setDrawerOpen(true)} className="bg-primary text-primary-foreground text-xs">
                + {isEs ? "Trabajador" : "Worker"}
              </Button>
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              {isEs ? "Cargando..." : "Loading..."}
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-muted-foreground mt-4">{isEs ? "Aun no hay ningun trabajador creado" : "No workers created yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isEs ? "Haz click en + Trabajador para crear uno nuevo" : "Click + Worker to create one"}
              </p>
            </div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="grid grid-cols-7 gap-2 px-4 py-3 border-t text-sm items-center">
                <span className="font-medium truncate">{m.name}</span>
                <span className="text-muted-foreground truncate">{m.role_title || "—"}</span>
                <span className="text-muted-foreground truncate">{m.phone || "—"}</span>
                <span className="text-muted-foreground truncate">{m.email || "—"}</span>
                <span>{m.has_access ? "Yes" : "No"}</span>
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
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isEs ? "Trabajador" : "Worker"}</span>
            <span>{isEs ? "Primer inicio" : "First start"}</span>
            <span>{isEs ? "Ultima salida" : "Last completion"}</span>
            <span>{isEs ? "En curso" : "In progress"}</span>
            <span>{isEs ? "Completadas" : "Completed"}</span>
          </div>
          {clockRows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              {isEs ? "Sin actividad para la fecha seleccionada." : "No activity for selected date."}
            </div>
          ) : (
            clockRows.map((row) => (
              <div key={row.memberId} className="grid grid-cols-5 gap-2 border-t px-4 py-3 text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="text-muted-foreground inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(row.firstStart)}</span>
                <span className="text-muted-foreground inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(row.lastComplete)}</span>
                <span>{row.activeOrders}</span>
                <span>{row.completedOrders}</span>
              </div>
            ))
          )}
        </div>
      )}

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatsOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Estadísticas del equipo" : "Team stats"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard label={isEs ? "Miembros totales" : "Total members"} value={teamStats.totalMembers} />
                <StatsCard label={isEs ? "Con acceso al sistema" : "With system access"} value={teamStats.withAccess} />
                <StatsCard label={isEs ? "Con inicio hoy" : "Checked in today"} value={teamStats.checkedIn} />
                <StatsCard label={isEs ? "Órdenes en curso" : "Orders in progress"} value={teamStats.activeOrders} />
                <StatsCard label={isEs ? "Órdenes completadas" : "Orders completed"} value={teamStats.completedOrders} />
                <StatsCard label={isEs ? "Comisión promedio" : "Avg commission"} value={`${teamStats.avgCommission.toFixed(1)}%`} />
                <StatsCard label={isEs ? "Fecha actividad" : "Activity date"} value={activityDate} />
              </div>
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-card shadow-xl flex flex-col h-full animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{isEs ? "Crear Trabajador" : "Create Worker"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {isEs ? "Nombre" : "Name"} <span className="text-destructive">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {isEs ? "Telefono" : "Phone"}
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field"
                />
              </div>

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

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <span className="text-muted-foreground">$</span>
                  {isEs ? "Comision (%)" : "Commission (%)"}
                </label>
                <input
                  type="number"
                  value={form.commission_pct}
                  onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{isEs ? "Acceso independiente" : "Independent access"}</span>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
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
                    className="input-field"
                  >
                    <option value="">{isEs ? "Selecciona..." : "Select..."}</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="worker">{isEs ? "Trabajador" : "Worker"}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
                {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar" : "Save")}
              </Button>
            </div>
          </div>
        </div>
      )}
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
