import { LucideIcon } from "lucide-react"

export type LocalizedString = {
  en: string
  es: string
}

export type AppSection = {
  name: LocalizedString
  href: string
  summary: LocalizedString
  badge?: LocalizedString
  icon?: LucideIcon
  group?: string
}
