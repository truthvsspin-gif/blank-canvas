import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function BookingNew() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Nueva reserva" : "New Booking"}
        description={isEs ? "Crear una nueva reserva" : "Create a new booking"}
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Formulario de reserva en construccion..." : "Booking form coming soon..."}
        </p>
      </div>
    </div>
  );
}
