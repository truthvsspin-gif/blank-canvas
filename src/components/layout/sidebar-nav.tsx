import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, Sparkles, PanelLeftClose, PanelLeft } from "lucide-react"

import { navGroups, appSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

// Color schemes for each group
const groupColors: Record<string, { 
  iconBg: string
  iconColor: string
  activeBg: string
  activeIndicator: string
  badgeBg: string
  dotColor: string
}> = {
  main: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    activeBg: "bg-gradient-to-r from-blue-600 to-blue-500",
    activeIndicator: "bg-blue-400",
    badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
  },
  crm: {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    activeBg: "bg-gradient-to-r from-emerald-600 to-emerald-500",
    activeIndicator: "bg-emerald-400",
    badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  messaging: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    activeBg: "bg-gradient-to-r from-violet-600 to-violet-500",
    activeIndicator: "bg-violet-400",
    badgeBg: "bg-violet-100 text-violet-700 border-violet-200",
    dotColor: "bg-violet-500",
  },
  settings: {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    activeBg: "bg-gradient-to-r from-amber-600 to-amber-500",
    activeIndicator: "bg-amber-400",
    badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
  },
}

interface SidebarNavProps {
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function SidebarNav({ className, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const { pathname } = useLocation()
  const { lang } = useLanguage()
  const [hash, setHash] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    crm: true,
    messaging: true,
    settings: true,
  })

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash || "")
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [])

  const activeHashHref = useMemo(() => {
    const match = appSections.find((item) => {
      const [path, anchor] = item.href.split("#")
      return anchor && pathname === path && hash === `#${anchor}`
    })
    return match?.href ?? null
  }, [hash, pathname])

  const toggleGroup = (groupId: string) => {
    if (collapsed) return
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  const isItemActive = (href: string) => {
    const [path, anchor] = href.split("#")
    const isHashMatch = anchor ? pathname === path && hash === `#${anchor}` : false
    return activeHashHref
      ? href === activeHashHref
      : pathname === href || pathname.startsWith(`${href}/`) || isHashMatch
  }

  return (
    <nav className={cn("flex flex-col gap-1 h-full", className)}>
      {/* Collapse Toggle Button */}
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

      {/* Pro Badge */}
      <div className={cn(
        "mb-4 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 border border-violet-200 transition-all duration-300",
        collapsed ? "p-2" : "p-3"
      )}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-300">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-violet-700">Pro Workspace</p>
              <p className="text-[11px] text-violet-600/70">Unlimited access</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin">
        {navGroups.map((group) => {
          const colors = groupColors[group.id] || groupColors.main
          
          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full", colors.dotColor)} />
                    <span>{group.label[lang]}</span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      expandedGroups[group.id] ? "rotate-0" : "-rotate-90"
                    )} 
                  />
                </button>
              )}

              {/* Group Items */}
              <div
                className={cn(
                  "space-y-1 overflow-hidden transition-all duration-300 ease-out",
                  collapsed ? "max-h-[500px] opacity-100" : "",
                  !collapsed && expandedGroups[group.id] ? "max-h-[500px] opacity-100" : "",
                  !collapsed && !expandedGroups[group.id] ? "max-h-0 opacity-0" : ""
                )}
              >
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = isItemActive(item.href)

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      title={collapsed ? item.name[lang] : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl transition-all duration-200",
                        collapsed ? "justify-center p-2" : "gap-3 px-3 py-2.5",
                        isActive
                          ? cn(colors.activeBg, "text-white shadow-lg")
                          : "text-foreground/70 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && !collapsed && (
                        <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full",
                          colors.activeIndicator
                        )} />
                      )}
                      
                      {/* Icon */}
                      {Icon && (
                        <div className={cn(
                          "flex items-center justify-center rounded-lg transition-all duration-200",
                          collapsed ? "h-10 w-10" : "h-8 w-8",
                          isActive 
                            ? "bg-white/20 text-white" 
                            : cn(colors.iconBg, colors.iconColor, "group-hover:scale-110")
                        )}>
                          <Icon className={cn(collapsed ? "h-5 w-5" : "h-4 w-4")} />
                        </div>
                      )}
                      
                      {/* Text & Badge (hidden when collapsed) */}
                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <span className={cn(
                            "font-medium truncate text-sm",
                            isActive ? "text-white" : ""
                          )}>
                            {item.name[lang]}
                          </span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-2 text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0 h-5 shrink-0 border",
                                isActive 
                                  ? "bg-white/20 text-white border-white/30" 
                                  : colors.badgeBg
                              )}
                            >
                              {item.badge[lang]}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom decoration */}
      <div className="pt-4 mt-auto">
        <div className="h-px bg-gradient-to-r from-blue-300/30 via-violet-300/30 to-pink-300/30" />
        {!collapsed && (
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            v1.0.0 • <span className="text-violet-600 font-medium">Detapro</span>
          </p>
        )}
      </div>
    </nav>
  )
}
