import { Link } from "react-router-dom";
import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, MessageSquare, Briefcase, Mail } from "lucide-react";

export default function CRM() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const sections = [
    {
      title: isEs ? "Clientes" : "Customers",
      description: isEs ? "Gestiona tu base de clientes" : "Manage your customer base",
      href: "/crm/customers",
      icon: Users,
    },
    {
      title: isEs ? "Reservas" : "Bookings",
      description: isEs ? "Ver y gestionar citas" : "View and manage appointments",
      href: "/crm/bookings",
      icon: Calendar,
    },
    {
      title: isEs ? "Leads" : "Leads",
      description: isEs ? "Pipeline de prospectos" : "Prospect pipeline",
      href: "/crm/leads",
      icon: Briefcase,
    },
    {
      title: isEs ? "Bandeja de entrada" : "Inbox",
      description: isEs ? "Mensajes y conversaciones" : "Messages and conversations",
      href: "/crm/inbox",
      icon: Mail,
    },
    {
      title: isEs ? "Servicios" : "Services",
      description: isEs ? "Configura tus servicios" : "Configure your services",
      href: "/crm/services",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="CRM"
        description={isEs ? "Centro de gestion de relaciones con clientes" : "Customer relationship management center"}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.href} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="rounded-lg bg-rose-100 p-2">
                <section.icon className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to={section.href}>{isEs ? "Ver" : "View"}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
