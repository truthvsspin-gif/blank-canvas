export type Customer = {
  id: string
  business_id: string
  full_name: string
  phone: string | null
  email: string | null
  vehicle_info: string | null
  tags: string[] | null
  notes: string | null
  created_at: string
}

export type Vehicle = {
  id: string
  business_id: string
  customer_id: string
  brand: string | null
  model: string | null
  color: string | null
  license_plate: string | null
  size: string | null
  created_at: string
}

export type Service = {
  id: string
  business_id: string
  name: string
  description: string | null
  base_price: number | null
  duration_minutes: number | null
  is_active: boolean
  is_trojan_horse: boolean
  created_at: string
}

export type Booking = {
  id: string
  business_id: string
  customer_id: string | null
  vehicle_id: string | null
  service_name: string
  price: number | null
  status: string
  scheduled_at: string | null
  source: string | null
  created_at: string
}

export type Note = {
  id: string
  business_id: string
  entity_type: "customer" | "booking"
  entity_id: string
  message: string
  created_by: string | null
  created_at: string
}
