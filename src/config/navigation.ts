import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Wrench, 
  Target, 
  Inbox, 
  Bot, 
  TestTube, 
  Shield, 
  User,
  Briefcase,
  BarChart3,
  Send,
  Plug
} from "lucide-react"
import { AppSection } from "@/types/navigation"

export type NavGroup = {
  id: string
  label: { en: string; es: string }
  items: AppSection[]
}

export const appSections: AppSection[] = [
  {
    name: { en: "Dashboard", es: "Dashboard" },
    href: "/dashboard",
    summary: {
      en: "High-level workspace health, adoption, and KPIs.",
      es: "Salud del workspace, adopcion y KPIs de alto nivel.",
    },
    badge: { en: "Overview", es: "Resumen" },
    icon: LayoutDashboard,
    group: "main",
  },
  {
    name: { en: "Sales Analytics", es: "Analíticas de Ventas" },
    href: "/sales-analytics",
    summary: {
      en: "Conversion funnel metrics and lead qualification rates.",
      es: "Métricas de embudo de conversión y tasas de calificación.",
    },
    badge: { en: "Funnel", es: "Embudo" },
    icon: BarChart3,
    group: "main",
  },
  {
    name: { en: "CRM", es: "CRM" },
    href: "/crm",
    summary: {
      en: "Pipeline, accounts, and customer lifecycle touchpoints.",
      es: "Pipeline, cuentas y ciclo de vida del cliente.",
    },
    badge: { en: "Customer", es: "Clientes" },
    icon: Briefcase,
    group: "crm",
  },
  {
    name: { en: "Customers", es: "Clientes" },
    href: "/crm/customers",
    summary: {
      en: "Manage customer profiles, vehicles, and contact info.",
      es: "Gestiona perfiles de clientes, vehiculos e informacion de contacto.",
    },
    badge: { en: "CRM", es: "CRM" },
    icon: Users,
    group: "crm",
  },
  {
    name: { en: "Bookings", es: "Reservas" },
    href: "/crm/bookings",
    summary: {
      en: "View and manage all service appointments.",
      es: "Ver y gestionar todas las citas de servicio.",
    },
    badge: { en: "CRM", es: "CRM" },
    icon: Calendar,
    group: "crm",
  },
  {
    name: { en: "Services", es: "Servicios" },
    href: "/crm/services",
    summary: {
      en: "Configure service offerings and pricing.",
      es: "Configura servicios y precios.",
    },
    badge: { en: "CRM", es: "CRM" },
    icon: Wrench,
    group: "crm",
  },
  {
    name: { en: "Leads", es: "Leads" },
    href: "/crm/leads",
    summary: {
      en: "Qualified leads by conversation intent.",
      es: "Leads calificados por intencion.",
    },
    badge: { en: "Leads", es: "Leads" },
    icon: Target,
    group: "crm",
  },
  {
    name: { en: "Follow-ups", es: "Seguimientos" },
    href: "/crm/follow-ups",
    summary: {
      en: "Automated follow-up message queue.",
      es: "Cola de mensajes de seguimiento automático.",
    },
    badge: { en: "Auto", es: "Auto" },
    icon: Send,
    group: "crm",
  },
  {
    name: { en: "Inbox", es: "Bandeja" },
    href: "/crm/inbox",
    summary: {
      en: "View WhatsApp and Instagram conversations by customer.",
      es: "Ver conversaciones de WhatsApp e Instagram por cliente.",
    },
    badge: { en: "Inbox", es: "Bandeja" },
    icon: Inbox,
    group: "messaging",
  },
  {
    name: { en: "Chatbot", es: "Chatbot" },
    href: "/chatbot",
    summary: {
      en: "Chatbot settings, integrations, and flows.",
      es: "Configuracion del chatbot, integraciones y flujos.",
    },
    badge: { en: "AI", es: "IA" },
    icon: Bot,
    group: "messaging",
  },
  {
    name: { en: "Chatbot Test", es: "Prueba Chatbot" },
    href: "/dev-chatbot",
    summary: {
      en: "Run a full chatbot simulation with test messages.",
      es: "Simula el chatbot con mensajes de prueba.",
    },
    badge: { en: "Test", es: "Test" },
    icon: TestTube,
    group: "messaging",
  },
  {
    name: { en: "Integrations", es: "Integraciones" },
    href: "/integrations",
    summary: {
      en: "WhatsApp and Instagram API credentials.",
      es: "Credenciales de API de WhatsApp e Instagram.",
    },
    badge: { en: "API", es: "API" },
    icon: Plug,
    group: "settings",
  },
  {
    name: { en: "Admin", es: "Admin" },
    href: "/admin",
    summary: {
      en: "Tenant controls, permissions, billing, and compliance.",
      es: "Controles de tenant, permisos, facturacion y cumplimiento.",
    },
    badge: { en: "Control", es: "Control" },
    icon: Shield,
    group: "settings",
  },
  {
    name: { en: "Profile", es: "Perfil" },
    href: "/profile",
    summary: {
      en: "Manage your account basics, identity, and security.",
      es: "Gestiona datos basicos, identidad y seguridad.",
    },
    badge: { en: "You", es: "Tu" },
    icon: User,
    group: "settings",
  },
]

export const navGroups: NavGroup[] = [
  {
    id: "main",
    label: { en: "Overview", es: "Vista General" },
    items: appSections.filter(s => s.group === "main"),
  },
  {
    id: "crm",
    label: { en: "CRM", es: "CRM" },
    items: appSections.filter(s => s.group === "crm"),
  },
  {
    id: "messaging",
    label: { en: "Messaging & AI", es: "Mensajería e IA" },
    items: appSections.filter(s => s.group === "messaging"),
  },
  {
    id: "settings",
    label: { en: "Settings", es: "Configuración" },
    items: appSections.filter(s => s.group === "settings"),
  },
]
