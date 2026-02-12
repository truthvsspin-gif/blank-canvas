import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { MainNav } from "@/components/layout/main-nav";
import { UserNav } from "@/components/layout/user-nav";
import { CrmSidebarNav } from "@/components/layout/crm-sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/providers/language-provider";
import { BusinessGate } from "@/components/business/business-gate";
import { appSections } from "@/config/navigation";

export default function CrmLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { lang, toggleLang } = useLanguage();
  const isSpanish = lang === "es";
  const copy = {
    brandSubtitle: isSpanish ? "CRM" : "CRM",
    badge: isSpanish ? "Módulo CRM" : "CRM Module",
    switchTenant: isSpanish ? "Cambiar espacio" : "Switch tenant",
    langLabel: isSpanish ? "ES" : "EN",
    langAlt: isSpanish ? "Cambiar a ingles" : "Switch to Spanish",
    sessionCheck: isSpanish ? "Verificando tu sesion..." : "Checking your session...",
    menuLabel: isSpanish ? "Abrir menu" : "Open menu",
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {copy.sessionCheck}
      </div>
    );
  }

  const crmSections = appSections.filter(s => s.group === "crm");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border bg-emerald-50 text-sm font-semibold overflow-hidden">
              <img
                src="/4.png"
                alt="Detapro logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-emerald-600">Detapro</p>
              <p className="text-sm font-semibold">{copy.brandSubtitle}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Badge variant="secondary" className="hidden sm:inline-flex bg-emerald-100 text-emerald-700 border-emerald-200">
                {copy.badge}
              </Badge>
              <Button variant="outline" size="sm">
                {copy.switchTenant}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="border border-input"
                aria-label={copy.langAlt}
                onClick={() => toggleLang()}
              >
                {copy.langLabel}
              </Button>
              <UserNav />
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="border border-input"
                aria-label={copy.langAlt}
                onClick={() => toggleLang()}
              >
                {copy.langLabel}
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-input"
                  aria-label={copy.menuLabel}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <Menu className="size-5" />
                </Button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white p-2 shadow-lg">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-slate-800">
                      <span>{copy.badge}</span>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {crmSections.map((section) => (
                        <Link
                          key={section.href}
                          to={section.href}
                          className="rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-emerald-50"
                          onClick={() => setMenuOpen(false)}
                        >
                          {section.name[lang]}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-4 px-3 py-6 sm:gap-6 sm:px-6 sm:py-10">
        <aside className={cn(
          "sticky top-20 hidden h-[calc(100vh-120px)] flex-none overflow-hidden rounded-2xl border border-emerald-200/50 bg-card/50 backdrop-blur-sm shadow-xl shadow-emerald-900/5 md:block transition-all duration-300",
          sidebarCollapsed ? "w-20" : "w-64"
        )}>
          <div className="flex h-full flex-col p-3 overflow-y-auto scrollbar-thin">
            <CrmSidebarNav
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </div>
        </aside>
        <main className="flex-1 space-y-6 sm:space-y-8 min-w-0">
          <BusinessGate>
            <Outlet />
          </BusinessGate>
        </main>
      </div>
    </div>
  );
}
