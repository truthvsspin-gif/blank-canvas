import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Dashboard() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Dashboard" : "Dashboard"}
        description={isEs ? "Bienvenido de vuelta. Tu operacion diaria y rendimiento a simple vista." : "Welcome back. Your daily operations and performance at a glance."}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Contenido del dashboard en construccion..." : "Dashboard content coming soon..."}
        </p>
      </div>
    </div>
  );
}
