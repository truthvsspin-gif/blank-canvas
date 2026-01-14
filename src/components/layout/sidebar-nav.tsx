"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { appSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/providers/language-provider"

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const copy = {
    heading: isEs ? "Espacio" : "Workspace",
  }
  const [hash, setHash] = useState("")

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

  return (
    <nav className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.heading}
      </p>
      <div className="space-y-1">
        {appSections.map((item) => {
          const [path, anchor] = item.href.split("#")
          const isHashMatch = anchor ? pathname === path && hash === `#${anchor}` : false
          const isActive = activeHashHref
            ? item.href === activeHashHref
            : pathname === item.href || pathname.startsWith(`${item.href}/`) || isHashMatch

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-foreground/20 bg-foreground text-background shadow-sm"
                  : "border-transparent bg-muted/40 text-foreground hover:border-border hover:bg-muted"
              )}
            >
              <span className="font-medium">{item.name[lang]}</span>
              {item.badge ? (
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className="text-[10px] uppercase tracking-wide"
                >
                  {item.badge[lang]}
                </Badge>
              ) : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
