import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
};

/**
 * BusinessGate blocks app routes until the user has an active business.
 * It offers a guided create action that also adds the user as owner.
 */
export function BusinessGate({ children }: Props) {
  const { user } = useAuth();
  const { businessId, loading, error, refresh } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const defaultName = isEs ? "Mi negocio" : "My business";
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState(() => defaultName);

  useEffect(() => {
    setName((prev) => {
      if (prev === "Mi negocio" || prev === "My business") {
        return defaultName;
      }
      return prev;
    });
  }, [defaultName]);

  const suggestedDomain = useMemo(() => {
    const localPart = (user?.email || "workspace").split("@")[0] || "workspace";
    return `${localPart.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.detapro.app`;
  }, [user]);

  const handleCreate = async () => {
    if (!user) {
      setCreateError(isEs ? "Inicia sesion para crear un negocio." : "Sign in to create a business.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setSuccess(null);

    const fullName =
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

    const { error: userErr } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: fullName,
    });
    if (userErr) {
      setCreateError(userErr.message);
      setCreating(false);
      return;
    }

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        name: name.trim() || defaultName,
        domain: suggestedDomain,
        owner_user_id: user.id,
      })
      .select("id, name")
      .single();

    if (bizErr || !business?.id) {
      setCreateError(bizErr?.message || (isEs ? "No se pudo crear el negocio." : "Unable to create business."));
      setCreating(false);
      return;
    }

    const { error: membershipErr } = await supabase.from("memberships").insert({
      business_id: business.id,
      user_id: user.id,
      role: "owner",
    });
    if (membershipErr) {
      setCreateError(membershipErr.message);
      setCreating(false);
      return;
    }

    setSuccess(
      isEs
        ? `Negocio "${business.name}" creado y asignado.`
        : `Business "${business.name}" created and assigned.`
    );
    await refresh();
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          {isEs ? "Verificando tu negocio activo..." : "Checking your active business..."}
        </div>
      </div>
    );
  }

  if (businessId) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-rose-100 bg-rose-50/60 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-white text-rose-600 shadow-inner">
          <Building2 className="size-5" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-rose-700">
            {isEs ? "Necesitas un negocio activo" : "You need an active business"}
          </p>
          <p className="text-sm text-rose-800/80">
            {isEs
              ? "Crea tu primer espacio para habilitar CRM, servicios, reservas y dashboard. Te agregaremos como propietario automaticamente."
              : "Create your first workspace to enable CRM, services, bookings, and dashboard. We will add you as the owner."}
          </p>
          {error ? (
            <p className="text-xs text-rose-700/80">
              {isEs ? "Detalle" : "Details"}: {error}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-rose-600" />
            {isEs ? "Crear negocio ahora" : "Create business now"}
          </CardTitle>
          <CardDescription>
            {isEs ? "Nombre y dominio sugerido para tu espacio." : "Name and suggested domain for your workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[2fr_1.4fr]">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {isEs ? "Nombre del negocio" : "Business name"}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isEs ? "Detalle Pro" : "Detail Pro"}
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {isEs ? "Dominio sugerido" : "Suggested domain"}
              </label>
              <input
                value={suggestedDomain}
                disabled
                className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
              />
            </div>
          </div>

          {createError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createError}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreate}
              className="bg-rose-600 text-white hover:bg-rose-500"
              disabled={creating}
            >
              {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {isEs ? "Crear negocio y continuar" : "Create business and continue"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {isEs
                ? "Configurable luego desde Admin > Espacios."
                : "Configurable later in Admin > Workspaces."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
