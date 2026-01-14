import * as React from "react"
import { Link } from "react-router-dom"
import { 
  ArrowRight, 
  Check, 
  Menu, 
  X,
  Sparkles, 
  BarChart3, 
  Users, 
  MessageSquare,
  Bot,
  Calendar,
  ChevronRight,
  Play,
  Star,
  Zap,
  Shield,
  Clock,
  Phone,
  Instagram
} from "lucide-react"

import { appSections } from "@/config/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

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
        nav: { dashboard: "Dashboard", admin: "Admin", login: "Iniciar sesión" },
        hero: {
          badge: "Nuevo: IA Conversacional",
          title: "Automatiza tu negocio",
          titleHighlight: "con inteligencia",
          subtitle: "CRM, mensajería y reservas unificados en una plataforma elegante. Gestiona WhatsApp e Instagram desde un solo lugar.",
          cta: "Comenzar gratis",
          ctaSecondary: "Ver demo",
          trust: "Más de 500+ negocios confían en nosotros"
        },
        stats: [
          { value: "99.9%", label: "Uptime garantizado" },
          { value: "50K+", label: "Mensajes procesados" },
          { value: "24/7", label: "Soporte disponible" },
          { value: "2min", label: "Tiempo de respuesta" }
        ],
        features: {
          title: "Todo lo que necesitas",
          subtitle: "Herramientas potentes para escalar tu negocio",
          items: [
            { icon: MessageSquare, title: "Inbox Unificado", desc: "WhatsApp e Instagram en un solo lugar", color: "emerald" },
            { icon: Bot, title: "Chatbot IA", desc: "Respuestas automáticas inteligentes", color: "violet" },
            { icon: Calendar, title: "Reservas Smart", desc: "Agenda automática con confirmaciones", color: "blue" },
            { icon: BarChart3, title: "Analytics", desc: "Métricas en tiempo real", color: "orange" },
            { icon: Users, title: "CRM Completo", desc: "Gestiona leads y clientes", color: "pink" },
            { icon: Shield, title: "Seguridad", desc: "Datos protegidos y encriptados", color: "slate" }
          ]
        },
        modules: {
          title: "Explora los módulos",
          subtitle: "Cada sección diseñada para maximizar tu productividad"
        },
        cta: {
          title: "¿Listo para automatizar?",
          subtitle: "Únete a cientos de negocios que ya confían en Detapro",
          button: "Comenzar ahora"
        },
        footer: {
          brand: "Detapro",
          tagline: "Automatización inteligente para tu negocio",
          rights: "Todos los derechos reservados",
          links: ["Términos", "Privacidad", "Contacto"]
        }
      }
    : {
        nav: { dashboard: "Dashboard", admin: "Admin", login: "Sign in" },
        hero: {
          badge: "New: Conversational AI",
          title: "Automate your business",
          titleHighlight: "with intelligence",
          subtitle: "CRM, messaging and bookings unified in one elegant platform. Manage WhatsApp and Instagram from a single place.",
          cta: "Start free",
          ctaSecondary: "Watch demo",
          trust: "Trusted by 500+ businesses"
        },
        stats: [
          { value: "99.9%", label: "Guaranteed uptime" },
          { value: "50K+", label: "Messages processed" },
          { value: "24/7", label: "Support available" },
          { value: "2min", label: "Response time" }
        ],
        features: {
          title: "Everything you need",
          subtitle: "Powerful tools to scale your business",
          items: [
            { icon: MessageSquare, title: "Unified Inbox", desc: "WhatsApp & Instagram in one place", color: "emerald" },
            { icon: Bot, title: "AI Chatbot", desc: "Smart automatic responses", color: "violet" },
            { icon: Calendar, title: "Smart Booking", desc: "Automatic scheduling with confirmations", color: "blue" },
            { icon: BarChart3, title: "Analytics", desc: "Real-time metrics", color: "orange" },
            { icon: Users, title: "Full CRM", desc: "Manage leads & customers", color: "pink" },
            { icon: Shield, title: "Security", desc: "Protected & encrypted data", color: "slate" }
          ]
        },
        modules: {
          title: "Explore modules",
          subtitle: "Each section designed to maximize your productivity"
        },
        cta: {
          title: "Ready to automate?",
          subtitle: "Join hundreds of businesses that already trust Detapro",
          button: "Get started now"
        },
        footer: {
          brand: "Detapro",
          tagline: "Intelligent automation for your business",
          rights: "All rights reserved",
          links: ["Terms", "Privacy", "Contact"]
        }
      }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
      violet: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
      blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
      orange: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
      pink: { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/20" },
      slate: { bg: "bg-slate-500/10", text: "text-slate-500", border: "border-slate-500/20" }
    }
    return colors[color] || colors.slate
  }

  return (
    <div className="min-h-screen bg-white text-foreground overflow-x-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-200/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl px-6 py-3 shadow-sm">
            <Link to="/" className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 p-0.5">
                <div className="size-full rounded-[10px] bg-white flex items-center justify-center">
                  <img src="/4.png" alt="Logo" className="size-6 object-contain" />
                </div>
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">Detapro</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {appSections.slice(0, 4).map((section) => (
                <Link
                  key={section.href}
                  to={section.href}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                >
                  {section.name[lang]}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLang}
                className="hidden sm:flex size-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                {lang.toUpperCase()}
              </button>
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
              >
                {copy.nav.dashboard}
                <ArrowRight className="size-4" />
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden size-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mx-6 mt-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl p-4 shadow-lg animate-fade-in">
            {appSections.map((section) => (
              <Link
                key={section.href}
                to={section.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {section.name[lang]}
                <ChevronRight className="size-4" />
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
              <button onClick={toggleLang} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700">
                {lang === "es" ? "English" : "Español"}
              </button>
              <Link to="/dashboard" className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold text-center">
                {copy.nav.dashboard}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm text-violet-600 mb-8 animate-fade-in">
              <Sparkles className="size-4" />
              {copy.hero.badge}
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-slate-900 animate-fade-in" style={{ animationDelay: "100ms" }}>
              {copy.hero.title}
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-emerald-500 to-blue-600 bg-clip-text text-transparent">
                {copy.hero.titleHighlight}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: "200ms" }}>
              {copy.hero.subtitle}
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in" style={{ animationDelay: "300ms" }}>
              <Link
                to="/dashboard"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105"
              >
                {copy.hero.cta}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Trust */}
            <div className="flex items-center gap-2 text-sm text-slate-500 animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="size-8 rounded-full bg-gradient-to-br from-violet-400 to-emerald-400 border-2 border-white" />
                ))}
              </div>
              <div className="flex items-center gap-1 ml-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="ml-2">{copy.hero.trust}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {copy.stats.map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center hover:shadow-lg hover:border-slate-300 transition-all animate-fade-in"
                style={{ animationDelay: `${500 + i * 100}ms` }}
              >
                <p className="text-3xl sm:text-4xl font-bold text-slate-900">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-slate-900">{copy.features.title}</h2>
            <p className="text-lg text-slate-500">{copy.features.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {copy.features.items.map((feature, i) => {
              const colors = getColorClasses(feature.color)
              return (
                <div
                  key={feature.title}
                  className={`group relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 animate-fade-in`}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`inline-flex size-12 items-center justify-center rounded-xl ${colors.bg} ${colors.text} mb-4 transition-transform group-hover:scale-110`}>
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-900">{feature.title}</h3>
                  <p className="text-slate-500 text-sm">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-6 border-y border-slate-200 bg-slate-50/50">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
            <p className="text-slate-400 text-sm uppercase tracking-wider">{isEs ? "Integraciones" : "Integrations"}</p>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="size-6" />
                <span className="font-medium">WhatsApp</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-3 text-slate-600">
                <Instagram className="size-6" />
                <span className="font-medium">Instagram</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-3 text-slate-600">
                <Zap className="size-6" />
                <span className="font-medium">API</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-slate-900">{copy.modules.title}</h2>
            <p className="text-lg text-slate-500">{copy.modules.subtitle}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {appSections.map((section, i) => (
              <Link
                key={section.href}
                to={section.href}
                className="group relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{section.name[lang]}</h3>
                      {section.badge && (
                        <Badge className="bg-violet-100 text-violet-600 border-violet-200 text-xs">
                          {section.badge[lang]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{section.summary[lang]}</p>
                  </div>
                  <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <ArrowRight className="size-5 text-slate-400 group-hover:text-slate-600 transition-colors group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-12 text-center overflow-hidden shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-slate-900">{copy.cta.title}</h2>
              <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto">{copy.cta.subtitle}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-4 text-base font-semibold text-white hover:bg-slate-800 transition-all hover:scale-105"
              >
                {copy.cta.button}
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-6 bg-slate-50/50">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 p-0.5">
                <div className="size-full rounded-[10px] bg-white flex items-center justify-center">
                  <img src="/4.png" alt="Logo" className="size-6 object-contain" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{copy.footer.brand}</p>
                <p className="text-sm text-slate-500">{copy.footer.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              {copy.footer.links.map((link) => (
                <a key={link} href="#" className="hover:text-slate-900 transition-colors">
                  {link}
                </a>
              ))}
              <button onClick={toggleLang} className="hover:text-slate-900 transition-colors">
                {lang === "es" ? "English" : "Español"}
              </button>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 text-center text-sm text-slate-400">
            © 2024 Detapro. {copy.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  )
}
