import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Services() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Servicios" : "Services"}
        description={isEs ? "Configura tus servicios de detailing" : "Configure your detailing services"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Lista de servicios en construccion..." : "Service list coming soon..."}
        </p>
      </div>
    </div>
  );
}
