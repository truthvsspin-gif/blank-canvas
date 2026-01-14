import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Admin() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Administracion" : "Admin"}
        description={isEs ? "Panel de administracion" : "Administration panel"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Panel de admin en construccion..." : "Admin panel coming soon..."}
        </p>
      </div>
    </div>
  );
}
