import { Link } from "react-router-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Customers() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Clientes" : "Customers"}
        description={isEs ? "Gestiona tu base de clientes" : "Manage your customer base"}
        actions={
          <Button asChild className="bg-rose-600 hover:bg-rose-500">
            <Link to="/crm/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              {isEs ? "Nuevo cliente" : "New customer"}
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Lista de clientes en construccion..." : "Customer list coming soon..."}
        </p>
      </div>
    </div>
  );
}
