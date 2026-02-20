import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  Search,
  Shield,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabaseClient";

type Business = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan_tier: string;
  monthly_conversation_limit: number;
  monthly_ai_reply_limit: number;
  owner_user_id: string | null;
  created_at: string;
  owner_email?: string;
};

export default function SuperAdminPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isEs = lang === "es";

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending_review" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  // Editing limits
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConvLimit, setEditConvLimit] = useState(50);
  const [editReplyLimit, setEditReplyLimit] = useState(100);
  const [editPlanTier, setEditPlanTier] = useState("free");

  const copy = isEs
    ? {
        title: "Super Admin",
        description: "Gestión de negocios registrados, aprobaciones y límites.",
        businesses: "Negocios",
        all: "Todos",
        pending: "Pendientes",
        approved: "Aprobados",
        rejected: "Rechazados",
        approve: "Aprobar",
        reject: "Rechazar",
        suspend: "Suspender",
        search: "Buscar negocio...",
        owner: "Propietario",
        created: "Creado",
        plan: "Plan",
        convLimit: "Límite conversaciones",
        replyLimit: "Límite respuestas IA",
        save: "Guardar",
        editLimits: "Editar límites",
        cancel: "Cancelar",
        noBusinesses: "No hay negocios en esta categoría.",
        notAdmin: "No tienes permisos de administrador.",
        status: "Estado",
      }
    : {
        title: "Super Admin",
        description: "Manage registered businesses, approvals and limits.",
        businesses: "Businesses",
        all: "All",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        approve: "Approve",
        reject: "Reject",
        suspend: "Suspend",
        search: "Search business...",
        owner: "Owner",
        created: "Created",
        plan: "Plan",
        convLimit: "Conversation limit",
        replyLimit: "AI reply limit",
        save: "Save",
        editLimits: "Edit limits",
        cancel: "Cancel",
        noBusinesses: "No businesses in this category.",
        notAdmin: "You don't have admin permissions.",
        status: "Status",
      };

  // Check admin role
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const loadBusinesses = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    let query = supabase
      .from("businesses")
      .select("id, name, domain, status, plan_tier, monthly_conversation_limit, monthly_ai_reply_limit, owner_user_id, created_at")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load businesses", error);
      setBusinesses([]);
    } else {
      // Fetch owner emails
      const ownerIds = [...new Set((data || []).map((b) => b.owner_user_id).filter(Boolean))] as string[];
      let emailMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, email")
          .in("id", ownerIds);
        emailMap = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.email }), {} as Record<string, string>);
      }

      setBusinesses(
        (data || []).map((b) => ({
          ...b,
          owner_email: b.owner_user_id ? emailMap[b.owner_user_id] : undefined,
        }))
      );
    }
    setLoading(false);
  }, [isAdmin, filter]);

  useEffect(() => {
    if (isAdmin) loadBusinesses();
  }, [isAdmin, loadBusinesses]);

  const handleStatusChange = async (businessId: string, newStatus: string) => {
    setSaving(businessId);
    const { error } = await supabase
      .from("businesses")
      .update({ status: newStatus })
      .eq("id", businessId);
    if (!error) {
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, status: newStatus } : b))
      );
    }
    setSaving(null);
  };

  const handleSaveLimits = async (businessId: string) => {
    setSaving(businessId);
    const { error } = await supabase
      .from("businesses")
      .update({
        plan_tier: editPlanTier,
        monthly_conversation_limit: editConvLimit,
        monthly_ai_reply_limit: editReplyLimit,
      })
      .eq("id", businessId);
    if (!error) {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, plan_tier: editPlanTier, monthly_conversation_limit: editConvLimit, monthly_ai_reply_limit: editReplyLimit }
            : b
        )
      );
      setEditingId(null);
    }
    setSaving(null);
  };

  const startEditing = (b: Business) => {
    setEditingId(b.id);
    setEditConvLimit(b.monthly_conversation_limit);
    setEditReplyLimit(b.monthly_ai_reply_limit);
    setEditPlanTier(b.plan_tier);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="size-3 mr-1" />{copy.approved}</Badge>;
      case "pending_review":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="size-3 mr-1" />{copy.pending}</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="size-3 mr-1" />{copy.rejected}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.domain || "").toLowerCase().includes(q) ||
      (b.owner_email || "").toLowerCase().includes(q)
    );
  });

  const counts = {
    all: businesses.length,
    pending_review: businesses.filter((b) => b.status === "pending_review").length,
    approved: businesses.filter((b) => b.status === "approved").length,
    rejected: businesses.filter((b) => b.status === "rejected").length,
  };

  // Not admin
  if (isAdmin === false) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <ShieldAlert className="size-12 text-destructive/60" />
          <p className="text-lg font-medium">{copy.notAdmin}</p>
        </div>
      </div>
    );
  }

  // Loading admin check
  if (isAdmin === null) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={<Badge variant="outline" className="gap-1"><Shield className="size-3" />Admin</Badge>}
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "pending_review", "approved", "rejected"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="gap-1"
          >
            {f === "all" && copy.all}
            {f === "pending_review" && copy.pending}
            {f === "approved" && copy.approved}
            {f === "rejected" && copy.rejected}
            <span className="ml-1 rounded-full bg-background/20 px-1.5 text-xs">
              {counts[f]}
            </span>
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.search}
              className="h-9 rounded-lg border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Business list */}
      {loading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto size-8 mb-2 opacity-40" />
            <p>{copy.noBusinesses}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBusinesses.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      {b.name}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {b.domain && <span>{b.domain}</span>}
                      <span>{copy.owner}: {b.owner_email || "—"}</span>
                      <span>{copy.created}: {new Date(b.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  {statusBadge(b.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Limits row */}
                {editingId === b.id ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{copy.plan}</label>
                      <select
                        value={editPlanTier}
                        onChange={(e) => setEditPlanTier(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="free">Free</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{copy.convLimit}</label>
                      <input
                        type="number"
                        min={0}
                        value={editConvLimit}
                        onChange={(e) => setEditConvLimit(Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">{copy.replyLimit}</label>
                      <input
                        type="number"
                        min={0}
                        value={editReplyLimit}
                        onChange={(e) => setEditReplyLimit(Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveLimits(b.id)}
                        disabled={saving === b.id}
                      >
                        {saving === b.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                        {copy.save}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        {copy.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="outline" className="gap-1">
                      {copy.plan}: {b.plan_tier}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <MessageCircle className="size-3" />
                      {copy.convLimit}: {b.monthly_conversation_limit}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {copy.replyLimit}: {b.monthly_ai_reply_limit}
                    </Badge>
                    <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => startEditing(b)}>
                      {copy.editLimits}
                    </Button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {b.status !== "approved" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                      onClick={() => handleStatusChange(b.id, "approved")}
                      disabled={saving === b.id}
                    >
                      {saving === b.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                      {copy.approve}
                    </Button>
                  )}
                  {b.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1"
                      onClick={() => handleStatusChange(b.id, "rejected")}
                      disabled={saving === b.id}
                    >
                      {saving === b.id ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
                      {copy.reject}
                    </Button>
                  )}
                  {b.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => handleStatusChange(b.id, "pending_review")}
                      disabled={saving === b.id}
                    >
                      <Clock className="size-3" />
                      {copy.suspend}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
