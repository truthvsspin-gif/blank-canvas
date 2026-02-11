import { Building2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

export default function Negocio() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {isEs ? "Negocio" : "Business"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEs
            ? "Configuración del negocio, horarios y servicios."
            : "Business settings, schedules and services."}
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-20">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">
          {isEs ? "Próximamente" : "Coming soon"}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {isEs
            ? "La configuración del negocio estará disponible pronto."
            : "Business settings will be available soon."}
        </p>
      </div>
    </div>
  );
}
