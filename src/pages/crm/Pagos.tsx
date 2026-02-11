import { CreditCard, Check, Lock } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export default function Pagos() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const benefits = isEs
    ? [
        {
          title: "Evita cancelaciones de última hora:",
          desc: "cobra una señal o el total por adelantado.",
        },
        {
          title: "Recibe tus cobros al instante",
          desc: "sin depender de transferencias o efectivo.",
        },
        {
          title: "Más fácil para tu cliente:",
          desc: "permite que pueda pagar sin acudir al centro.",
        },
        {
          title: "Menos errores, más control:",
          desc: "todo queda registrado en un mismo lugar.",
        },
        {
          title: "Comisiones transparentes:",
          desc: "Queremos que sepas exactamente qué pagas y por qué.",
        },
      ]
    : [
        {
          title: "Avoid last-minute cancellations:",
          desc: "charge a deposit or the full amount upfront.",
        },
        {
          title: "Get paid instantly",
          desc: "without depending on transfers or cash.",
        },
        {
          title: "Easier for your client:",
          desc: "let them pay without visiting the center.",
        },
        {
          title: "Fewer errors, more control:",
          desc: "everything is recorded in one place.",
        },
        {
          title: "Transparent commissions:",
          desc: "We want you to know exactly what you pay and why.",
        },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CreditCard className="h-7 w-7 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">
          {isEs ? "Pagos" : "Payments"}
        </h1>
      </div>

      {/* Promo card */}
      <div className="rounded-xl border bg-card p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {isEs
            ? "Cobra más rápido y sin complicaciones."
            : "Get paid faster, without complications."}
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mb-8">
          {isEs
            ? "Recibe tus pagos por reservas o facturas directamente desde Detapro, sin depender del efectivo ni de transferencias."
            : "Receive your payments for bookings or invoices directly from Detapro, without relying on cash or transfers."}
        </p>

        <div className="space-y-5 max-w-2xl">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{b.title}</span>{" "}
                <span className="text-muted-foreground">{b.desc}</span>
                {i === benefits.length - 1 && (
                  <span className="text-primary font-medium cursor-pointer ml-1 hover:underline">
                    +info
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        <Button size="lg" className="mt-8 w-full max-w-md text-base gap-2">
          <Lock className="h-4 w-4" />
          {isEs ? "Activar Pagos Online" : "Activate Online Payments"}
        </Button>
      </div>
    </div>
  );
}
