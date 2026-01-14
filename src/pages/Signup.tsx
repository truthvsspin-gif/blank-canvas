import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/components/providers/language-provider";

type ToastState = { message: string; variant: "success" | "error" } | null;

export default function Signup() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const copy = isEs
    ? {
        badge: "Registro",
        title: "Crear cuenta",
        subtitle: "Unete a Detapro y comienza a gestionar tu negocio.",
        name: "Nombre completo",
        email: "Correo electronico",
        password: "Contrasena",
        submit: "Registrarse",
        submitting: "Registrando...",
        toastSuccess: "Cuenta creada, redirigiendo...",
        hasAccount: "Ya tienes cuenta?",
        signIn: "Iniciar sesion",
        toastError: "Error al crear cuenta.",
      }
    : {
        badge: "Sign Up",
        title: "Create account",
        subtitle: "Join Detapro and start managing your business.",
        name: "Full name",
        email: "Email",
        password: "Password",
        submit: "Sign up",
        submitting: "Signing up...",
        toastSuccess: "Account created, redirecting...",
        hasAccount: "Already have an account?",
        signIn: "Sign in",
        toastError: "Unable to create account.",
      };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, navigate, session]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setToast({ variant: "error", message: signUpError.message || copy.toastError });
      setSubmitting(false);
      return;
    }

    setToast({ variant: "success", message: copy.toastSuccess });

    await supabase.auth.getSession();
    navigate("/dashboard", { replace: true });
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">{copy.badge}</Badge>
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {copy.name}
          <div className="flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-rose-200">
            <User className="size-4 text-muted-foreground" />
            <input
              type="text"
              required
              placeholder="John Doe"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {copy.email}
          <div className="flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-rose-200">
            <Mail className="size-4 text-muted-foreground" />
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {copy.password}
          <div className="flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-rose-200">
            <Lock className="size-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="********"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Button className="w-full bg-rose-600 text-white hover:bg-rose-500" type="submit" disabled={submitting}>
          {submitting ? copy.submitting : copy.submit}
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </form>

      <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {copy.hasAccount}{" "}
        <Link to="/login" className="font-semibold underline">
          {copy.signIn}
        </Link>
      </div>

      {toast ? <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
