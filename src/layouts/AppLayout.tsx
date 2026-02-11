import { Link, Outlet, useLocation } from "react-router-dom"
import { Menu, Bell, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

import { UserNav } from "@/components/layout/user-nav"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/components/providers/language-provider"
import { BusinessGate } from "@/components/business/business-gate"
import { sidebarItems } from "@/config/navigation"

export default function AppLayout() {
  const { loading } = useAuth()
  const { lang } = useLanguage()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {lang === "es" ? "Verificando sesión..." : "Checking session..."}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "sticky top-0 hidden h-screen flex-none border-r border-border bg-card md:flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-[60px]" : "w-[220px]"
      )}>
        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-border px-4 py-4",
          sidebarCollapsed && "justify-center px-2"
        )}>
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img
              src="/4.png"
              alt="Detapro"
              className="h-8 w-8 rounded-lg object-contain"
            />
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">Detapro</p>
                <p className="text-[10px] text-muted-foreground">Powered by Detapro</p>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          <SidebarNav
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-card border-r border-border shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
                <img src="/4.png" alt="Detapro" className="h-8 w-8 rounded-lg object-contain" />
                <p className="text-sm font-bold text-foreground">Detapro</p>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-2 overflow-y-auto h-[calc(100%-60px)]">
              <SidebarNav collapsed={false} onToggleCollapse={() => {}} />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </Button>
            <UserNav />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          <BusinessGate>
            <Outlet />
          </BusinessGate>
        </main>
      </div>
    </div>
  )
}
