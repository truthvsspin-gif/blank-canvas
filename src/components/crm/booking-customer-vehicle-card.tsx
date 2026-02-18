import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, Pencil, X, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import type { Customer, Vehicle } from "@/types/crm"

interface Props {
  customer: Customer | null
  vehicle: Vehicle | null
  businessId: string
  onCustomerUpdated: (c: Customer) => void
  onVehicleUpdated: (v: Vehicle) => void
}

export function BookingCustomerVehicleCard({
  customer,
  vehicle,
  businessId,
  onCustomerUpdated,
  onVehicleUpdated,
}: Props) {
  const [editingCustomerName, setEditingCustomerName] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [savingCustomer, setSavingCustomer] = useState(false)

  const [editingPlate, setEditingPlate] = useState(false)
  const [plate, setPlate] = useState("")
  const [savingVehicle, setSavingVehicle] = useState(false)

  const startEditCustomerName = () => {
    setCustomerName(customer?.full_name || "")
    setEditingCustomerName(true)
  }

  const saveCustomerName = async () => {
    if (!customer || !customerName.trim()) return
    setSavingCustomer(true)
    const { data, error } = await supabase
      .from("customers")
      .update({ full_name: customerName.trim() })
      .eq("id", customer.id)
      .eq("business_id", businessId)
      .select("*")
      .single()
    setSavingCustomer(false)
    if (!error && data) {
      onCustomerUpdated(data as Customer)
      setEditingCustomerName(false)
    }
  }

  const startEditPlate = () => {
    setPlate(vehicle?.license_plate || "")
    setEditingPlate(true)
  }

  const savePlate = async () => {
    if (!vehicle) return
    setSavingVehicle(true)
    const { data, error } = await supabase
      .from("vehicles")
      .update({ license_plate: plate.trim() || null })
      .eq("id", vehicle.id)
      .eq("business_id", businessId)
      .select("*")
      .single()
    setSavingVehicle(false)
    if (!error && data) {
      onVehicleUpdated(data as Vehicle)
      setEditingPlate(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer & Vehicle</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        {customer ? (
          <div className="space-y-1">
            {editingCustomerName ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveCustomerName()
                    if (e.key === "Escape") setEditingCustomerName(false)
                  }}
                  className="input-field flex-1 text-sm px-2 py-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-emerald-600"
                  onClick={saveCustomerName}
                  disabled={savingCustomer}
                >
                  {savingCustomer ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  onClick={() => setEditingCustomerName(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <p className="font-medium">{customer.full_name}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={startEditCustomerName}
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
            )}
            {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
            {customer.email && <p className="text-muted-foreground">{customer.email}</p>}
            <Link to={`/crm/customers/${customer.id}`} className="text-xs text-primary hover:underline">
              View profile →
            </Link>
          </div>
        ) : (
          <p className="text-muted-foreground">No customer linked.</p>
        )}

        <hr className="border-border" />

        {vehicle ? (
          <div className="space-y-1">
            <p className="font-medium">
              {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
            </p>
            {editingPlate ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") savePlate()
                    if (e.key === "Escape") setEditingPlate(false)
                  }}
                  placeholder="License plate"
                  className="input-field flex-1 text-sm px-2 py-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-emerald-600"
                  onClick={savePlate}
                  disabled={savingVehicle}
                >
                  {savingVehicle ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground"
                  onClick={() => setEditingPlate(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <p className="text-muted-foreground">
                  Plate: {vehicle.license_plate || "—"}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={startEditPlate}
                >
                  <Pencil className="size-3" />
                </Button>
              </div>
            )}
            {vehicle.color && <p className="text-muted-foreground">Color: {vehicle.color}</p>}
            {vehicle.size && <p className="text-muted-foreground">Size: {vehicle.size}</p>}
          </div>
        ) : (
          <p className="text-muted-foreground">No vehicle linked.</p>
        )}
      </CardContent>
    </Card>
  )
}
