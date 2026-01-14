import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/auth-helpers-nextjs"

import { env } from "@/config/env"

type SeedRequest = {
  businessId?: string
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const body = (await request.json()) as SeedRequest
  const businessId = body.businessId
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId." }, { status: 400 })
  }

  const { data: membership, error: membershipErr } = await supabase
    .from("memberships")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single()

  if (membershipErr || membership?.role !== "owner") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const customers = Array.from({ length: 12 }).map((_, i) => ({
    business_id: businessId,
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
  ].map((service) => ({ ...service, business_id: businessId, is_active: true }))

  const now = new Date()
  const bookings = Array.from({ length: 20 }).map((_, i) => {
    const statusOptions = ["new", "confirmed", "completed", "cancelled"] as const
    const status = statusOptions[i % statusOptions.length]
    const scheduled = new Date(now)
    scheduled.setDate(now.getDate() + i - 4)
    return {
      business_id: businessId,
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
    return NextResponse.json({ error: custErr.message }, { status: 500 })
  }

  const { error: servErr } = await supabase.from("services").insert(services)
  if (servErr) {
    return NextResponse.json({ error: servErr.message }, { status: 500 })
  }

  const bookingsWithCustomer = bookings.map((booking, idx) => ({
    ...booking,
    customer_id: insertedCustomers?.[idx % (insertedCustomers?.length || 1)]?.id ?? null,
  }))

  const { error: bookErr } = await supabase.from("bookings").insert(bookingsWithCustomer)
  if (bookErr) {
    return NextResponse.json({ error: bookErr.message }, { status: 500 })
  }

  const notes = (insertedCustomers ?? []).slice(0, 6).map((customer, i) => ({
    business_id: businessId,
    entity_type: "customer",
    entity_id: customer.id,
    message: `Seguimiento demo ${i + 1}: confirmar preferencias del cliente.`,
    created_by: null,
  }))

  if (notes.length > 0) {
    const { error: notesErr } = await supabase.from("notes").insert(notes)
    if (notesErr && !notesErr.message.toLowerCase().includes("schema cache")) {
      return NextResponse.json({ error: notesErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    message: "Seed de demo creado para el negocio actual.",
    counts: {
      customers: customers.length,
      services: services.length,
      bookings: bookings.length,
      notes: notes.length,
    },
  })
}
