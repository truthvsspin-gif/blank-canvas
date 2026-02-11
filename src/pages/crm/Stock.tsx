import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, X, BarChart3 } from "lucide-react";

type StockTab = "inventory" | "purchases" | "fixed" | "sales" | "consumption" | "suppliers";
type DrawerType = "stock" | "purchase" | "fixed_cost" | "supplier" | null;

const tabs: { key: StockTab; label: { en: string; es: string } }[] = [
  { key: "inventory", label: { en: "Inventory", es: "Inventario" } },
  { key: "purchases", label: { en: "Purchases", es: "Compras" } },
  { key: "fixed", label: { en: "Fixed Costs", es: "Gastos fijos" } },
  { key: "sales", label: { en: "Sales", es: "Ventas" } },
  { key: "consumption", label: { en: "Material Use", es: "Consumo material" } },
  { key: "suppliers", label: { en: "Suppliers", es: "Proveedores" } },
];

function euro(v: number) {
  return `${v.toFixed(2)}€`;
}

export default function Stock() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<StockTab>("inventory");
  const [drawer, setDrawer] = useState<DrawerType>(null);

  const [items, setItems] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [stockForm, setStockForm] = useState({
    name: "",
    description: "",
    reference: "",
    available_qty: 0,
    min_qty: 0,
    unit: "units",
    expiry_date: "",
    supplier: "",
  });
  const [purchaseForm, setPurchaseForm] = useState({
    item_name: "",
    supplier_id: "",
    purchase_date: "",
    price: 0,
    qty: 0,
    tax_pct: 0,
    total: 0,
  });
  const [fixedForm, setFixedForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    recurrence: "monthly",
    total: 0,
    tax_pct: 0,
    description: "",
    beneficiary: "",
  });
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", email: "", address: "" });

  const fetchData = async () => {
    if (!businessId) return;
    setLoading(true);
    const [stockRes, purchaseRes, fixedRes, supplierRes, documentRes, orderRes, customerRes] = await Promise.all([
      supabase.from("stock_items").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("stock_purchases").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("stock_fixed_costs").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("business_id", businessId).eq("doc_type", "invoice").order("created_at", { ascending: false }),
      supabase.from("work_orders").select("id, service_name, completed_at, scheduled_at").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("customers").select("id, full_name").eq("business_id", businessId),
    ]);
    setItems(stockRes.data || []);
    setPurchases(purchaseRes.data || []);
    setFixedCosts(fixedRes.data || []);
    setSuppliers(supplierRes.data || []);
    setDocuments(documentRes.data || []);
    setWorkOrders(orderRes.data || []);
    setCustomers(customerRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const customerMap = useMemo(() => new Map(customers.map((row) => [row.id, row.full_name])), [customers]);
  const orderMap = useMemo(() => new Map(workOrders.map((row) => [row.id, row])), [workOrders]);
  const supplierSpend = useMemo(() => {
    const map = new Map<string, number>();
    purchases.forEach((row) => {
      if (!row.supplier_id) return;
      map.set(row.supplier_id, (map.get(row.supplier_id) || 0) + Number(row.total || 0));
    });
    return map;
  }, [purchases]);

  const salesRows = useMemo(
    () =>
      documents.map((doc) => {
        const linked = doc.order_id ? orderMap.get(doc.order_id) : null;
        return {
          id: doc.id,
          item: linked?.service_name || (isEs ? "Servicio" : "Service"),
          customer: doc.customer_id ? customerMap.get(doc.customer_id) || "—" : "—",
          invoice: doc.doc_number || doc.id.slice(0, 8),
          date: doc.created_at,
          qty: 1,
          price: Number(doc.total || 0) - Number(doc.taxes || 0),
          tax: Number(doc.taxes || 0),
          total: Number(doc.total || 0),
        };
      }),
    [documents, orderMap, customerMap, isEs]
  );

  const consumptionRows = useMemo(
    () =>
      workOrders.map((order) => ({
        id: order.id,
        part: order.service_name || (isEs ? "Servicio" : "Service"),
        qty: 1,
        order: order.id.slice(0, 8),
        date: order.completed_at || order.scheduled_at || null,
      })),
    [workOrders, isEs]
  );

  const createStock = async () => {
    if (!businessId || !stockForm.name.trim()) return;
    await supabase.from("stock_items").insert({
      business_id: businessId,
      name: stockForm.name.trim(),
      description: stockForm.description || null,
      reference: stockForm.reference || null,
      available_qty: stockForm.available_qty,
      min_qty: stockForm.min_qty,
      unit: stockForm.unit,
      expiry_date: stockForm.expiry_date || null,
      supplier: stockForm.supplier || null,
    });
    setStockForm({ name: "", description: "", reference: "", available_qty: 0, min_qty: 0, unit: "units", expiry_date: "", supplier: "" });
    setDrawer(null);
    fetchData();
  };

  const createPurchase = async () => {
    if (!businessId || !purchaseForm.item_name.trim()) return;
    await supabase.from("stock_purchases").insert({
      business_id: businessId,
      item_name: purchaseForm.item_name.trim(),
      supplier_id: purchaseForm.supplier_id || null,
      purchase_date: purchaseForm.purchase_date || null,
      price: purchaseForm.price,
      qty: purchaseForm.qty,
      tax_pct: purchaseForm.tax_pct,
      total: purchaseForm.total,
    });
    setPurchaseForm({ item_name: "", supplier_id: "", purchase_date: "", price: 0, qty: 0, tax_pct: 0, total: 0 });
    setDrawer(null);
    fetchData();
  };

  const createFixed = async () => {
    if (!businessId || !fixedForm.name.trim()) return;
    await supabase.from("stock_fixed_costs").insert({
      business_id: businessId,
      name: fixedForm.name.trim(),
      start_date: fixedForm.start_date || null,
      end_date: fixedForm.end_date || null,
      recurrence: fixedForm.recurrence,
      total: fixedForm.total,
      tax_pct: fixedForm.tax_pct,
      description: fixedForm.description || null,
      beneficiary: fixedForm.beneficiary || null,
    });
    setFixedForm({ name: "", start_date: "", end_date: "", recurrence: "monthly", total: 0, tax_pct: 0, description: "", beneficiary: "" });
    setDrawer(null);
    fetchData();
  };

  const createSupplier = async () => {
    if (!businessId || !supplierForm.name.trim()) return;
    await supabase.from("suppliers").insert({
      business_id: businessId,
      name: supplierForm.name.trim(),
      phone: supplierForm.phone || null,
      email: supplierForm.email || null,
      address: supplierForm.address || null,
    });
    setSupplierForm({ name: "", phone: "", email: "", address: "" });
    setDrawer(null);
    fetchData();
  };

  const canSave =
    drawer === "stock"
      ? stockForm.name.trim() !== ""
      : drawer === "purchase"
        ? purchaseForm.item_name.trim() !== ""
        : drawer === "fixed_cost"
          ? fixedForm.name.trim() !== ""
          : drawer === "supplier"
            ? supplierForm.name.trim() !== ""
            : false;

  const saveDrawer = () => {
    if (drawer === "stock") createStock();
    else if (drawer === "purchase") createPurchase();
    else if (drawer === "fixed_cost") createFixed();
    else if (drawer === "supplier") createSupplier();
  };

  const drawerTitle =
    drawer === "stock"
      ? isEs
        ? "Crear stock"
        : "Create stock"
      : drawer === "purchase"
        ? isEs
          ? "Crear compra"
          : "Create purchase"
        : drawer === "fixed_cost"
          ? isEs
            ? "Crear gasto"
            : "Create expense"
          : drawer === "supplier"
            ? isEs
              ? "Crear proveedor"
              : "Create supplier"
            : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                activeTab === tab.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <BarChart3 className="h-4 w-4" />
          {isEs ? "Ver estadisticas" : "View stats"}
        </button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === "inventory" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay stock creado" : "No stock yet"}
              createLabel="Stock"
              onCreate={() => setDrawer("stock")}
              rows={items}
              headers={[isEs ? "Nombre" : "Name", isEs ? "Descripcion" : "Description", "Ref.", isEs ? "Disponible" : "Available", "Min", isEs ? "Caducidad" : "Expiry", isEs ? "Proveedor" : "Supplier"]}
              renderRow={(row) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
                  <td className="px-4 py-3">{row.reference || "—"}</td>
                  <td className="px-4 py-3"><span className={cn("font-medium", Number(row.available_qty) <= Number(row.min_qty) ? "text-red-600" : "text-foreground")}>{row.available_qty}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{row.min_qty}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.supplier || "—"}</td>
                </>
              )}
            />
          )}

          {activeTab === "purchases" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay compras" : "No purchases yet"}
              createLabel={isEs ? "Compra" : "Purchase"}
              onCreate={() => setDrawer("purchase")}
              rows={purchases}
              headers={["Item", isEs ? "Proveedor" : "Supplier", isEs ? "Fecha" : "Date", isEs ? "Precio" : "Price", "Qty", "IVA", "Total"]}
              renderRow={(row) => {
                const supplierName = suppliers.find((s) => s.id === row.supplier_id)?.name || "—";
                return (
                  <>
                    <td className="px-4 py-3 font-medium">{row.item_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.purchase_date ? new Date(row.purchase_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">{euro(Number(row.price || 0))}</td>
                    <td className="px-4 py-3">{row.qty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{Number(row.tax_pct || 0)}%</td>
                    <td className="px-4 py-3 font-medium">{euro(Number(row.total || 0))}</td>
                  </>
                );
              }}
            />
          )}

          {activeTab === "fixed" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay gastos fijos" : "No fixed costs yet"}
              createLabel={isEs ? "Gasto" : "Expense"}
              onCreate={() => setDrawer("fixed_cost")}
              rows={fixedCosts}
              headers={[isEs ? "Nombre" : "Name", isEs ? "Inicio" : "Start", isEs ? "Fin" : "End", isEs ? "Recurrencia" : "Recurrence", "Total", "IVA", isEs ? "Descripcion" : "Description", isEs ? "Beneficiario" : "Beneficiary"]}
              renderRow={(row) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.start_date ? new Date(row.start_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.end_date ? new Date(row.end_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{row.recurrence || "—"}</td>
                  <td className="px-4 py-3 font-medium">{euro(Number(row.total || 0))}</td>
                  <td className="px-4 py-3 text-muted-foreground">{Number(row.tax_pct || 0)}%</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.description || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.beneficiary || "—"}</td>
                </>
              )}
            />
          )}

          {activeTab === "sales" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay ventas" : "No sales yet"}
              rows={salesRows}
              headers={["Item", isEs ? "Cliente" : "Customer", isEs ? "Factura" : "Invoice", isEs ? "Fecha" : "Date", "Qty", isEs ? "Precio" : "Price", "IVA", "Total"]}
              renderRow={(row) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.item}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.invoice}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">{row.qty}</td>
                  <td className="px-4 py-3">{euro(row.price)}</td>
                  <td className="px-4 py-3">{euro(row.tax)}</td>
                  <td className="px-4 py-3 font-medium">{euro(row.total)}</td>
                </>
              )}
            />
          )}

          {activeTab === "consumption" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay consumo registrado" : "No consumption yet"}
              rows={consumptionRows}
              headers={[isEs ? "Recambio" : "Part", "Qty", isEs ? "Orden" : "Order", isEs ? "Fecha" : "Date"]}
              renderRow={(row) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.part}</td>
                  <td className="px-4 py-3">{row.qty}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.order}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.date ? new Date(row.date).toLocaleDateString() : "—"}</td>
                </>
              )}
            />
          )}

          {activeTab === "suppliers" && (
            <Table
              loading={loading}
              empty={isEs ? "Aun no hay proveedores" : "No suppliers yet"}
              createLabel={isEs ? "Proveedor" : "Supplier"}
              onCreate={() => setDrawer("supplier")}
              rows={suppliers}
              headers={[isEs ? "Nombre" : "Name", isEs ? "Direccion" : "Address", isEs ? "Telefono" : "Phone", "Email", isEs ? "Gasto" : "Spent"]}
              renderRow={(row) => (
                <>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.address || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{euro(supplierSpend.get(row.id) || 0)}</td>
                </>
              )}
            />
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(null)} />
          <div className="relative w-full max-w-md bg-background shadow-2xl border-l animate-in slide-in-from-right overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{drawerTitle}</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawer(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6 space-y-5">
              {drawer === "stock" && (
                <>
                  <Input label={isEs ? "Nombre" : "Name"} required value={stockForm.name} onChange={(v) => setStockForm((p) => ({ ...p, name: v }))} />
                  <Input label={isEs ? "Descripcion" : "Description"} value={stockForm.description} onChange={(v) => setStockForm((p) => ({ ...p, description: v }))} />
                  <Input label={isEs ? "Referencia" : "Reference"} value={stockForm.reference} onChange={(v) => setStockForm((p) => ({ ...p, reference: v }))} />
                  <Input type="number" label={isEs ? "Disponible" : "Available"} value={String(stockForm.available_qty)} onChange={(v) => setStockForm((p) => ({ ...p, available_qty: Number(v || 0) }))} />
                  <Input type="number" label="Min" value={String(stockForm.min_qty)} onChange={(v) => setStockForm((p) => ({ ...p, min_qty: Number(v || 0) }))} />
                  <Input type="date" label={isEs ? "Caducidad" : "Expiry"} value={stockForm.expiry_date} onChange={(v) => setStockForm((p) => ({ ...p, expiry_date: v }))} />
                  <Input label={isEs ? "Proveedor" : "Supplier"} value={stockForm.supplier} onChange={(v) => setStockForm((p) => ({ ...p, supplier: v }))} />
                </>
              )}

              {drawer === "purchase" && (
                <>
                  <Input label="Item" required value={purchaseForm.item_name} onChange={(v) => setPurchaseForm((p) => ({ ...p, item_name: v }))} />
                  <div>
                    <label className="text-sm font-medium">{isEs ? "Proveedor" : "Supplier"}</label>
                    <select
                      className="input mt-1.5"
                      value={purchaseForm.supplier_id}
                      onChange={(event) => setPurchaseForm((p) => ({ ...p, supplier_id: event.target.value }))}
                    >
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input type="date" label={isEs ? "Fecha" : "Date"} value={purchaseForm.purchase_date} onChange={(v) => setPurchaseForm((p) => ({ ...p, purchase_date: v }))} />
                  <Input type="number" label={isEs ? "Precio" : "Price"} value={String(purchaseForm.price)} onChange={(v) => setPurchaseForm((p) => ({ ...p, price: Number(v || 0) }))} />
                  <Input type="number" label="Qty" value={String(purchaseForm.qty)} onChange={(v) => setPurchaseForm((p) => ({ ...p, qty: Number(v || 0) }))} />
                  <Input type="number" label="IVA (%)" value={String(purchaseForm.tax_pct)} onChange={(v) => setPurchaseForm((p) => ({ ...p, tax_pct: Number(v || 0) }))} />
                  <Input type="number" label="Total" value={String(purchaseForm.total)} onChange={(v) => setPurchaseForm((p) => ({ ...p, total: Number(v || 0) }))} />
                </>
              )}

              {drawer === "fixed_cost" && (
                <>
                  <Input label={isEs ? "Nombre" : "Name"} required value={fixedForm.name} onChange={(v) => setFixedForm((p) => ({ ...p, name: v }))} />
                  <Input type="date" label={isEs ? "Inicio" : "Start"} value={fixedForm.start_date} onChange={(v) => setFixedForm((p) => ({ ...p, start_date: v }))} />
                  <Input type="date" label={isEs ? "Fin" : "End"} value={fixedForm.end_date} onChange={(v) => setFixedForm((p) => ({ ...p, end_date: v }))} />
                  <div>
                    <label className="text-sm font-medium">{isEs ? "Recurrencia" : "Recurrence"}</label>
                    <select className="input mt-1.5" value={fixedForm.recurrence} onChange={(event) => setFixedForm((p) => ({ ...p, recurrence: event.target.value }))}>
                      <option value="monthly">{isEs ? "Mensual" : "Monthly"}</option>
                      <option value="quarterly">{isEs ? "Trimestral" : "Quarterly"}</option>
                      <option value="yearly">{isEs ? "Anual" : "Yearly"}</option>
                    </select>
                  </div>
                  <Input type="number" label="Total" value={String(fixedForm.total)} onChange={(v) => setFixedForm((p) => ({ ...p, total: Number(v || 0) }))} />
                  <Input type="number" label="IVA (%)" value={String(fixedForm.tax_pct)} onChange={(v) => setFixedForm((p) => ({ ...p, tax_pct: Number(v || 0) }))} />
                  <Input label={isEs ? "Descripcion" : "Description"} value={fixedForm.description} onChange={(v) => setFixedForm((p) => ({ ...p, description: v }))} />
                  <Input label={isEs ? "Beneficiario" : "Beneficiary"} value={fixedForm.beneficiary} onChange={(v) => setFixedForm((p) => ({ ...p, beneficiary: v }))} />
                </>
              )}

              {drawer === "supplier" && (
                <>
                  <Input label={isEs ? "Nombre" : "Name"} required value={supplierForm.name} onChange={(v) => setSupplierForm((p) => ({ ...p, name: v }))} />
                  <Input label={isEs ? "Telefono" : "Phone"} value={supplierForm.phone} onChange={(v) => setSupplierForm((p) => ({ ...p, phone: v }))} />
                  <Input label="Email" value={supplierForm.email} onChange={(v) => setSupplierForm((p) => ({ ...p, email: v }))} />
                  <Input label={isEs ? "Direccion" : "Address"} value={supplierForm.address} onChange={(v) => setSupplierForm((p) => ({ ...p, address: v }))} />
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDrawer(null)}>
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveDrawer} disabled={!canSave}>
                {isEs ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          box-shadow: 0 0 0 2px hsl(142.1 76.2% 36.3% / 0.3);
        }
      `}</style>
    </div>
  );
}

function Table({
  loading,
  empty,
  createLabel,
  onCreate,
  headers,
  rows,
  renderRow,
}: {
  loading: boolean;
  empty: string;
  createLabel?: string;
  onCreate?: () => void;
  headers: string[];
  rows: any[];
  renderRow: (row: any) => ReactNode;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-muted/50">
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
              {header}
            </th>
          ))}
          <th className="px-4 py-3 text-right">
            {createLabel && onCreate && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onCreate}>
                <Plus className="h-3.5 w-3.5" />
                {createLabel}
              </Button>
            )}
          </th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={headers.length + 1} className="px-4 py-20 text-center text-muted-foreground">
              Loading...
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length + 1} className="px-4 py-20 text-center text-muted-foreground">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map((row) => <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">{renderRow(row)}<td className="px-4 py-3" /></tr>)
        )}
      </tbody>
    </table>
  );
}

function Input({
  label,
  required,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input className="input mt-1.5" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
