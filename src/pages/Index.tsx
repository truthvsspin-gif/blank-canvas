import * as React from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Check, Menu, Shield, Zap } from "lucide-react"

import { appSections } from "@/config/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"

const highlights = {
  es: [
    { title: "Listo para lanzar", copy: "Flujo base de dashboard y admin en minutos." },
    { title: "Multi-tenant real", copy: "Rutas, middleware y RLS preparados." },
    { title: "Branding flexible", copy: "Tema monocromo alineado a todo el panel." },
  ],
  en: [
    { title: "Launch ready", copy: "Base dashboard and admin flow in minutes." },
    { title: "Real multi-tenant", copy: "Routes, middleware, and RLS prepped." },
    { title: "Flexible branding", copy: "Monochrome theme aligned to the whole panel." },
  ],
}

const metrics = {
  es: [
    { label: "Workspaces", value: "32", delta: "+12% mes" },
    { label: "Automatizaciones", value: "146", delta: "4m mediana" },
    { label: "Disponibilidad", value: "99.99%", delta: "observado" },
  ],
  en: [
    { label: "Workspaces", value: "32", delta: "+12% month" },
    { label: "Automations", value: "146", delta: "4m median" },
    { label: "Uptime", value: "99.99%", delta: "observed" },
  ],
}

export default function Index() {
  const { lang, toggleLang } = useLanguage()
  const isEs = lang === "es"
  const [mounted, setMounted] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const copy = isEs
    ? {
        brandSubtitle: "Panel de producto",
        dash: "Dashboard",
        admin: "Admin",
        badge: "SaaS listo",
        eyebrow: "Dashboard + Admin coherentes",
        heroTitle: "Panel monocromo listo para SaaS.",
        heroCopy:
          "Detapro une landing y dashboard con un lenguaje negro/blanco. Multi-tenant listo y componentes reutilizables.",
        ctaPrimary: "Abrir dashboard",
        ctaSecondary: "Ver admin",
        cardTitle: "Vista unificada",
        cardDesc: "Mismo look and feel que el dashboard.",
        cardSecurityTitle: "Proteccion multi-tenant",
        cardSecurityDesc: "Middleware + politicas de acceso listas.",
        modulesEyebrow: "Modulos",
        modulesTitle: "Mueve de landing a producto sin romper estilo",
        modulesCta: "Ver consola",
        modulesFootnote: "Rutas, layout y estados listos para datos reales.",
        modulesOpen: "Abrir",
        footerBlurb:
          "Panel y admin listos para tu SaaS multi-tenant. Un solo lenguaje visual monocromo.",
        footerHunt: "Listo para Product Hunt",
        footerStatus: "Todo operativo",
        footerGeneral: "General",
        footerResources: "Recursos",
        footerFollow: "Siguenos",
        footerLinksGeneral: ["Roadmap", "Changelog", "Pricing", "Programa de referidos"],
        footerLinksResources: ["Documentacion", "Tutoriales", "Comunidad", "Blog", "Estado"],
        footerLinksFollow: ["Twitter", "LinkedIn", "Discord", "Instagram"],
        footerTerms: "Terminos",
        footerPrivacy: "Privacidad",
        footerLang: "Espanol",
        footerRights: "Todos los derechos reservados.",
        langLabel: "ES",
        langAlt: "Cambiar a ingles",
        menuLabel: "Abrir menu",
      }
    : {
        brandSubtitle: "Product console",
        dash: "Dashboard",
        admin: "Admin",
        badge: "SaaS ready",
        eyebrow: "Dashboard + Admin in sync",
        heroTitle: "Monochrome panel ready for SaaS.",
        heroCopy:
          "Detapro unifies landing and dashboard with a black/white language. Multi-tenant ready and reusable components.",
        ctaPrimary: "Open dashboard",
        ctaSecondary: "View admin",
        cardTitle: "Unified view",
        cardDesc: "Same look and feel as the dashboard.",
        cardSecurityTitle: "Multi-tenant protection",
        cardSecurityDesc: "Middleware + access policies ready.",
        modulesEyebrow: "Modules",
        modulesTitle: "Move from landing to product without breaking style",
        modulesCta: "View console",
        modulesFootnote: "Routes, layout, and states ready for real data.",
        modulesOpen: "Open",
        footerBlurb: "Dashboard and admin ready for your multi-tenant SaaS. One monochrome visual language.",
        footerHunt: "Product Hunt ready",
        footerStatus: "All systems operational",
        footerGeneral: "General",
        footerResources: "Resources",
        footerFollow: "Follow us",
        footerLinksGeneral: ["Roadmap", "Changelog", "Pricing", "Referral program"],
        footerLinksResources: ["Documentation", "Tutorials", "Community", "Blog", "Status"],
        footerLinksFollow: ["Twitter", "LinkedIn", "Discord", "Instagram"],
        footerTerms: "Terms",
        footerPrivacy: "Privacy",
        footerLang: "English",
        footerRights: "All rights reserved.",
        langLabel: "EN",
        langAlt: "Switch to Spanish",
        menuLabel: "Open menu",
      }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">Detapro</span>
              <span className="text-xs text-muted-foreground">{copy.brandSubtitle}</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/dashboard" className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {copy.dash}
            </Link>
            <Link to="/admin" className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {copy.admin}
            </Link>
            <Button variant="outline" size="sm" className="ml-2" onClick={toggleLang}>
              {copy.langLabel}
            </Button>
          </nav>

          {/* Mobile Nav */}
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {copy.langLabel}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label={copy.menuLabel}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-full mt-2 flex w-40 flex-col rounded-md border border-border bg-background p-2 shadow-lg">
                  <Link
                    to="/dashboard"
                    className="rounded px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    {copy.dash}
                  </Link>
                  <Link
                    to="/admin"
                    className="rounded px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    {copy.admin}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column */}
          <div className="flex flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <Badge variant="secondary">{copy.badge}</Badge>
              <span className="text-sm text-muted-foreground">{copy.eyebrow}</span>
            </div>

            <div className="mb-8">
              <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {copy.heroTitle}
              </h1>
              <p className="text-lg text-muted-foreground">{copy.heroCopy}</p>
            </div>

            <div className="mb-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/dashboard">
                  {copy.ctaPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/admin">{copy.ctaSecondary}</Link>
              </Button>
            </div>

            <div className="space-y-4">
              {highlights[lang].map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Check className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Stats Card */}
          <Card className="self-start">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{copy.cardTitle}</CardTitle>
                <CardDescription>{copy.cardDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Live
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {metrics[lang].map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xs uppercase text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.delta}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Shield className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{copy.cardSecurityTitle}</p>
                    <p className="text-sm text-muted-foreground">{copy.cardSecurityDesc}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Section */}
        <section className="mt-24">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {copy.modulesEyebrow}
              </p>
              <h2 className="text-2xl font-bold sm:text-3xl">{copy.modulesTitle}</h2>
            </div>
            <Button variant="outline" asChild>
              <Link to="/dashboard">{copy.modulesCta}</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appSections.map((section) => (
              <Card key={section.href} className="group transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{section.name[lang]}</CardTitle>
                      <CardDescription className="text-sm">{section.summary[lang]}</CardDescription>
                    </div>
                    {section.badge ? (
                      <Badge variant="secondary">{section.badge[lang]}</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">{copy.modulesFootnote}</p>
                  <Button variant="ghost" size="sm" asChild className="p-0 h-auto font-medium">
                    <Link to={section.href}>
                      {copy.modulesOpen} <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight">Detapro</span>
                  <span className="text-xs text-muted-foreground">{copy.brandSubtitle}</span>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{copy.footerBlurb}</p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">ƒ-Z</span>
                  {copy.footerHunt}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
                  {copy.footerStatus}
                </Badge>
              </div>
            </div>

            {/* General Links */}
            <div>
              <p className="mb-3 text-sm font-semibold">{copy.footerGeneral}</p>
              <ul className="space-y-2">
                {copy.footerLinksGeneral.map((label) => (
                  <li key={label}>
                    <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <p className="mb-3 text-sm font-semibold">{copy.footerResources}</p>
              <ul className="space-y-2">
                {copy.footerLinksResources.map((label) => (
                  <li key={label}>
                    <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow Links */}
            <div>
              <p className="mb-3 text-sm font-semibold">{copy.footerFollow}</p>
              <ul className="space-y-2">
                {copy.footerLinksFollow.map((label) => (
                  <li key={label}>
                    <Link to="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Detapro. {copy.footerRights}
            </p>
            <div className="flex gap-4">
              <Link to="#" className="text-xs text-muted-foreground hover:text-foreground">
                {copy.footerTerms}
              </Link>
              <Link to="#" className="text-xs text-muted-foreground hover:text-foreground">
                {copy.footerPrivacy}
              </Link>
              <button onClick={toggleLang} className="text-xs text-muted-foreground hover:text-foreground">
                {copy.footerLang}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
