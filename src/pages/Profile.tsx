import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function Profile() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Perfil" : "Profile"}
        description={isEs ? "Gestiona tu cuenta" : "Manage your account"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Configuracion del perfil en construccion..." : "Profile settings coming soon..."}
        </p>
      </div>
    </div>
  );
}
