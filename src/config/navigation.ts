import { AppSection } from "@/types/navigation"

export const appSections: AppSection[] = [
  {
    name: { en: "Dashboard", es: "Dashboard" },
    href: "/dashboard",
    summary: {
      en: "High-level workspace health, adoption, and KPIs.",
      es: "Salud del workspace, adopcion y KPIs de alto nivel.",
    },
    badge: { en: "Overview", es: "Resumen" },
  },
  {
    name: { en: "CRM", es: "CRM" },
    href: "/crm",
    summary: {
      en: "Pipeline, accounts, and customer lifecycle touchpoints.",
      es: "Pipeline, cuentas y ciclo de vida del cliente.",
    },
    badge: { en: "Customer", es: "Clientes" },
  },
  {
    name: { en: "CRM Leads", es: "Leads CRM" },
    href: "/crm/leads",
    summary: {
      en: "Qualified leads by conversation intent.",
      es: "Leads calificados por intencion.",
    },
    badge: { en: "Leads", es: "Leads" },
  },
  {
    name: { en: "CRM Inbox", es: "Bandeja CRM" },
    href: "/crm/inbox",
    summary: {
      en: "View WhatsApp and Instagram conversations by customer.",
      es: "Ver conversaciones de WhatsApp e Instagram por cliente.",
    },
    badge: { en: "Inbox", es: "Bandeja" },
  },
  {
    name: { en: "Chatbot", es: "Chatbot" },
    href: "/chatbot",
    summary: {
      en: "Chatbot settings, integrations, and flows.",
      es: "Configuracion del chatbot, integraciones y flujos.",
    },
    badge: { en: "AI", es: "IA" },
  },
  {
    name: { en: "Chatbot Test", es: "Prueba Chatbot" },
    href: "/dev-chatbot",
    summary: {
      en: "Run a full chatbot simulation with test messages.",
      es: "Simula el chatbot con mensajes de prueba.",
    },
    badge: { en: "Test", es: "Test" },
  },
  {
    name: { en: "Admin", es: "Admin" },
    href: "/admin",
    summary: {
      en: "Tenant controls, permissions, billing, and compliance.",
      es: "Controles de tenant, permisos, facturacion y cumplimiento.",
    },
    badge: { en: "Control", es: "Control" },
  },
  {
    name: { en: "Profile", es: "Perfil" },
    href: "/profile",
    summary: {
      en: "Manage your account basics, identity, and security.",
      es: "Gestiona datos basicos, identidad y seguridad.",
    },
    badge: { en: "You", es: "Tu" },
  },
]
