import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Wrench, 
  ClipboardList,
  History,
  Target, 
  Inbox, 
  Bot, 
  TestTube, 
  Shield, 
  User,
  Briefcase,
  BarChart3,
  Send,
  Plug,
  Database,
  FileText,
  Package,
  Building2,
  UsersRound,
  CreditCard,
  MessageCircle
} from "lucide-react"
import { AppSection } from "@/types/navigation"

export type NavGroup = {
  id: string
  label: { en: string; es: string }
  items: AppSection[]
}

export const appSections: AppSection[] = [
  // ── Main ──
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

  // ── CRM (matching reference: Panel, Órdenes, Datos, Docs, Stock, Negocio, Equipo, Pagos, WhatsApp, Métricas) ──
  {
    name: { en: "Panel", es: "Panel" },
    href: "/crm",
    summary: { en: "CRM dashboard with calendar and work requests.", es: "Panel CRM con calendario y solicitudes." },
    badge: { en: "Home", es: "Inicio" },
    icon: LayoutDashboard,
    group: "crm",
  },
  {
    name: { en: "Orders", es: "Órdenes" },
    href: "/crm/work-orders",
    summary: { en: "Kanban board for work order management.", es: "Tablero kanban de órdenes de trabajo." },
    badge: { en: "Ops", es: "Ops" },
    icon: ClipboardList,
    group: "crm",
  },
  {
    name: { en: "Data", es: "Datos" },
    href: "/crm/datos",
    summary: { en: "Browse orders, vehicles, customers and requests.", es: "Consulta órdenes, vehículos, clientes y solicitudes." },
    badge: { en: "DB", es: "BD" },
    icon: Database,
    group: "crm",
  },
  {
    name: { en: "Docs", es: "Docs" },
    href: "/crm/docs",
    summary: { en: "Invoices, estimates and documents.", es: "Facturas, presupuestos y documentos." },
    badge: { en: "Files", es: "Archivos" },
    icon: FileText,
    group: "crm",
  },
  {
    name: { en: "Stock", es: "Stock" },
    href: "/crm/stock",
    summary: { en: "Product and material inventory.", es: "Inventario de productos y materiales." },
    badge: { en: "Inv", es: "Inv" },
    icon: Package,
    group: "crm",
  },
  {
    name: { en: "Business", es: "Negocio" },
    href: "/crm/negocio",
    summary: { en: "Business settings and configuration.", es: "Configuración del negocio." },
    badge: { en: "Biz", es: "Biz" },
    icon: Building2,
    group: "crm",
  },
  {
    name: { en: "Team", es: "Equipo" },
    href: "/crm/equipo",
    summary: { en: "Team members and roles.", es: "Miembros del equipo y roles." },
    badge: { en: "Team", es: "Equipo" },
    icon: UsersRound,
    group: "crm",
  },
  {
    name: { en: "Payments", es: "Pagos" },
    href: "/crm/pagos",
    summary: { en: "Billing and payment tracking.", es: "Facturación y seguimiento de pagos." },
    badge: { en: "Pay", es: "Pagos" },
    icon: CreditCard,
    group: "crm",
  },
  {
    name: { en: "Metrics", es: "Métricas" },
    href: "/crm/metricas",
    summary: { en: "Shop statistics and performance.", es: "Estadísticas y rendimiento del taller." },
    badge: { en: "KPI", es: "KPI" },
    icon: BarChart3,
    group: "crm",
  },

  // ── Messaging ──
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

  // ── Settings ──
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

// CRM sections for the dedicated CRM sidebar
export const crmSections = appSections.filter(s => s.group === "crm")

// Main sidebar groups — CRM group shows only the hub link, not sub-pages
export const navGroups: NavGroup[] = [
  {
    id: "main",
    label: { en: "Overview", es: "Vista General" },
    items: appSections.filter(s => s.group === "main"),
  },
  {
    id: "crm",
    label: { en: "CRM", es: "CRM" },
    items: appSections.filter(s => s.group === "crm" && s.href === "/crm"),
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
