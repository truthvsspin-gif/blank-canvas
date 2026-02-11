import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowLeft, PanelLeftClose, PanelLeft, ChevronDown, ChevronUp, Wrench } from "lucide-react"

import { appSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

const crmItems = appSections.filter(s => s.group === "crm")

// Sub-items under Negocio
const negocioSubItems = [
  { href: "/crm/services", name: { en: "Services", es: "Servicios" }, icon: Wrench },
]

interface CrmSidebarNavProps {
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function CrmSidebarNav({ className, collapsed = false, onToggleCollapse }: CrmSidebarNavProps) {
  const { pathname } = useLocation()
  const { lang } = useLanguage()
  const [hash, setHash] = useState("")
  const [negocioOpen, setNegocioOpen] = useState(pathname.startsWith("/crm/services") || pathname === "/crm/negocio")

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash || "")
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [])

  const activeHashHref = useMemo(() => {
    const match = crmItems.find((item) => {
      const [path, anchor] = item.href.split("#")
      return anchor && pathname === path && hash === `#${anchor}`
    })
    return match?.href ?? null
  }, [hash, pathname])

  const isItemActive = (href: string) => {
    const [path, anchor] = href.split("#")
    const isHashMatch = anchor ? pathname === path && hash === `#${anchor}` : false
    return activeHashHref
      ? href === activeHashHref
      : pathname === href || pathname.startsWith(`${href}/`) || isHashMatch
  }

  const backLabel = lang === "es" ? "Volver al inicio" : "Back to Main"
  const crmLabel = lang === "es" ? "CRM" : "CRM"

  return (
    <nav className={cn("flex flex-col gap-1 h-full", className)}>
      {/* Collapse Toggle */}
      <div className={cn("flex mb-2", collapsed ? "justify-center" : "justify-end")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Back to Main */}
      <Link
        to="/dashboard"
        className={cn(
          "group flex items-center rounded-xl transition-all duration-200 mb-2",
          collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
          "text-emerald-700 hover:bg-emerald-50"
        )}
        title={collapsed ? backLabel : undefined}
      >
        <div className="flex items-center justify-center rounded-lg h-8 w-8 bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold truncate">{backLabel}</span>
        )}
      </Link>

      {/* CRM Header */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{crmLabel}</span>
        </div>
      )}

      {/* CRM Nav Items */}
      <div className="space-y-1 flex-1 overflow-y-auto scrollbar-thin">
        {crmItems.map((item) => {
          const Icon = item.icon
          const isActive = isItemActive(item.href)
          const isNegocio = item.href === "/crm/negocio"
          const hasSubItems = isNegocio && !collapsed

          return (
            <div key={item.href}>
              <div className="flex items-center">
                <Link
                  to={item.href}
                  title={collapsed ? item.name[lang] : undefined}
                  className={cn(
                    "group relative flex items-center rounded-xl transition-all duration-200 flex-1",
                    collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-emerald-500/30"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-500" />
                  )}
                  {Icon && (
                    <div className={cn(
                      "flex items-center justify-center rounded-lg transition-all duration-200",
                      collapsed ? "h-10 w-10" : "h-8 w-8",
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-emerald-100 text-emerald-700 group-hover:scale-110"
                    )}>
                      <Icon className={cn(collapsed ? "h-5 w-5" : "h-4 w-4")} />
                    </div>
                  )}
                  {!collapsed && (
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <span className={cn(
                        "font-semibold truncate text-sm",
                        isActive ? "text-foreground" : "text-foreground/70"
                      )}>
                        {item.name[lang]}
                      </span>
                      {!hasSubItems && item.badge && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-2 text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0 h-5 shrink-0 border",
                            isActive
                              ? "bg-emerald-600 text-white border-transparent"
                              : "bg-emerald-100 text-emerald-700 border-emerald-200"
                          )}
                        >
                          {item.badge[lang]}
                        </Badge>
                      )}
                    </div>
                  )}
                </Link>
                {hasSubItems && (
                  <button
                    onClick={() => setNegocioOpen(!negocioOpen)}
                    className="p-1 text-muted-foreground hover:text-foreground mr-1"
                  >
                    {negocioOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {/* Sub-items */}
              {hasSubItems && negocioOpen && (
                <div className="ml-8 mt-1 space-y-1">
                  {negocioSubItems.map((sub) => {
                    const SubIcon = sub.icon
                    const isSubActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`)
                    return (
                      <Link
                        key={sub.href}
                        to={sub.href}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-sm",
                          isSubActive
                            ? "bg-card text-foreground shadow-sm ring-1 ring-emerald-500/30"
                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {isSubActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-emerald-500" />
                        )}
                        <SubIcon className="h-4 w-4" />
                        <span className={cn("font-semibold", isSubActive ? "text-foreground" : "text-foreground/70")}>
                          {sub.name[lang]}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div className="pt-4 mt-auto">
        <div className="h-px bg-gradient-to-r from-emerald-300/30 via-emerald-400/30 to-emerald-300/30" />
        {!collapsed && (
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            CRM • <span className="text-emerald-600 font-medium">Detapro</span>
          </p>
        )}
      </div>
    </nav>
  )
}
