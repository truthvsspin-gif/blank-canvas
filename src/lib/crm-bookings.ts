export type BookingStatus =
  | "requested"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"

export type BookingStatusOption = {
  value: BookingStatus
  legacyValues?: string[]
  labelEs: string
  labelEn: string
  color: string
}

export const BOOKING_STATUS_OPTIONS: BookingStatusOption[] = [
  {
    value: "requested",
    legacyValues: ["new", "pending"],
    labelEs: "Solicitada",
    labelEn: "Requested",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: "confirmed",
    labelEs: "Confirmada",
    labelEn: "Confirmed",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    value: "in_progress",
    labelEs: "En Progreso",
    labelEn: "In Progress",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    value: "completed",
    labelEs: "Completada",
    labelEn: "Completed",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "cancelled",
    legacyValues: ["canceled"],
    labelEs: "Cancelada",
    labelEn: "Cancelled",
    color: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    value: "no_show",
    legacyValues: ["no-show", "noshow"],
    labelEs: "No Asistio",
    labelEn: "No-show",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
]

export const BOOKING_SOURCE_OPTIONS = [
  { value: "manual", labelEs: "Manual", labelEn: "Manual" },
  { value: "chatbot", labelEs: "Chatbot", labelEn: "Chatbot" },
  { value: "whatsapp", labelEs: "WhatsApp", labelEn: "WhatsApp" },
  { value: "instagram", labelEs: "Instagram", labelEn: "Instagram" },
  { value: "reservation-page", labelEs: "Pagina de Reserva", labelEn: "Reservation Page" },
  { value: "website", labelEs: "Sitio Web", labelEn: "Website" },
  { value: "referral", labelEs: "Referido", labelEn: "Referral" },
]

export function normalizeBookingStatus(value: string | null | undefined): BookingStatus {
  const normalized = (value || "").toLowerCase().trim()
  const direct = BOOKING_STATUS_OPTIONS.find((s) => s.value === normalized)
  if (direct) return direct.value
  const legacy = BOOKING_STATUS_OPTIONS.find((s) => s.legacyValues?.includes(normalized))
  if (legacy) return legacy.value
  return "requested"
}

export function getBookingStatusOption(value: string | null | undefined): BookingStatusOption {
  const normalized = normalizeBookingStatus(value)
  return BOOKING_STATUS_OPTIONS.find((s) => s.value === normalized) || BOOKING_STATUS_OPTIONS[0]
}

export function getFilterStatuses(filterValue: BookingStatus): string[] {
  const option = BOOKING_STATUS_OPTIONS.find((s) => s.value === filterValue)
  if (!option) return [filterValue]
  return [option.value, ...(option.legacyValues || [])]
}

export function requiresWorkOrder(status: string | null | undefined) {
  const normalized = normalizeBookingStatus(status)
  return normalized === "confirmed" || normalized === "in_progress" || normalized === "completed"
}

export function createWorkOrderNo(bookingId: string) {
  const clean = bookingId.replace(/-/g, "").slice(0, 8).toUpperCase()
  return `WO-${clean}`
}
