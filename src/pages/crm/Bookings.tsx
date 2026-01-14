import { Link } from "react-router-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Bookings() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Reservas" : "Bookings"}
        description={isEs ? "Gestiona las citas programadas" : "Manage scheduled appointments"}
        actions={
          <Button asChild className="bg-rose-600 hover:bg-rose-500">
            <Link to="/crm/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              {isEs ? "Nueva reserva" : "New booking"}
            </Link>
          </Button>
        }
      />
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-muted-foreground">
          {isEs ? "Lista de reservas en construccion..." : "Booking list coming soon..."}
        </p>
      </div>
    </div>
  );
}
