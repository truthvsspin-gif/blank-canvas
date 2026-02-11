import { useState, useEffect } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, X, BarChart3, Phone, Mail, MapPin, User } from "lucide-react";

type StockTab = "inventory" | "purchases" | "fixed" | "sales" | "consumption" | "suppliers";

const tabs: { key: StockTab; label: { en: string; es: string } }[] = [
  { key: "inventory", label: { en: "Inventory", es: "Inventario" } },
  { key: "purchases", label: { en: "Purchases", es: "Compras" } },
  { key: "fixed", label: { en: "Fixed Costs", es: "Gastos fijos" } },
  { key: "sales", label: { en: "Sales", es: "Ventas" } },
  { key: "consumption", label: { en: "Material Use", es: "Consumo material" } },
  { key: "suppliers", label: { en: "Suppliers", es: "Proveedores" } },
];

type DrawerType = "stock" | "purchase" | "fixed_cost" | "supplier" | null;

export default function Stock() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<StockTab>("inventory");
  const [drawer, setDrawer] = useState<DrawerType>(null);

  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [stockForm, setStockForm] = useState({ name: "", description: "", reference: "", available_qty: 0, min_qty: 0, unit: "units", expiry_date: "", supplier: "" });
  const [purchaseForm, setPurchaseForm] = useState({ item_name: "", supplier_id: "", purchase_date: "", price: 0, qty: 0, tax_pct: 0, total: 0 });
  const [fixedForm, setFixedForm] = useState({ name: "", start_date: "", end_date: "", recurrence: "monthly", total: 0, tax_pct: 0, description: "", beneficiary: "" });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });

  const fetchData = async () => {
    if (!businessId) return;
    setLoading(true);
    const [stockRes, purchaseRes, fixedRes, supplierRes] = await Promise.all([
      supabase.from("stock_items").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("stock_purchases").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("stock_fixed_costs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);
    setItems(stockRes.data || []);
    setPurchases(purchaseRes.data || []);
    setFixedCosts(fixedRes.data || []);
    setSuppliers(supplierRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [businessId]);

  const handleCreateStock = async () => {
    if (!businessId || !stockForm.name.trim()) return;
    await supabase.from("stock_items").insert({
      business_id: businessId, name: stockForm.name.trim(), description: stockForm.description || null,
      reference: stockForm.reference || null, available_qty: stockForm.available_qty, min_qty: stockForm.min_qty,
      unit: stockForm.unit, expiry_date: stockForm.expiry_date || null, supplier: stockForm.supplier || null,
    });
    setStockForm({ name: "", description: "", reference: "", available_qty: 0, min_qty: 0, unit: "units", expiry_date: "", supplier: "" });
    setDrawer(null); fetchData();
  };

  const handleCreatePurchase = async () => {
    if (!businessId || !purchaseForm.item_name.trim()) return;
    await supabase.from("stock_purchases").insert({
      business_id: businessId, item_name: purchaseForm.item_name.trim(),
      supplier_id: purchaseForm.supplier_id || null, purchase_date: purchaseForm.purchase_date || null,
      price: purchaseForm.price, qty: purchaseForm.qty, tax_pct: purchaseForm.tax_pct, total: purchaseForm.total,
    });
    setPurchaseForm({ item_name: "", supplier_id: "", purchase_date: "", price: 0, qty: 0, tax_pct: 0, total: 0 });
    setDrawer(null); fetchData();
  };

  const handleCreateFixed = async () => {
    if (!businessId || !fixedForm.name.trim()) return;
    await supabase.from("stock_fixed_costs").insert({
      business_id: businessId, name: fixedForm.name.trim(),
      start_date: fixedForm.start_date || null, end_date: fixedForm.end_date || null,
      recurrence: fixedForm.recurrence, total: fixedForm.total, tax_pct: fixedForm.tax_pct,
      description: fixedForm.description || null, beneficiary: fixedForm.beneficiary || null,
    });
    setFixedForm({ name: "", start_date: "", end_date: "", recurrence: "monthly", total: 0, tax_pct: 0, description: "", beneficiary: "" });
    setDrawer(null); fetchData();
  };

  const handleCreateSupplier = async () => {
    if (!businessId || !supplierForm.name.trim()) return;
    await supabase.from("suppliers").insert({
      business_id: businessId, name: supplierForm.name.trim(),
      phone: supplierForm.phone || null, email: supplierForm.email || null, address: supplierForm.address || null,
    });
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setDrawer(null); fetchData();
  };

  // Tab configs
  const tabConfigs: Record<StockTab, { columns: { key: string; label: string }[]; createBtn: { label: string; drawerType: DrawerType } | null; data: any[]; emptyLabel: string; renderRow: (item: any) => React.ReactNode }> = {
    inventory: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "description", label: isEs ? "DESCRIPCIÓN" : "DESCRIPTION" },
        { key: "reference", label: "REF." },
        { key: "available_qty", label: isEs ? "DISPONIBLE" : "AVAILABLE" },
        { key: "min_qty", label: "MIN" },
        { key: "expiry_date", label: isEs ? "CADUCIDAD" : "EXPIRY" },
        { key: "supplier", label: isEs ? "PROVEEDOR" : "SUPPLIER" },
      ],
      createBtn: { label: "Stock", drawerType: "stock" },
      data: items,
      emptyLabel: isEs ? "Stock" : "Stock",
      renderRow: (item) => (
        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3 font-medium">{item.name}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.description || "—"}</td>
          <td className="px-4 py-3">{item.reference || "—"}</td>
          <td className="px-4 py-3"><span className={cn("font-medium", item.available_qty <= item.min_qty ? "text-red-600" : "text-foreground")}>{item.available_qty}</span></td>
          <td className="px-4 py-3 text-muted-foreground">{item.min_qty}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.supplier || "—"}</td>
          <td className="px-4 py-3" />
        </tr>
      ),
    },
    purchases: {
      columns: [
        { key: "item", label: "ITEM" },
        { key: "supplier", label: isEs ? "PROVEEDOR" : "SUPPLIER" },
        { key: "date", label: isEs ? "FECHA" : "DATE" },
        { key: "price", label: isEs ? "PRECIO" : "PRICE" },
        { key: "qty", label: "UDS" },
        { key: "tax", label: "IVA" },
        { key: "total", label: "TOTAL" },
      ],
      createBtn: { label: isEs ? "Compras" : "Purchase", drawerType: "purchase" },
      data: purchases,
      emptyLabel: isEs ? "Compras" : "Purchases",
      renderRow: (item) => {
        const sup = suppliers.find(s => s.id === item.supplier_id);
        return (
          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3 font-medium">{item.item_name}</td>
            <td className="px-4 py-3 text-muted-foreground">{sup?.name || "—"}</td>
            <td className="px-4 py-3 text-muted-foreground">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : "—"}</td>
            <td className="px-4 py-3">{item.price}€</td>
            <td className="px-4 py-3">{item.qty}</td>
            <td className="px-4 py-3 text-muted-foreground">{item.tax_pct}%</td>
            <td className="px-4 py-3 font-medium">{item.total}€</td>
            <td className="px-4 py-3" />
          </tr>
        );
      },
    },
    fixed: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "start", label: isEs ? "INICIO" : "START" },
        { key: "end", label: "FIN" },
        { key: "recurrence", label: isEs ? "RECURRENCIA" : "RECURRENCE" },
        { key: "total", label: "TOTAL" },
        { key: "tax", label: "IVA" },
        { key: "description", label: isEs ? "DESCRIPCIÓN" : "DESCRIPTION" },
        { key: "beneficiary", label: isEs ? "BENEFICIARIO" : "BENEFICIARY" },
      ],
      createBtn: { label: isEs ? "Gasto" : "Expense", drawerType: "fixed_cost" },
      data: fixedCosts,
      emptyLabel: isEs ? "Gasto" : "Expense",
      renderRow: (item) => (
        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3 font-medium">{item.name}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.start_date ? new Date(item.start_date).toLocaleDateString() : "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.end_date ? new Date(item.end_date).toLocaleDateString() : "—"}</td>
          <td className="px-4 py-3">{item.recurrence}</td>
          <td className="px-4 py-3 font-medium">{item.total}€</td>
          <td className="px-4 py-3 text-muted-foreground">{item.tax_pct}%</td>
          <td className="px-4 py-3 text-muted-foreground">{item.description || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.beneficiary || "—"}</td>
          <td className="px-4 py-3" />
        </tr>
      ),
    },
    sales: {
      columns: [
        { key: "item", label: "ITEM" },
        { key: "customer", label: isEs ? "CLIENTE" : "CUSTOMER" },
        { key: "invoice", label: isEs ? "FACTURA" : "INVOICE" },
        { key: "date", label: isEs ? "FECHA" : "DATE" },
        { key: "qty", label: isEs ? "CANTIDAD" : "QTY" },
        { key: "price", label: isEs ? "PRECIO" : "PRICE" },
        { key: "tax", label: "IVA" },
        { key: "total", label: "TOTAL" },
      ],
      createBtn: null,
      data: [],
      emptyLabel: isEs ? "Ventas" : "Sales",
      renderRow: () => null,
    },
    consumption: {
      columns: [
        { key: "part", label: isEs ? "RECAMBIO" : "PART" },
        { key: "qty", label: isEs ? "CANTIDAD" : "QTY" },
        { key: "order", label: isEs ? "ORDEN" : "ORDER" },
        { key: "date", label: isEs ? "FECHA" : "DATE" },
      ],
      createBtn: null,
      data: [],
      emptyLabel: isEs ? "Ventas" : "Sales",
      renderRow: () => null,
    },
    suppliers: {
      columns: [
        { key: "name", label: isEs ? "NOMBRE" : "NAME" },
        { key: "address", label: isEs ? "DIRECCIÓN" : "ADDRESS" },
        { key: "phone", label: isEs ? "TELÉFONO" : "PHONE" },
        { key: "email", label: "EMAIL" },
        { key: "spent", label: isEs ? "GASTO" : "SPENT" },
      ],
      createBtn: { label: isEs ? "Proveedor" : "Supplier", drawerType: "supplier" },
      data: suppliers,
      emptyLabel: isEs ? "Proveedor" : "Supplier",
      renderRow: (item) => (
        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3 font-medium">{item.name}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.address || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.phone || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.email || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">0€</td>
          <td className="px-4 py-3" />
        </tr>
      ),
    },
  };

  const config = tabConfigs[activeTab];

  const renderDrawerContent = () => {
    if (drawer === "stock") return <StockDrawerFields form={stockForm} setForm={setStockForm} isEs={isEs} />;
    if (drawer === "purchase") return <PurchaseDrawerFields form={purchaseForm} setForm={setPurchaseForm} isEs={isEs} suppliers={suppliers} />;
    if (drawer === "fixed_cost") return <FixedCostDrawerFields form={fixedForm} setForm={setFixedForm} isEs={isEs} />;
    if (drawer === "supplier") return <SupplierDrawerFields form={supplierForm} setForm={setSupplierForm} isEs={isEs} />;
    return null;
  };

  const handleSave = () => {
    if (drawer === "stock") handleCreateStock();
    else if (drawer === "purchase") handleCreatePurchase();
    else if (drawer === "fixed_cost") handleCreateFixed();
    else if (drawer === "supplier") handleCreateSupplier();
  };

  const drawerTitle = drawer === "stock" ? (isEs ? "Crear Stock" : "Create Stock")
    : drawer === "purchase" ? (isEs ? "Crear Compra" : "Create Purchase")
    : drawer === "fixed_cost" ? (isEs ? "Crear Gasto" : "Create Expense")
    : drawer === "supplier" ? (isEs ? "Crear Proveedor" : "Create Supplier") : "";

  const canSave = drawer === "stock" ? stockForm.name.trim() !== ""
    : drawer === "purchase" ? purchaseForm.item_name.trim() !== ""
    : drawer === "fixed_cost" ? fixedForm.name.trim() !== ""
    : drawer === "supplier" ? supplierForm.name.trim() !== "" : false;

  return (
    <div className="space-y-6">
      {/* Tabs + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn("px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BarChart3 className="h-4 w-4" />
          {isEs ? "Ver Estadísticas" : "View Stats"}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {config.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right">
                  {config.createBtn && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => setDrawer(config.createBtn!.drawerType)}>
                      <Plus className="h-3.5 w-3.5" />
                      {config.createBtn.label}
                    </Button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={config.columns.length + 1} className="px-4 py-20 text-center text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</td></tr>
              ) : config.data.length === 0 ? (
                <tr><td colSpan={config.columns.length + 1} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-muted-foreground">{isEs ? `Aún no hay ningún ${config.emptyLabel} creado` : `No ${config.emptyLabel} yet`}</p>
                    {config.createBtn && (
                      <p className="text-sm text-muted-foreground/70">
                        {isEs ? "Haz click en " : "Click "}
                        <button onClick={() => setDrawer(config.createBtn!.drawerType)} className="text-emerald-600 font-semibold hover:underline">+ {config.createBtn.label}</button>
                        {isEs ? " para crear uno nuevo" : " to create one"}
                      </p>
                    )}
                  </div>
                </td></tr>
              ) : config.data.map(config.renderRow)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative w-full max-w-md bg-background shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{drawerTitle}</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawer(null)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-6 space-y-5">{renderDrawerContent()}</div>
            <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDrawer(null)}>{isEs ? "Cancelar" : "Cancel"}</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={!canSave}>{isEs ? "Guardar" : "Save"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Drawer field components ---

function FieldInput({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium">{label} {required && <span className="text-red-500">*</span>}</label>
      <input className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" {...props} />
    </div>
  );
}

function StockDrawerFields({ form, setForm, isEs }: any) {
  return <>
    <FieldInput label={isEs ? "Nombre" : "Name"} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
    <FieldInput label={isEs ? "Descripción" : "Description"} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
    <FieldInput label={isEs ? "Referencia" : "Reference"} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
    <FieldInput label={isEs ? "Cantidad disponible" : "Available qty"} type="number" value={form.available_qty} onChange={e => setForm({ ...form, available_qty: Number(e.target.value) })} />
    <FieldInput label={isEs ? "Cantidad mínima" : "Minimum qty"} type="number" value={form.min_qty} onChange={e => setForm({ ...form, min_qty: Number(e.target.value) })} />
    <div>
      <label className="text-sm font-medium">{isEs ? "Unidad de medida" : "Unit"}</label>
      <select className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
        <option value="units">{isEs ? "Unidades" : "Units"}</option>
        <option value="liters">{isEs ? "Litros" : "Liters"}</option>
        <option value="kg">Kg</option>
        <option value="meters">{isEs ? "Metros" : "Meters"}</option>
      </select>
    </div>
    <FieldInput label={isEs ? "Caducidad" : "Expiry"} type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
    <FieldInput label={isEs ? "Proveedor" : "Supplier"} placeholder={isEs ? "Escribe para buscar" : "Search..."} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
  </>;
}

function PurchaseDrawerFields({ form, setForm, isEs, suppliers }: any) {
  return <>
    <FieldInput label="Item" required value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
    <div>
      <label className="text-sm font-medium">{isEs ? "Proveedor" : "Supplier"}</label>
      <select className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
        <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
        {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
    <FieldInput label={isEs ? "Fecha" : "Date"} type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
    <FieldInput label={isEs ? "Precio" : "Price"} type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
    <FieldInput label="UDS" type="number" value={form.qty} onChange={e => setForm({ ...form, qty: Number(e.target.value) })} />
    <FieldInput label="IVA (%)" type="number" value={form.tax_pct} onChange={e => setForm({ ...form, tax_pct: Number(e.target.value) })} />
    <FieldInput label="Total" type="number" value={form.total} onChange={e => setForm({ ...form, total: Number(e.target.value) })} />
  </>;
}

function FixedCostDrawerFields({ form, setForm, isEs }: any) {
  return <>
    <FieldInput label={isEs ? "Nombre" : "Name"} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
    <FieldInput label={isEs ? "Inicio" : "Start"} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
    <FieldInput label="Fin" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
    <div>
      <label className="text-sm font-medium">{isEs ? "Recurrencia" : "Recurrence"}</label>
      <select className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })}>
        <option value="monthly">{isEs ? "Mensual" : "Monthly"}</option>
        <option value="quarterly">{isEs ? "Trimestral" : "Quarterly"}</option>
        <option value="yearly">{isEs ? "Anual" : "Yearly"}</option>
      </select>
    </div>
    <FieldInput label="Total" type="number" value={form.total} onChange={e => setForm({ ...form, total: Number(e.target.value) })} />
    <FieldInput label="IVA (%)" type="number" value={form.tax_pct} onChange={e => setForm({ ...form, tax_pct: Number(e.target.value) })} />
    <FieldInput label={isEs ? "Descripción" : "Description"} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
    <FieldInput label={isEs ? "Beneficiario" : "Beneficiary"} value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} />
  </>;
}

function SupplierDrawerFields({ form, setForm, isEs }: any) {
  return <>
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <label className="text-sm font-medium">{isEs ? "Nombre" : "Name"} <span className="text-red-500">*</span></label>
    </div>
    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

    <div className="flex items-center gap-2 mt-4">
      <Phone className="h-4 w-4 text-muted-foreground" />
      <label className="text-sm font-medium">{isEs ? "Teléfono" : "Phone"}</label>
    </div>
    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" placeholder="+34" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />

    <div className="flex items-center gap-2 mt-4">
      <Mail className="h-4 w-4 text-muted-foreground" />
      <label className="text-sm font-medium">Email</label>
    </div>
    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

    <div className="flex items-center gap-2 mt-4">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <label className="text-sm font-medium">{isEs ? "Dirección" : "Address"}</label>
    </div>
    <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
  </>;
}
