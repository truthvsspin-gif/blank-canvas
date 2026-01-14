import * as React from "react"
import { Link } from "react-router-dom"
import { 
  ArrowRight, 
  Check, 
  Menu, 
  Shield, 
  Zap, 
  Sparkles, 
  BarChart3, 
  Users, 
  MessageSquare,
  Bot,
  Calendar,
  TrendingUp,
  Globe,
  Lock
} from "lucide-react"

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
    { title: "Listo para lanzar", copy: "Flujo base de dashboard y admin en minutos.", icon: Zap },
    { title: "Multi-tenant real", copy: "Rutas, middleware y RLS preparados.", icon: Users },
    { title: "Branding flexible", copy: "Tema monocromo alineado a todo el panel.", icon: Sparkles },
  ],
  en: [
    { title: "Launch ready", copy: "Base dashboard and admin flow in minutes.", icon: Zap },
    { title: "Real multi-tenant", copy: "Routes, middleware, and RLS prepped.", icon: Users },
    { title: "Flexible branding", copy: "Monochrome theme aligned to the whole panel.", icon: Sparkles },
  ],
}

const metrics = {
  es: [
    { label: "Workspaces", value: "32", delta: "+12% mes", icon: Globe },
    { label: "Automatizaciones", value: "146", delta: "4m mediana", icon: Bot },
    { label: "Disponibilidad", value: "99.99%", delta: "observado", icon: TrendingUp },
  ],
  en: [
    { label: "Workspaces", value: "32", delta: "+12% month", icon: Globe },
    { label: "Automations", value: "146", delta: "4m median", icon: Bot },
    { label: "Uptime", value: "99.99%", delta: "observed", icon: TrendingUp },
  ],
}

const features = {
  es: [
    { icon: BarChart3, title: "Analytics en tiempo real", desc: "Métricas instantáneas de tu negocio" },
    { icon: MessageSquare, title: "Mensajería unificada", desc: "WhatsApp e Instagram en un solo lugar" },
    { icon: Calendar, title: "Agenda inteligente", desc: "Reservas automáticas con IA" },
    { icon: Lock, title: "Seguridad enterprise", desc: "RLS y cifrado de extremo a extremo" },
  ],
  en: [
    { icon: BarChart3, title: "Real-time analytics", desc: "Instant business metrics" },
    { icon: MessageSquare, title: "Unified messaging", desc: "WhatsApp & Instagram in one place" },
    { icon: Calendar, title: "Smart scheduling", desc: "AI-powered automatic bookings" },
    { icon: Lock, title: "Enterprise security", desc: "RLS and end-to-end encryption" },
  ],
}

export default function Home() {
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
        heroTitle: "El futuro de tu negocio,",
        heroTitleHighlight: "automatizado.",
        heroCopy:
          "Detapro une CRM, mensajería y automatización con IA en una plataforma elegante. Gestiona clientes, leads y reservas sin esfuerzo.",
        ctaPrimary: "Comenzar ahora",
        ctaSecondary: "Ver demo",
        cardTitle: "Vista unificada",
        cardDesc: "Mismo look and feel que el dashboard.",
        cardSecurityTitle: "Protección multi-tenant",
        cardSecurityDesc: "Middleware + políticas de acceso listas.",
        featuresTitle: "Todo lo que necesitas",
        featuresSubtitle: "Herramientas potentes para escalar tu negocio",
        modulesEyebrow: "Módulos",
        modulesTitle: "Explora las secciones",
        modulesCta: "Ver consola",
        modulesFootnote: "Rutas, layout y estados listos para datos reales.",
        modulesOpen: "Abrir",
        footerBlurb:
          "Panel y admin listos para tu SaaS multi-tenant. Un solo lenguaje visual monocromo.",
        footerHunt: "Listo para Product Hunt",
        footerStatus: "Todo operativo",
        footerGeneral: "General",
        footerResources: "Recursos",
        footerFollow: "Síguenos",
        footerLinksGeneral: ["Roadmap", "Changelog", "Pricing", "Programa de referidos"],
        footerLinksResources: ["Documentación", "Tutoriales", "Comunidad", "Blog", "Estado"],
        footerLinksFollow: ["Twitter", "LinkedIn", "Discord", "Instagram"],
        footerTerms: "Términos",
        footerPrivacy: "Privacidad",
        footerLang: "Español",
        footerRights: "Todos los derechos reservados.",
        langLabel: "ES",
        langAlt: "Cambiar a inglés",
        menuLabel: "Abrir menú",
      }
    : {
        brandSubtitle: "Product console",
        dash: "Dashboard",
        admin: "Admin",
        badge: "SaaS ready",
        eyebrow: "Dashboard + Admin in sync",
        heroTitle: "The future of your business,",
        heroTitleHighlight: "automated.",
        heroCopy:
          "Detapro unifies CRM, messaging, and AI automation in one elegant platform. Manage customers, leads, and bookings effortlessly.",
        ctaPrimary: "Get started",
        ctaSecondary: "View demo",
        cardTitle: "Unified view",
        cardDesc: "Same look and feel as the dashboard.",
        cardSecurityTitle: "Multi-tenant protection",
        cardSecurityDesc: "Middleware + access policies ready.",
        featuresTitle: "Everything you need",
        featuresSubtitle: "Powerful tools to scale your business",
        modulesEyebrow: "Modules",
        modulesTitle: "Explore sections",
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-gradient-to-t from-muted/20 to-transparent blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="group flex items-center gap-3">
            <div className="grid size-11 place-items-center overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
              <img
                src="/4.png"
                alt="Detapro logo"
                className="h-auto w-auto max-h-11 max-w-11 object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Detapro</p>
              <p className="text-sm font-semibold text-foreground">{copy.brandSubtitle}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground transition-colors">
                <Link to="/dashboard">{copy.dash}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground transition-colors">
                <Link to="/admin">{copy.admin}</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent transition-colors"
                onClick={toggleLang}
                aria-label={copy.langAlt}
              >
                {copy.langLabel}
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent"
                onClick={toggleLang}
                aria-label={copy.langAlt}
              >
                {copy.langLabel}
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-border text-foreground"
                  aria-label={copy.menuLabel}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <Menu className="size-5" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-border bg-card p-2 shadow-lg animate-fade-in">
                    <Link
                      to="/dashboard"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      {copy.dash}
                    </Link>
                    <Link
                      to="/admin"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      {copy.admin}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-16">
        {/* Hero Section */}
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
              <Badge className="border-primary/20 bg-primary/10 text-primary">
                <Sparkles className="mr-1 size-3" />
                {copy.badge}
              </Badge>
              <span className="text-sm text-muted-foreground">{copy.eyebrow}</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {copy.heroTitle}
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  {copy.heroTitleHighlight}
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">{copy.heroCopy}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <Link to="/dashboard" className="flex items-center gap-2">
                  {copy.ctaPrimary}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent transition-all duration-300">
                <Link to="/admin">{copy.ctaSecondary}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {highlights[lang].map((item, index) => (
                <div
                  key={item.title}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <item.icon className="size-5" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <p className="text-muted-foreground">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Card */}
          <Card className="border-border bg-card/50 backdrop-blur-sm shadow-xl animate-fade-in" style={{ animationDelay: "200ms" }}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-foreground">{copy.cardTitle}</CardTitle>
                <CardDescription className="text-muted-foreground">{copy.cardDesc}</CardDescription>
              </div>
              <Badge className="border-primary/20 bg-primary/10 text-primary animate-pulse">
                <Zap className="mr-1 size-3" />
                Live
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {metrics[lang].map((metric, index) => (
                  <div
                    key={metric.label}
                    className="group rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
                    style={{ animationDelay: `${(index + 3) * 100}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className="size-4 text-primary" />
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{metric.value}</p>
                    <p className="text-sm text-primary font-medium">{metric.delta}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-r from-card to-accent/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Shield className="size-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{copy.cardSecurityTitle}</p>
                    <p className="text-sm text-muted-foreground">{copy.cardSecurityDesc}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features Grid */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{copy.featuresTitle}</h2>
            <p className="text-muted-foreground">{copy.featuresSubtitle}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features[lang].map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group border-border bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:from-primary group-hover:to-accent group-hover:text-primary-foreground">
                    <feature.icon className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Modules Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-primary font-medium">{copy.modulesEyebrow}</p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{copy.modulesTitle}</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground transition-colors">
              <Link to="/dashboard">{copy.modulesCta}</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {appSections.map((section, index) => (
              <Card
                key={section.href}
                className="group relative overflow-hidden border-border bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative flex flex-row items-start justify-between gap-2">
                  <div className="space-y-2">
                    <CardTitle className="text-foreground group-hover:text-primary transition-colors">{section.name[lang]}</CardTitle>
                    <CardDescription className="text-muted-foreground">{section.summary[lang]}</CardDescription>
                  </div>
                  {section.badge && (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">{section.badge[lang]}</Badge>
                  )}
                </CardHeader>
                <CardContent className="relative flex items-center justify-between text-sm text-muted-foreground">
                  <span>{copy.modulesFootnote}</span>
                  <Button variant="ghost" size="sm" asChild className="text-foreground hover:bg-accent transition-colors group/btn">
                    <Link to={section.href} className="flex items-center gap-2">
                      {copy.modulesOpen} 
                      <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card/50 backdrop-blur-sm text-muted-foreground">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center overflow-hidden rounded-2xl bg-card border border-border p-2 shadow-sm">
                  <img src="/4.png" alt="Detapro logo" className="h-12 w-12 object-contain" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Detapro</p>
                  <p className="text-base font-semibold text-foreground">{copy.brandSubtitle}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{copy.footerBlurb}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-all duration-300 hover:shadow-md">
                  <span className="text-lg">🚀</span>
                  <span className="font-semibold text-foreground">{copy.footerHunt}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-all duration-300 hover:shadow-md">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-foreground">{copy.footerStatus}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">{copy.footerGeneral}</p>
              <div className="flex flex-col gap-2 text-sm">
                {copy.footerLinksGeneral.map((label) => (
                  <Link key={label} to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">{copy.footerResources}</p>
              <div className="flex flex-col gap-2 text-sm">
                {copy.footerLinksResources.map((label) => (
                  <Link key={label} to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">{copy.footerFollow}</p>
              <div className="flex flex-col gap-2 text-sm">
                {copy.footerLinksFollow.map((label) => (
                  <Link key={label} to="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <p className="text-sm text-muted-foreground">© 2024 Detapro. {copy.footerRights}</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">{copy.footerTerms}</Link>
              <Link to="#" className="text-muted-foreground hover:text-foreground transition-colors">{copy.footerPrivacy}</Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLang}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copy.footerLang}
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
