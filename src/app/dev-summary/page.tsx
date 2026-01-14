"use client"

import { useState } from "react"
import { Loader2, Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"

const devEnabled = process.env.NODE_ENV === "development"

export default function DeveloperSummaryPage() {
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const copy = isEs
    ? {
        seedDevOnly: "Seed solo disponible en dev.",
        seedNeedLogin: "Necesitas iniciar sesion para crear un business_id.",
        seedBusinessFail: "No se pudo crear el business_id.",
        seedNotesSkip: "Seed creado. Notas omitidas: tabla notes no disponible.",
        seedCreated: "Seed de demo creado para el negocio actual.",
        seedTitle: "Seed de datos demo",
        seedDesc: "Crea 12 clientes, 6 servicios, 20 bookings y notas demo para el business_id actual (solo dev).",
        seedButton: "Sembrar demo",
      }
    : {
        seedDevOnly: "Seed only available in dev.",
        seedNeedLogin: "You need to sign in to create a business_id.",
        seedBusinessFail: "Unable to create business_id.",
        seedNotesSkip: "Seed created. Notes skipped: notes table not available.",
        seedCreated: "Demo seed created for the current business.",
        seedTitle: "Demo data seed",
        seedDesc: "Creates 12 customers, 6 services, 20 bookings, and demo notes for the current business_id (dev only).",
        seedButton: "Seed demo",
      }

  const seedData = async () => {
    if (!devEnabled) {
      setError(copy.seedDevOnly)
      return
    }
    setLoading(true)
    setMessage(null)
    setError(null)

    let activeBusinessId = businessId
    if (!activeBusinessId) {
      if (!user) {
        setError(copy.seedNeedLogin)
        setLoading(false)
        return
      }
      const fullName =
        typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null
      const { error: userErr } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email ?? "demo@detapro.local",
        full_name: fullName,
      })
      if (userErr) {
        setError(userErr.message)
        setLoading(false)
        return
      }
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name: "Demo Workspace",
          domain: "demo.detapro.local",
          owner_user_id: user.id,
        })
        .select("id")
        .single()
      if (bizErr || !business?.id) {
        setError(bizErr?.message || copy.seedBusinessFail)
        setLoading(false)
        return
      }
      const { error: membershipErr } = await supabase.from("memberships").insert({
        business_id: business.id,
        user_id: user.id,
        role: "owner",
      })
      if (membershipErr) {
        setError(membershipErr.message)
        setLoading(false)
        return
      }
      activeBusinessId = business.id
    }

    const customers = Array.from({ length: 12 }).map((_, i) => ({
      business_id: activeBusinessId,
      full_name: `Cliente Demo ${i + 1}`,
      phone: `+1 555 010${i}`,
      email: `demo${i + 1}@ejemplo.com`,
      vehicle_info: `Vehiculo ${i + 1}`,
      tags: ["demo", "seed"],
      notes: `Nota rapida ${i + 1}`,
    }))

    const services = [
      { name: "Lavado Premium", description: "Exterior e interior", base_price: 49, duration_minutes: 60 },
      { name: "Ceramic Coating", description: "Proteccion avanzada", base_price: 199, duration_minutes: 120 },
      { name: "PPF", description: "Film protector", base_price: 299, duration_minutes: 180 },
      { name: "Interior Detailing", description: "Tapiceria y paneles", base_price: 89, duration_minutes: 90 },
      { name: "Pulido de pintura", description: "Correccion ligera", base_price: 129, duration_minutes: 90 },
      { name: "Motor detailing", description: "Limpieza y proteccion", base_price: 79, duration_minutes: 45 },
    ].map((s) => ({ ...s, business_id: activeBusinessId, is_active: true }))

    const now = new Date()
    const bookings = Array.from({ length: 20 }).map((_, i) => {
      const statusOptions = ["new", "confirmed", "completed", "cancelled"] as const
      const status = statusOptions[i % statusOptions.length]
      const scheduled = new Date(now)
      scheduled.setDate(now.getDate() + i - 4)
      return {
        business_id: activeBusinessId,
        customer_id: null,
        service_name: services[i % services.length].name,
        price: services[i % services.length].base_price,
        status,
        scheduled_at: scheduled.toISOString(),
        source: "manual",
      }
    })

    const { data: insertedCustomers, error: custErr } = await supabase.from("customers").insert(customers).select()
    if (custErr) {
      setError(custErr.message)
      setLoading(false)
      return
    }

    const { error: servErr } = await supabase.from("services").insert(services)
    if (servErr) {
      setError(servErr.message)
      setLoading(false)
      return
    }

    const bookingsWithCustomer = bookings.map((b, idx) => ({
      ...b,
      customer_id: insertedCustomers?.[idx % (insertedCustomers?.length || 1)]?.id ?? null,
    }))

    const { error: bookErr } = await supabase.from("bookings").insert(bookingsWithCustomer)
    if (bookErr) {
      setError(bookErr.message)
      setLoading(false)
      return
    }

    const notes = (insertedCustomers ?? []).slice(0, 6).map((customer, i) => ({
      business_id: activeBusinessId,
      entity_type: "customer",
      entity_id: customer.id,
      message: `Seguimiento demo ${i + 1}: confirmar preferencias del cliente.`,
      created_by: null,
    }))

    if (notes.length > 0) {
      const { error: notesErr } = await supabase.from("notes").insert(notes)
      if (notesErr) {
        if (notesErr.message.toLowerCase().includes("schema cache")) {
          setMessage(copy.seedNotesSkip)
          setLoading(false)
          return
        }
        setError(notesErr.message)
        setLoading(false)
        return
      }
    }

    setMessage(copy.seedCreated)
    setLoading(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-10">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Internal only</p>
        <h1 className="text-3xl font-semibold tracking-tight">Developer Summary - Milestone 1</h1>
        <p className="text-sm text-muted-foreground">
          Quick reference for what is scaffolded and ready for iteration. This page is not part of the end-user
          experience.
        </p>
      </div>

      {devEnabled ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.seedTitle}</p>
              <p className="text-xs text-slate-600">{copy.seedDesc}</p>
            </div>
            <Button onClick={seedData} disabled={loading} className="bg-rose-600 text-white hover:bg-rose-500">
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Rocket className="mr-2 size-4" />}
              {copy.seedButton}
            </Button>
          </div>
          {message ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6 text-sm leading-6 text-foreground">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Project architecture</h2>
          <p>
            Next.js (App Router) with TypeScript, Tailwind v4, and shadcn/ui. Core structure under
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/app</code> for routes,
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/components</code> for UI,
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/services</code> for service layers,
            and config/types/helpers under <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/config</code>,
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/types</code>, and <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/lib</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Supabase connection</h2>
          <p>
            Supabase client via <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/lib/supabaseClient.ts</code>
            with env validation in <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/config/env.ts</code>.
            Schema draft lives in <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">supabase/schema.sql</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Authentication</h2>
          <p>
            Email/password auth via Supabase. Context provider in
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/components/providers/auth-provider.tsx</code>,
            hook at <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/hooks/useAuth.ts</code>,
            protected routes via <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">middleware.ts</code>,
            and auth pages at <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">/login</code> and
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">/signup</code>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">AI placeholder pipeline</h2>
          <p>
            Placeholder AI flow in <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/services/aiPipeline.ts</code>,
            with API entry at <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">/api/chat</code>. No model calls yet;
            ready for routing, lead extraction, and provider wiring.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Dashboard layout</h2>
          <p>
            App shell with top bar and sidebar navigation under
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">src/app/(app)/layout.tsx</code>.
            Placeholder pages for Dashboard, CRM, Chatbot, and Admin with shadcn/ui cards and badges.
          </p>
        </section>
      </div>
    </div>
  )
}
