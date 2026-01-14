import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Leads() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leads"
        description={isEs ? "Pipeline de prospectos" : "Prospect pipeline"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Lista de leads en construccion..." : "Lead list coming soon..."}
        </p>
      </div>
    </div>
  );
}
