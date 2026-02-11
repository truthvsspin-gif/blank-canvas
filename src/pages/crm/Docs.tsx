import { FileText } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

export default function Docs() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEs ? "Documentos" : "Documents"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEs
            ? "Gestiona facturas, presupuestos y documentos del taller."
            : "Manage invoices, estimates and shop documents."}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">
          {isEs ? "Próximamente" : "Coming soon"}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {isEs
            ? "La gestión de documentos estará disponible pronto."
            : "Document management will be available soon."}
        </p>
      </div>
    </div>
  );
}
