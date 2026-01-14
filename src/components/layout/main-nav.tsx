import { Link, useLocation } from "react-router-dom"

import { appSections } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

type MainNavProps = {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  const { pathname } = useLocation()
  const { lang } = useLanguage()

  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-full border bg-background/80 px-1 py-1 shadow-sm backdrop-blur",
        className
      )}
    >
      {appSections.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.name[lang]}
          </Link>
        )
      })}
    </nav>
  )
}
