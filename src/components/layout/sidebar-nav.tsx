import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ChevronDown, ChevronLeft } from "lucide-react"

import { sidebarItems, businessSubItems } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

interface SidebarNavProps {
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function SidebarNav({ className, collapsed = false, onToggleCollapse }: SidebarNavProps) {
  const { pathname } = useLocation()
  const { lang } = useLanguage()
  const [businessOpen, setBusinessOpen] = useState(false)

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  // Check if any business sub-item is active
  const isBusinessActive = businessSubItems.some(item => isItemActive(item.href))

  return (
    <nav className={cn("flex flex-col gap-0.5 h-full", className)}>
      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mb-2",
          collapsed && "justify-center px-2"
        )}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        {!collapsed && <span className="text-xs font-medium">{lang === "es" ? "Colapsar" : "Collapse"}</span>}
      </button>

      {/* Main nav items */}
      {sidebarItems.map((item) => {
        // Special handling for "Negocio" - it's the expandable one
        if (item.href === "/negocio") return null

        const Icon = item.icon
        const isActive = isItemActive(item.href)

        return (
          <Link
            key={item.href}
            to={item.href}
            title={collapsed ? item.name[lang] : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className={cn("h-5 w-5 shrink-0", collapsed && "h-5 w-5")} />}
            {!collapsed && <span className="truncate">{item.name[lang]}</span>}
          </Link>
        )
      })}

      {/* Negocio expandable section */}
      <div>
        <button
          onClick={() => setBusinessOpen(!businessOpen)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            collapsed && "justify-center px-2",
            isBusinessActive
              ? "bg-primary text-primary-foreground"
              : "text-foreground/70 hover:bg-muted hover:text-foreground"
          )}
        >
          {(() => {
            const negocioItem = businessSubItems.find(i => i.href === "/negocio")
            const Icon = negocioItem?.icon
            return Icon ? <Icon className="h-5 w-5 shrink-0" /> : null
          })()}
          {!collapsed && (
            <>
              <span className="truncate flex-1 text-left">
                {lang === "es" ? "Negocio" : "Business"}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                businessOpen && "rotate-180"
              )} />
            </>
          )}
        </button>
        
        {businessOpen && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
            {businessSubItems.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{item.name[lang]}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Version footer */}
      <div className="mt-auto pt-4">
        {!collapsed && (
          <p className="px-3 text-[10px] text-muted-foreground">
            v1.0 • <span className="font-medium">Detapro</span>
          </p>
        )}
      </div>
    </nav>
  )
}
