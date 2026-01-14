import * as React from "react"
import { Link } from "react-router-dom"
import Image from "next/image"
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
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-11 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Image
                src="/4.png"
                alt="Detapro logo"
                width={44}
                height={44}
                className="h-auto w-auto max-h-11 max-w-11 object-contain"
                priority
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Detapro</p>
              <p className="text-sm font-semibold text-slate-900">{copy.brandSubtitle}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild className="text-slate-700 hover:text-black">
                <Link to="/dashboard">{copy.dash}</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-slate-700 hover:text-black">
                <Link to="/admin">{copy.admin}</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-800 hover:bg-slate-100"
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
                className="border-slate-300 text-slate-800 hover:bg-slate-100"
                onClick={toggleLang}
                aria-label={copy.langAlt}
              >
                {copy.langLabel}
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-slate-200 text-slate-800"
                  aria-label={copy.menuLabel}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <Menu className="size-5" />
                </Button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <Link
                      href="/dashboard"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      {copy.dash}
                    </Link>
                    <Link
                      href="/admin"
                      className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      {copy.admin}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-14">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Badge className="border-slate-200 bg-slate-100 text-slate-900">{copy.badge}</Badge>
              <span className="text-sm text-slate-600">{copy.eyebrow}</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="max-w-2xl text-lg text-slate-600">{copy.heroCopy}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-black text-white hover:bg-slate-900">
                <Link to="/dashboard" className="flex items-center gap-2">
                  {copy.ctaPrimary}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-100">
                <Link to="/admin">{copy.ctaSecondary}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {highlights[lang].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-900">
                    <Check className="size-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-slate-600">{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-100">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>{copy.cardTitle}</CardTitle>
                <CardDescription className="text-slate-600">{copy.cardDesc}</CardDescription>
              </div>
              <Badge className="border-slate-200 bg-slate-100 text-slate-900">
                <Zap className="mr-1 size-3" />
                Live
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {metrics[lang].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
                    <p className="text-sm text-slate-700">{metric.delta}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-900">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{copy.cardSecurityTitle}</p>
                    <p className="text-sm text-slate-600">{copy.cardSecurityDesc}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{copy.modulesEyebrow}</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{copy.modulesTitle}</h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-slate-800 hover:bg-slate-100">
              <Link to="/dashboard">{copy.modulesCta}</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {appSections.map((section) => (
              <Card
                key={section.href}
                className="group relative overflow-hidden border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50/0 via-slate-50 to-slate-50/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="relative flex flex-row items-start justify-between gap-2">
                  <div className="space-y-2">
                    <CardTitle>{section.name[lang]}</CardTitle>
                    <CardDescription className="text-slate-600">{section.summary[lang]}</CardDescription>
                  </div>
                  {section.badge ? (
                    <Badge className="border-slate-200 bg-slate-100 text-slate-900">{section.badge[lang]}</Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="relative flex items-center justify-between text-sm text-slate-700">
                  <span>{copy.modulesFootnote}</span>
                  <Button variant="ghost" size="sm" asChild className="text-slate-900 hover:bg-slate-100">
                    <Link to={section.href}>
                      {copy.modulesOpen} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-slate-200 bg-white text-slate-700">
        <div className="mx-auto w-full max-w-6xl px-6 py-10">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center overflow-hidden rounded-2xl bg-slate-100 p-2">
                  <Image src="/4.png" alt="Detapro logo" width={44} height={44} className="h-11 w-11 object-contain" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Detapro</p>
                  <p className="text-base font-semibold text-slate-900">{copy.brandSubtitle}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">{copy.footerBlurb}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-lg text-slate-800">ƒ-Z</span>
                  <span className="font-semibold text-slate-900">{copy.footerHunt}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-900">{copy.footerStatus}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{copy.footerGeneral}</p>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                {copy.footerLinksGeneral.map((label) => (
                  <Link key={label} href="#" className="hover:text-slate-900">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{copy.footerResources}</p>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                {copy.footerLinksResources.map((label) => (
                  <Link key={label} href="#" className="hover:text-slate-900">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">{copy.footerFollow}</p>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                {copy.footerLinksFollow.map((label) => (
                  <Link key={label} href="#" className="hover:text-slate-900">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              (c) {new Date().getFullYear()} Detapro. {copy.footerRights}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="#" className="hover:text-slate-900">
                {copy.footerTerms}
              </Link>
              <Link to="#" className="hover:text-slate-900">
                {copy.footerPrivacy}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-700 hover:text-slate-900"
                onClick={toggleLang}
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

