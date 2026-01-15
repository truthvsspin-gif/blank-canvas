import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, Sparkles } from "lucide-react"

import { navGroups, appSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/providers/language-provider"

export function SidebarNav({ className }: { className?: string }) {
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
    <nav className={cn("flex flex-col gap-1", className)}>
      {/* Pro Badge */}
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-3 border border-accent/20">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">Pro Workspace</p>
          <p className="text-[10px] text-muted-foreground truncate">Unlimited access</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="space-y-4">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{group.label[lang]}</span>
              <ChevronDown 
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  expandedGroups[group.id] ? "rotate-0" : "-rotate-90"
                )} 
              />
            </button>

            {/* Group Items */}
            <div
              className={cn(
                "space-y-0.5 overflow-hidden transition-all duration-200",
                expandedGroups[group.id] ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = isItemActive(item.href)

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                      isActive
                        ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                        : "text-foreground/70 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent" />
                    )}
                    
                    {/* Icon */}
                    {Icon && (
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isActive 
                          ? "bg-background/20 text-background" 
                          : "bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    
                    {/* Text & Badge */}
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <span className={cn(
                        "font-medium truncate",
                        isActive ? "text-background" : ""
                      )}>
                        {item.name[lang]}
                      </span>
                      {item.badge && (
                        <Badge
                          variant={isActive ? "secondary" : "outline"}
                          className={cn(
                            "ml-2 text-[9px] uppercase tracking-wide font-semibold px-1.5 py-0 h-5 shrink-0",
                            isActive 
                              ? "bg-background/20 text-background border-background/30" 
                              : "bg-transparent"
                          )}
                        >
                          {item.badge[lang]}
                        </Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom decoration */}
      <div className="mt-auto pt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          v1.0.0 • Detapro
        </p>
      </div>
    </nav>
  )
}
