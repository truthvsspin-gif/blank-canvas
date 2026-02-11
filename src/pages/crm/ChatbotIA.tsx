import { Bot, Check, Lock } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";

export default function ChatbotIA() {
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const benefits = isEs
    ? [
        { title: "Agenda citas en segundos", desc: "El cliente habla con el chatbot y la cita se crea directamente en tu calendario." },
        { title: "Atiende consultas automáticamente", desc: "Responde preguntas sobre precios, servicios y horarios sin que tengas que mirar el móvil." },
        { title: "Aprende de tu negocio", desc: "Reconoce tus servicios, clientes y disponibilidad para responder con precisión." },
        { title: "Totalmente automatizado", desc: "Disponible 24/7, integrado con tus órdenes y recordatorios. Tu negocio sigue funcionando incluso cuando tú estás ocupado." },
      ]
    : [
        { title: "Schedule appointments in seconds", desc: "The customer talks to the chatbot and the appointment is created directly in your calendar." },
        { title: "Handle inquiries automatically", desc: "Answer questions about prices, services and schedules without checking your phone." },
        { title: "Learns from your business", desc: "Recognizes your services, clients and availability to respond accurately." },
        { title: "Fully automated", desc: "Available 24/7, integrated with your orders and reminders. Your business keeps running even when you're busy." },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot className="h-7 w-7 text-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Chatbot IA</h1>
        <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-600 px-2 py-0.5 rounded">EXTRA</span>
      </div>

      {/* Hero */}
      <div className="rounded-xl border bg-card p-8 md:p-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
          {isEs
            ? "Tu asistente inteligente que atiende a tus clientes por ti"
            : "Your smart assistant that serves your customers for you"}
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits */}
          <div className="space-y-5">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{b.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat mockup */}
          <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
            {/* User bubble */}
            <div className="flex justify-end">
              <div className="bg-emerald-100 text-foreground rounded-xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                {isEs
                  ? "¿Qué diferencia hay entre el detallado básico y el completo?"
                  : "What's the difference between basic and full detailing?"}
              </div>
            </div>
            {/* Bot bubble */}
            <div className="flex justify-start">
              <div className="bg-card border rounded-xl rounded-tl-sm px-4 py-2 max-w-[80%] text-sm">
                {isEs
                  ? "El básico incluye lavado exterior e interior. El completo además incluye descontaminado, hidratación de plásticos y sellado. ¿Quieres que te mande precios o reservar una cita?"
                  : "Basic includes exterior and interior wash. Full also includes decontamination, plastic hydration and sealing. Want me to send prices or book an appointment?"}
              </div>
            </div>
            {/* User bubble */}
            <div className="flex justify-end">
              <div className="bg-emerald-100 text-foreground rounded-xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                {isEs
                  ? "Hola! ¿Tenéis hueco para lavar mi coche mañana?"
                  : "Hi! Do you have a slot to wash my car tomorrow?"}
              </div>
            </div>
            {/* Bot bubble */}
            <div className="flex justify-start">
              <div className="bg-card border rounded-xl rounded-tl-sm px-4 py-2 max-w-[80%] text-sm">
                {isEs
                  ? "¡Hola 👋! Claro, déjame revisar. Tenemos disponibles a las 10:00 o a las 12:30. ¿Qué hora te viene mejor?"
                  : "Hi 👋! Sure, let me check. We have 10:00 or 12:30 available. What time works best?"}
              </div>
            </div>
          </div>
        </div>

        <Button size="lg" className="mt-8 w-full max-w-md gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          <Lock className="h-4 w-4" />
          {isEs ? "Activa el Chatbot de IA" : "Activate AI Chatbot"}
        </Button>
      </div>
    </div>
  );
}
