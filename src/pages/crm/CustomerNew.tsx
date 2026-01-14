import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function CustomerNew() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Nuevo cliente" : "New Customer"}
        description={isEs ? "Crear un nuevo cliente" : "Create a new customer"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Formulario de cliente en construccion..." : "Customer form coming soon..."}
        </p>
      </div>
    </div>
  );
}
