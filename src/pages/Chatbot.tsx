import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Chatbot() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chatbot"
        description={isEs ? "Configura tu asistente de IA" : "Configure your AI assistant"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Configuracion del chatbot en construccion..." : "Chatbot settings coming soon..."}
        </p>
      </div>
    </div>
  );
}
