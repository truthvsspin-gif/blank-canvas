import { useState, useEffect, useCallback } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Plus, X, Settings, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DocTab = "invoices" | "estimates" | "delivery_notes" | "receptions";

const docTabs: { key: DocTab; label: { en: string; es: string }; docType: string }[] = [
  { key: "invoices", label: { en: "Invoices", es: "Facturas" }, docType: "invoice" },
  { key: "estimates", label: { en: "Estimates", es: "Presupuestos" }, docType: "estimate" },
  { key: "delivery_notes", label: { en: "Delivery Notes", es: "Albaranes" }, docType: "delivery_note" },
  { key: "receptions", label: { en: "Receptions", es: "Recepciones" }, docType: "reception" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

type DrawerDocType = "invoice" | "estimate" | null;

type DocsPageSettings = {
  autoNumbering: boolean;
  defaultTaxPct: number;
  invoicePrefix: string;
  estimatePrefix: string;
  footerNote: string;
};

const defaultDocsPageSettings: DocsPageSettings = {
  autoNumbering: true,
  defaultTaxPct: 21,
  invoicePrefix: "INV",
  estimatePrefix: "EST",
  footerNote: "",
};

export default function Docs() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<DocTab>("invoices");
  const [search, setSearch] = useState("");
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<DrawerDocType>(null);
  const [saving, setSaving] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pageSettings, setPageSettings] = useState<DocsPageSettings>(defaultDocsPageSettings);

  const [form, setForm] = useState({
    customer_id: "",
    order_id: "",
    doc_number: "",
    total: "",
    taxes: "",
    notes: "",
  });

  const currentDocType = docTabs.find((t) => t.key === activeTab)!.docType;
  const settingsStorageKey = businessId ? `crm-docs-settings:${businessId}` : null;

  const fetchDocs = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*, customers(full_name)")
      .eq("business_id", businessId)
      .eq("doc_type", currentDocType)
      .order("created_at", { ascending: false });
    setDocs(data || []);
    setLoading(false);
  }, [businessId, currentDocType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    if (!drawerOpen || !businessId) return;
    Promise.all([
      supabase.from("customers").select("id, full_name").eq("business_id", businessId).order("full_name"),
      supabase.from("work_orders").select("id, service_name").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    ]).then(([c, o]) => {
      setCustomers(c.data || []);
      setOrders(o.data || []);
    });
  }, [drawerOpen, businessId]);

  useEffect(() => {
    if (!settingsStorageKey) {
      setPageSettings(defaultDocsPageSettings);
      return;
    }
    const raw = localStorage.getItem(settingsStorageKey);
    if (!raw) {
      setPageSettings(defaultDocsPageSettings);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<DocsPageSettings>;
      setPageSettings({
        autoNumbering:
          typeof parsed.autoNumbering === "boolean"
            ? parsed.autoNumbering
            : defaultDocsPageSettings.autoNumbering,
        defaultTaxPct:
          typeof parsed.defaultTaxPct === "number"
            ? parsed.defaultTaxPct
            : defaultDocsPageSettings.defaultTaxPct,
        invoicePrefix:
          typeof parsed.invoicePrefix === "string"
            ? parsed.invoicePrefix
            : defaultDocsPageSettings.invoicePrefix,
        estimatePrefix:
          typeof parsed.estimatePrefix === "string"
            ? parsed.estimatePrefix
            : defaultDocsPageSettings.estimatePrefix,
        footerNote:
          typeof parsed.footerNote === "string"
            ? parsed.footerNote
            : defaultDocsPageSettings.footerNote,
      });
    } catch {
      setPageSettings(defaultDocsPageSettings);
    }
  }, [settingsStorageKey]);

  const handleCreate = async () => {
    if (!businessId || !drawerOpen) return;
    setSaving(true);
    await supabase.from("documents").insert({
      business_id: businessId,
      doc_type: drawerOpen,
      customer_id: form.customer_id || null,
      order_id: form.order_id || null,
      doc_number: form.doc_number || null,
      total: form.total ? parseFloat(form.total) : 0,
      taxes: form.taxes ? parseFloat(form.taxes) : 0,
      notes: form.notes || null,
      status: "draft",
    });
    setSaving(false);
    setDrawerOpen(null);
    setForm({ customer_id: "", order_id: "", doc_number: "", total: "", taxes: "", notes: "" });
    fetchDocs();
  };

  const filtered = docs.filter((d) => {
    if (!search) return true;
    return JSON.stringify(d).toLowerCase().includes(search.toLowerCase());
  });
  const docsStats = {
    total: docs.length,
    draft: docs.filter((doc) => doc.status === "draft").length,
    sent: docs.filter((doc) => doc.status === "sent").length,
    paid: docs.filter((doc) => doc.status === "paid").length,
    cancelled: docs.filter((doc) => doc.status === "cancelled").length,
    amount: docs.reduce((acc, doc) => acc + Number(doc.total || 0), 0),
    taxes: docs.reduce((acc, doc) => acc + Number(doc.taxes || 0), 0),
  };

  const tabConfig: Record<DocTab, {
    columns: { key: string; label: { en: string; es: string } }[];
    createLabel: { en: string; es: string } | null;
    emptyLabel: { en: string; es: string };
    showSortFilter: boolean;
    emoji: string;
  }> = {
    invoices: {
      columns: [
        { key: "num", label: { en: "INVOICE #", es: "Nº FACTURA" } },
        { key: "order", label: { en: "ORDER", es: "ORDEN" } },
        { key: "customer", label: { en: "CUSTOMER", es: "CLIENTE" } },
        { key: "date", label: { en: "DATE", es: "FECHA" } },
        { key: "taxes", label: { en: "TAXES", es: "IMPUESTOS" } },
        { key: "total", label: { en: "TOTAL", es: "TOTAL" } },
        { key: "status", label: { en: "STATUS", es: "ESTADO" } },
      ],
      createLabel: { en: "Invoice", es: "Factura" },
      emptyLabel: { en: "No invoices created yet", es: "Aún no hay ningún Factura creado" },
      showSortFilter: true,
      emoji: "📄",
    },
    estimates: {
      columns: [
        { key: "num", label: { en: "ESTIMATE #", es: "Nº PRESUPUESTO" } },
        { key: "order", label: { en: "ORDER", es: "ORDEN" } },
        { key: "customer", label: { en: "CUSTOMER", es: "CLIENTE" } },
        { key: "date", label: { en: "CREATED", es: "CREADO" } },
        { key: "taxes", label: { en: "TAXES", es: "IMPUESTOS" } },
        { key: "total", label: { en: "TOTAL", es: "TOTAL" } },
        { key: "status", label: { en: "STATUS", es: "ESTADO" } },
      ],
      createLabel: { en: "Estimate", es: "Presupuesto" },
      emptyLabel: { en: "No estimates created yet", es: "Aún no hay ningún Presupuesto creado" },
      showSortFilter: false,
      emoji: "📋",
    },
    delivery_notes: {
      columns: [
        { key: "num", label: { en: "NOTE #", es: "Nº ALBARÁN" } },
        { key: "customer", label: { en: "CUSTOMER", es: "CLIENTE" } },
        { key: "date", label: { en: "DATE", es: "FECHA" } },
        { key: "taxes", label: { en: "TAXES", es: "IMPUESTOS" } },
        { key: "total", label: { en: "TOTAL", es: "TOTAL" } },
        { key: "notes", label: { en: "NOTES", es: "NOTAS" } },
      ],
      createLabel: null,
      emptyLabel: { en: "No delivery notes created yet", es: "Aún no hay ningún Albaranes creado" },
      showSortFilter: true,
      emoji: "📦",
    },
    receptions: {
      columns: [
        { key: "id", label: { en: "ID", es: "ID" } },
        { key: "order", label: { en: "ORDER", es: "ORDEN" } },
        { key: "customer", label: { en: "CUSTOMER", es: "CLIENTE" } },
        { key: "vehicle", label: { en: "VEHICLE", es: "VEHÍCULO" } },
        { key: "signature", label: { en: "SIGNATURE", es: "FIRMA" } },
      ],
      createLabel: null,
      emptyLabel: { en: "No receptions created yet", es: "Aún no hay ningún Recepción creado" },
      showSortFilter: false,
      emoji: "🚗",
    },
  };

  const cfg = tabConfig[activeTab];

  const renderRow = (item: any) => {
    if (activeTab === "invoices" || activeTab === "estimates") {
      return (
        <>
          <td className="px-4 py-3 font-medium">{item.doc_number || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.order_id ? item.order_id.slice(0, 8) : "—"}</td>
          <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.taxes != null ? `€${item.taxes}` : "—"}</td>
          <td className="px-4 py-3 font-medium">{item.total != null ? `€${item.total}` : "—"}</td>
          <td className="px-4 py-3">
            <Badge variant="outline" className={cn("text-xs capitalize", STATUS_COLORS[item.status] || "")}>{item.status}</Badge>
          </td>
          <td className="px-4 py-3" />
        </>
      );
    }
    if (activeTab === "delivery_notes") {
      return (
        <>
          <td className="px-4 py-3 font-medium">{item.doc_number || "—"}</td>
          <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.taxes != null ? `€${item.taxes}` : "—"}</td>
          <td className="px-4 py-3 font-medium">{item.total != null ? `€${item.total}` : "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.notes || "—"}</td>
        </>
      );
    }
    return (
      <>
        <td className="px-4 py-3 font-medium text-muted-foreground">{item.id.slice(0, 8)}</td>
        <td className="px-4 py-3">{item.order_id ? item.order_id.slice(0, 8) : "—"}</td>
        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">—</td>
        <td className="px-4 py-3 text-muted-foreground">—</td>
      </>
    );
  };

  const drawerLabel = drawerOpen === "invoice"
    ? (isEs ? "Crear Factura" : "Create Invoice")
    : (isEs ? "Crear Presupuesto" : "Create Estimate");

  const savePageSettings = () => {
    if (settingsStorageKey) {
      localStorage.setItem(settingsStorageKey, JSON.stringify(pageSettings));
    }
    setSettingsOpen(false);
  };

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Documentos?"
        titleEn="How to use Documents?"
        storageKey="crm-tips-docs"
        steps={[
          { emoji: "1️⃣", textEs: "Crea facturas con el botón '+ Factura' para registrar cobros.", textEn: "Create invoices with the '+ Invoice' button to register payments." },
          { emoji: "2️⃣", textEs: "Usa 'Presupuestos' para enviar propuestas antes de confirmar un trabajo.", textEn: "Use 'Estimates' to send proposals before confirming a job." },
          { emoji: "3️⃣", textEs: "Los albaranes y recepciones complementan tu flujo de documentos.", textEn: "Delivery notes and receptions complement your document flow." },
          { emoji: "💡", textEs: "Vincula facturas a órdenes y clientes para un seguimiento completo.", textEn: "Link invoices to orders and customers for complete tracking." },
        ]}
        ctaLabelEs="+ Factura"
        ctaLabelEn="+ Invoice"
        onCtaClick={() => setDrawerOpen("invoice")}
      />
      {/* Tabs */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-1">
          {docTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-2">
          <button
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setStatsOpen(true)}
            type="button"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {isEs ? "Ver Estadísticas" : "View Stats"}
          </button>
          <button
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <Settings className="h-3.5 w-3.5" />
            {isEs ? "Ajustes" : "Settings"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isEs ? "Escribe para buscar." : "Type to search."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        {cfg.showSortFilter && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              {isEs ? "Orden" : "Sort"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              {isEs ? "Filtros" : "Filters"}
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {cfg.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {col.label[lang]}
                  </th>
                ))}
                {cfg.createLabel && (
                  <th className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 gap-1"
                      onClick={() => setDrawerOpen(currentDocType as DrawerDocType)}
                    >
                      <Plus className="h-4 w-4" />
                      {cfg.createLabel[lang]}
                    </Button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cfg.columns.length + 1} className="px-4 py-16 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={cfg.columns.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">{cfg.emoji}</div>
                      <p className="text-muted-foreground font-medium">{cfg.emptyLabel[lang]}</p>
                      {cfg.createLabel && (
                        <p className="text-sm text-muted-foreground">
                          {isEs ? "Haz click en " : "Click "}
                          <button
                            onClick={() => setDrawerOpen(currentDocType as DrawerDocType)}
                            className="text-emerald-600 font-semibold hover:underline"
                          >
                            + {cfg.createLabel[lang]}
                          </button>
                          {isEs ? " para crear uno nuevo" : " to create a new one"}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    {renderRow(item)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatsOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Estadísticas de documentos" : "Documents stats"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard label={isEs ? "Total documentos" : "Total documents"} value={docsStats.total} />
              <StatsCard label={isEs ? "Borradores" : "Draft"} value={docsStats.draft} />
              <StatsCard label={isEs ? "Enviados" : "Sent"} value={docsStats.sent} />
              <StatsCard label={isEs ? "Pagados" : "Paid"} value={docsStats.paid} />
              <StatsCard label={isEs ? "Cancelados" : "Cancelled"} value={docsStats.cancelled} />
              <StatsCard label={isEs ? "Importe total" : "Total amount"} value={`€${docsStats.amount.toFixed(2)}`} />
              <StatsCard label={isEs ? "Impuestos" : "Taxes"} value={`€${docsStats.taxes.toFixed(2)}`} />
              <StatsCard label={isEs ? "Tipo actual" : "Current tab"} value={docTabs.find((tab) => tab.key === activeTab)?.label[lang] || "-"} />
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative h-full w-full max-w-md overflow-y-auto border-l bg-background shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Ajustes de documentos" : "Documents settings"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4 p-6">
              <ToggleRow
                label={isEs ? "Numeración automática" : "Automatic numbering"}
                checked={pageSettings.autoNumbering}
                onChange={(checked) => setPageSettings((prev) => ({ ...prev, autoNumbering: checked }))}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Impuesto por defecto (%)" : "Default tax (%)"}</label>
                <input
                  type="number"
                  className="input-field"
                  value={pageSettings.defaultTaxPct}
                  onChange={(event) =>
                    setPageSettings((prev) => ({ ...prev, defaultTaxPct: Number(event.target.value || 0) }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Prefijo facturas" : "Invoice prefix"}</label>
                <input
                  className="input-field"
                  value={pageSettings.invoicePrefix}
                  onChange={(event) => setPageSettings((prev) => ({ ...prev, invoicePrefix: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Prefijo presupuestos" : "Estimate prefix"}</label>
                <input
                  className="input-field"
                  value={pageSettings.estimatePrefix}
                  onChange={(event) => setPageSettings((prev) => ({ ...prev, estimatePrefix: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Nota pie de documento" : "Document footer note"}</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  value={pageSettings.footerNote}
                  onChange={(event) => setPageSettings((prev) => ({ ...prev, footerNote: event.target.value }))}
                />
              </div>
            </div>
            <div className="sticky bottom-0 border-t bg-background p-6">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" onClick={savePageSettings}>
                {isEs ? "Guardar cambios" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(null)} />
          <div className="relative w-full max-w-md bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{drawerLabel}</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Número de documento" : "Document number"}</label>
                <input type="text" value={form.doc_number} onChange={(e) => setForm({ ...form, doc_number: e.target.value })} className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Cliente" : "Customer"}</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="input-field">
                  <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Orden asociada" : "Associated order"}</label>
                <select value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} className="input-field">
                  <option value="">{isEs ? "Ninguna" : "None"}</option>
                  {orders.map((o) => <option key={o.id} value={o.id}>{o.service_name} ({o.id.slice(0, 8)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Total (€)</label>
                  <input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{isEs ? "Impuestos (€)" : "Taxes (€)"}</label>
                  <input type="number" step="0.01" value={form.taxes} onChange={(e) => setForm({ ...form, taxes: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Notas" : "Notes"}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="input-field resize-none" />
              </div>
            </div>
            <div className="border-t px-6 py-4">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving}
                onClick={handleCreate}
              >
                {saving ? (isEs ? "Creando..." : "Creating...") : (isEs ? "Crear" : "Create")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-muted"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
