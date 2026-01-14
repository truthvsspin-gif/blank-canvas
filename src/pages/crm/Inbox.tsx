import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Inbox() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Bandeja de entrada" : "Inbox"}
        description={isEs ? "Mensajes y conversaciones" : "Messages and conversations"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Bandeja de entrada en construccion..." : "Inbox coming soon..."}
        </p>
      </div>
    </div>
  );
}
