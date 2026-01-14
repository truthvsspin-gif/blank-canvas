import { useParams } from "react-router-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function CustomerDetail() {
  const { id } = useParams();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Detalle del cliente" : "Customer Detail"}
        description={`ID: ${id}`}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Detalles del cliente en construccion..." : "Customer details coming soon..."}
        </p>
      </div>
    </div>
  );
}
