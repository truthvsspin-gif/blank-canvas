import { 
  LayoutDashboard, 
  ClipboardList,
  Database,
  FileText,
  Package,
  Building2,
  Users2,
  CreditCard,
  MessageCircle,
  BarChart3,
  ChevronDown,
  Settings,
  Plug,
  Shield,
  User,
  Bot,
  TestTube,
} from "lucide-react"
import { AppSection } from "@/types/navigation"

export type NavGroup = {
  id: string
  label: { en: string; es: string }
  items: AppSection[]
}

export const appSections: AppSection[] = [
  // Panel
  {
    name: { en: "Panel", es: "Panel" },
    href: "/dashboard",
    summary: { en: "Overview and calendar", es: "Vista general y calendario" },
    icon: LayoutDashboard,
    group: "main",
  },
  // Órdenes
  {
    name: { en: "Orders", es: "Órdenes" },
    href: "/ordenes",
    summary: { en: "Work orders and bookings", es: "Órdenes de trabajo y reservas" },
    icon: ClipboardList,
    group: "main",
  },
  // Datos
  {
    name: { en: "Data", es: "Datos" },
    href: "/datos",
    summary: { en: "Customers, vehicles, and leads", es: "Clientes, vehículos y leads" },
    icon: Database,
    group: "main",
  },
  // Docs
  {
    name: { en: "Docs", es: "Docs" },
    href: "/docs",
    summary: { en: "Knowledge base and documents", es: "Base de conocimiento y documentos" },
    icon: FileText,
    group: "main",
  },
  // Stock
  {
    name: { en: "Stock", es: "Stock" },
    href: "/stock",
    summary: { en: "Services catalog and inventory", es: "Catálogo de servicios e inventario" },
    icon: Package,
    group: "main",
  },
  // Negocio (expandable)
  {
    name: { en: "Business", es: "Negocio" },
    href: "/negocio",
    summary: { en: "Business settings", es: "Configuración del negocio" },
    icon: Building2,
    group: "business",
  },
  {
    name: { en: "Integrations", es: "Integraciones" },
    href: "/negocio/integraciones",
    summary: { en: "API credentials and webhooks", es: "Credenciales API y webhooks" },
    icon: Plug,
    group: "business",
  },
  {
    name: { en: "Chatbot", es: "Chatbot" },
    href: "/negocio/chatbot",
    summary: { en: "Chatbot settings and flows", es: "Configuración del chatbot" },
    icon: Bot,
    group: "business",
  },
  {
    name: { en: "Chatbot Test", es: "Prueba Chatbot" },
    href: "/negocio/chatbot-test",
    summary: { en: "Test chatbot simulator", es: "Simulador de prueba del chatbot" },
    icon: TestTube,
    group: "business",
  },
  // Equipo
  {
    name: { en: "Team", es: "Equipo" },
    href: "/equipo",
    summary: { en: "Team members and roles", es: "Miembros del equipo y roles" },
    icon: Users2,
    group: "main",
  },
  // Pagos
  {
    name: { en: "Payments", es: "Pagos" },
    href: "/pagos",
    summary: { en: "Payment tracking", es: "Seguimiento de pagos" },
    icon: CreditCard,
    group: "main",
  },
  // WhatsApp
  {
    name: { en: "WhatsApp", es: "WhatsApp" },
    href: "/whatsapp",
    summary: { en: "Inbox and messaging", es: "Bandeja de entrada y mensajería" },
    icon: MessageCircle,
    group: "main",
  },
  // Métricas
  {
    name: { en: "Metrics", es: "Métricas" },
    href: "/metricas",
    summary: { en: "Analytics and reports", es: "Analíticas y reportes" },
    icon: BarChart3,
    group: "main",
  },
  // Settings (hidden in sidebar, accessible)
  {
    name: { en: "Profile", es: "Perfil" },
    href: "/perfil",
    summary: { en: "Your account", es: "Tu cuenta" },
    icon: User,
    group: "settings",
  },
  {
    name: { en: "Admin", es: "Admin" },
    href: "/admin",
    summary: { en: "Admin controls", es: "Controles de administración" },
    icon: Shield,
    group: "settings",
  },
]

// Main sidebar items (top-level, no grouping headers)
export const sidebarItems = appSections.filter(s => s.group === "main")
export const businessSubItems = appSections.filter(s => s.group === "business")

export const navGroups: NavGroup[] = [
  {
    id: "main",
    label: { en: "Main", es: "Principal" },
    items: appSections.filter(s => s.group === "main"),
  },
  {
    id: "business",
    label: { en: "Business", es: "Negocio" },
    items: appSections.filter(s => s.group === "business"),
  },
  {
    id: "settings",
    label: { en: "Settings", es: "Configuración" },
    items: appSections.filter(s => s.group === "settings"),
  },
]
