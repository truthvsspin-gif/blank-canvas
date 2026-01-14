"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Filter, MoreHorizontal, Plus, Search, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Toast } from "@/components/ui/toast"
import { useLanguage } from "@/components/providers/language-provider"

type Deal = {
  title: string
  company: string
  value: string
  status: "success" | "warn" | "danger" | "neutral"
}

type Column = {
  key: string
  titleEs: string
  titleEn: string
  deals: Deal[]
}

const baseColumns: Column[] = [
  {
    key: "qualified",
    titleEs: "Calificado",
    titleEn: "Qualified",
    deals: [
      { title: "Fresh Goods Deal", company: "Fresh Goods, LLC", value: "$0", status: "danger" },
      { title: "Mover Deal", company: "Mover Limited", value: "$0", status: "success" },
      { title: "Silicon Deal", company: "Silicon Links Inc", value: "$0", status: "success" },
      { title: "Test Deal", company: "Test", value: "$0", status: "neutral" },
    ],
  },
  {
    key: "contact",
    titleEs: "Contacto iniciado",
    titleEn: "Contact made",
    deals: [
      { title: "Ownerate Deal", company: "Ownerate LLP", value: "$0", status: "success" },
      { title: "Omnicorp Deal", company: "Omnicorp", value: "$0", status: "success" },
      { title: "Blue Marble Deal", company: "Blue Marble LLP", value: "$0", status: "neutral" },
    ],
  },
  {
    key: "demo",
    titleEs: "Demo agendada",
    titleEn: "Demo scheduled",
    deals: [
      { title: "Mindbend Deal", company: "Mindbend LLP", value: "$0", status: "warn" },
      { title: "ABC Deal", company: "ABC Inc", value: "$0", status: "warn" },
    ],
  },
  {
    key: "proposal",
    titleEs: "Propuesta enviada",
    titleEn: "Proposal made",
    deals: [{ title: "Big Wheels Deal", company: "Big Wheels Inc", value: "$0", status: "success" }],
  },
  {
    key: "negotiation",
    titleEs: "Negociacion",
    titleEn: "Negotiation",
    deals: [
      { title: "Wolfs Deal", company: "Wolfs Corp", value: "$0", status: "danger" },
      { title: "Principalspace Deal", company: "Principalspace Inc", value: "$0", status: "success" },
    ],
  },
]

const badgeTone: Record<Deal["status"], string> = {
  success: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warn: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-rose-100 text-rose-700 border-rose-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
}

type MenuAction = {
  label: string
  onSelect: () => void
}

function ActionMenu({
  actions,
  label,
}: {
  actions: MenuAction[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-600 hover:text-rose-600"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={label}
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg shadow-rose-100/30 ring-1 ring-black/5">
          <div className="py-1">
            {actions.map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => {
                  action.onSelect()
                  setOpen(false)
                }}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function CrmPage() {
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [stageFilter, setStageFilter] = useState<string[]>([])
  const [compactCards, setCompactCards] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; variant?: "success" | "error" } | null>(null)

  const copy = isEs
    ? {
        title: "CRM",
        subtitle: "Tablero de deals estilo pipeline con estados claros.",
        addDeal: "Nuevo deal",
        addService: "Nuevo servicio",
        totalDeals: "deals",
        pipeline: "Pipeline",
        filters: "Filtros",
        viewAll: "Todos",
        searchPlaceholder: "Buscar deals",
        settings: "Ajustes",
        quickActions: "Acciones rapidas",
        resetFilters: "Restablecer filtros",
        openSettings: "Abrir ajustes",
        compactOn: "Usar tarjetas compactas",
        compactOff: "Usar tarjetas amplias",
        compactOnToast: "Vista compacta activada",
        compactOffToast: "Vista amplia activada",
        filtersTitle: "Filtros rapidos",
        filtersDesc: "Filtra por etapa y texto. (Placeholder sin datos reales).",
        filtersNote: "Se filtrara localmente hasta que conectemos el pipeline a Supabase.",
        settingsTitle: "Ajustes de tablero",
        settingsDesc: "Placeholders de configuracion visual.",
        settingsHint: "Estas opciones son locales por ahora. Usalas como referencia antes de conectar la API real.",
        columnActions: "Acciones de columna",
        filterStage: "Filtrar esta etapa",
        copyColumn: "Copiar nombre",
        copied: "Nombre copiado",
        copyFailed: "No se pudo copiar",
        emptyColumn: "Sin resultados para este filtro",
      }
    : {
        title: "CRM",
        subtitle: "Pipeline-style deals board with clear statuses.",
        addDeal: "New deal",
        addService: "New service",
        totalDeals: "deals",
        pipeline: "Pipeline",
        filters: "Filters",
        viewAll: "All",
        searchPlaceholder: "Search deals",
        settings: "Settings",
        quickActions: "Quick actions",
        resetFilters: "Reset filters",
        openSettings: "Open settings",
        compactOn: "Use compact cards",
        compactOff: "Use roomy cards",
        compactOnToast: "Compact cards on",
        compactOffToast: "Roomy cards on",
        filtersTitle: "Quick filters",
        filtersDesc: "Filter by stage and text. (Placeholder with no real data).",
        filtersNote: "Filtering stays local until we wire this pipeline to Supabase.",
        settingsTitle: "Board settings",
        settingsDesc: "Visual configuration placeholders.",
        settingsHint: "These options are local for now. Use them as a reference before connecting the real API.",
        columnActions: "Column actions",
        filterStage: "Filter to this stage",
        copyColumn: "Copy column name",
        copied: "Copied column name",
        copyFailed: "Copy failed",
        emptyColumn: "No results for this filter",
      }

  const columns = useMemo(() => {
    const activeStages = stageFilter.length ? new Set(stageFilter) : null
    const term = search.toLowerCase().trim()

    return baseColumns
      .filter((col) => (activeStages ? activeStages.has(col.key) : true))
      .map((col) => {
        const filteredDeals = term
          ? col.deals.filter(
              (deal) =>
                deal.title.toLowerCase().includes(term) || deal.company.toLowerCase().includes(term),
            )
          : col.deals
        return { ...col, deals: filteredDeals }
      })
  }, [search, stageFilter])

  const totalVisibleDeals = columns.reduce((sum, col) => sum + col.deals.length, 0)

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  return (
    <div className="space-y-6">
      {feedback ? <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} /> : null}
      <Card className="border-rose-100/70 bg-white shadow-sm shadow-rose-50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.subtitle}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs">
              <span className="text-xs uppercase tracking-[0.14em] text-rose-600">{copy.pipeline}</span>
              <Badge variant="outline" className="border-slate-200 text-slate-700">
                {totalVisibleDeals} {copy.totalDeals}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter className="mr-2 size-4" />
              {copy.filters}
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700" asChild>
              <Link href="/crm/customers">
                {isEs ? "Ver clientes" : "View customers"}
              </Link>
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-500" asChild>
              <Link href="/crm/bookings/new">
                <Plus className="mr-2 size-4" />
                {copy.addDeal}
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200 text-slate-700" asChild>
              <Link href="/crm/services">
                <Plus className="mr-2 size-4" />
                {copy.addService}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs">
            <Search className="size-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </label>
          <Button variant="outline" size="sm" className="border-slate-200 text-slate-700" onClick={() => setStageFilter([])}>
            {copy.viewAll}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-rose-600"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <Settings className="size-4" />
            <span className="sr-only">{copy.settings}</span>
          </Button>
          <ActionMenu
            label={copy.quickActions}
            actions={[
              {
                label: copy.resetFilters,
                onSelect: () => {
                  setSearch("")
                  setStageFilter([])
                  setFiltersOpen(false)
                  setFeedback({ message: isEs ? "Filtros restablecidos" : "Filters reset" })
                },
              },
              {
                label: copy.openSettings,
                onSelect: () => {
                  setSettingsOpen(true)
                  setFeedback({ message: isEs ? "Ajustes abiertos" : "Settings opened" })
                },
              },
              {
                label: compactCards ? copy.compactOff : copy.compactOn,
                onSelect: () => {
                  setCompactCards((v) => !v)
                  setFeedback({
                    message: compactCards ? copy.compactOffToast : copy.compactOnToast,
                  })
                },
              },
            ]}
          />
        </CardContent>
      </Card>

      {filtersOpen ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>{copy.filtersTitle}</CardTitle>
            <CardDescription>{copy.filtersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-slate-700">
            <div className="flex flex-wrap gap-3">
              {baseColumns.map((col) => {
                const checked = stageFilter.includes(col.key)
                return (
                  <label
                    key={col.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${
                      checked ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-rose-600"
                      checked={checked}
                      onChange={() =>
                        setStageFilter((prev) =>
                          checked ? prev.filter((k) => k !== col.key) : [...prev, col.key],
                        )
                      }
                    />
                    <span className="text-sm">{isEs ? col.titleEs : col.titleEn}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-slate-500">{copy.filtersNote}</p>
          </CardContent>
        </Card>
      ) : null}

      {settingsOpen ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>{copy.settingsTitle}</CardTitle>
            <CardDescription>{copy.settingsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-rose-600"
                checked={compactCards}
                onChange={(e) => setCompactCards(e.target.checked)}
              />
              <span>{copy.compactOn}</span>
            </label>
            <p className="text-xs text-slate-500">{copy.settingsHint}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {columns.map((column) => (
          <div key={column.key} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {isEs ? column.titleEs : column.titleEn}
                </p>
                <p className="text-xs text-slate-500">
                  {column.deals.length} {copy.totalDeals}
                </p>
              </div>
              <ActionMenu
                label={copy.columnActions}
                actions={[
                  {
                    label: copy.filterStage,
                    onSelect: () => {
                      setStageFilter([column.key])
                      setFiltersOpen(false)
                      setFeedback({
                        message: isEs
                          ? `Filtrando por ${column.titleEs}`
                          : `Filtering to ${column.titleEn}`,
                      })
                    },
                  },
                  {
                    label: copy.copyColumn,
                    onSelect: () => {
                      const text = isEs ? column.titleEs : column.titleEn
                      navigator.clipboard
                        ?.writeText(text)
                        .then(() => setFeedback({ message: copy.copied }))
                        .catch(() => setFeedback({ message: copy.copyFailed, variant: "error" }))
                    },
                  },
                ]}
              />
            </div>
            <div className="space-y-3 p-3">
              {column.deals.map((deal) => (
                <div
                  key={deal.title}
                  className={`rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-xs hover:border-rose-200 hover:bg-rose-50 ${
                    compactCards ? "text-xs" : "text-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{deal.title}</p>
                      <p className="text-xs text-slate-500">{deal.company}</p>
                    </div>
                    <Badge className={`${badgeTone[deal.status]} flex items-center gap-1`}>
                      <span className="size-2 rounded-full bg-current" />
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{deal.value}</span>
                    <span className="text-slate-400">$0</span>
                  </div>
                </div>
              ))}
              {column.deals.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-slate-500">
                  {copy.emptyColumn}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
