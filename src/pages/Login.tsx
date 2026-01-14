import { Link } from "react-router-dom"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { ArrowRight, Lock, Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Toast } from "@/components/ui/toast"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"
import { useLanguage } from "@/components/providers/language-provider"

type ToastState = { message: string; variant: "success" | "error" } | null

export default function LoginPage() {
  const { lang } = useLanguage()
  const isEs = lang === "es"

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading: authLoading } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const copy = isEs
    ? {
        badge: "Acceso",
        title: "Iniciar sesion",
        subtitle: "Entra a tu consola Detapro para continuar donde lo dejaste.",
        email: "Correo electronico",
        password: "Contrasena",
        remember: "Recordarme",
        forgot: "Olvidaste la contrasena?",
        submit: "Entrar",
        submitting: "Entrando...",
        toastSuccess: "Sesion iniciada, redirigiendo...",
        noAccount: "No tienes cuenta?",
        createAccount: "Crear cuenta",
        toastError: "Error al iniciar sesion.",
      }
    : {
        badge: "Access",
        title: "Sign in",
        subtitle: "Enter your Detapro console to continue where you left off.",
        email: "Email",
        password: "Password",
        remember: "Remember me",
        forgot: "Forgot your password?",
        submit: "Sign in",
        submitting: "Signing in...",
        toastSuccess: "Signed in, redirecting...",
        noAccount: "No account yet?",
        createAccount: "Create account",
        toastError: "Unable to sign in.",
      }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const redirect = params.get("redirect") ?? "/dashboard"

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!authLoading && session) {
      navigate(redirect)
    }
  }, [authLoading, redirect, navigate, session])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setToast({ variant: "error", message: signInError.message || copy.toastError })
      setSubmitting(false)
      return
    }

    setToast({ variant: "success", message: copy.toastSuccess })

    await supabase.auth.getSession()
    navigate(redirect)
        setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">{copy.badge}</Badge>
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
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
              type="password"
              required
              placeholder="********"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 rounded border border-input text-rose-600" />
            <span>{copy.remember}</span>
          </label>
          <Link to="#" className="text-rose-600 hover:underline">
            {copy.forgot}
          </Link>
        </div>

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
        {copy.noAccount} {" "}
        <Link to="/signup" className="font-semibold underline">
          {copy.createAccount}
        </Link>
      </div>

      {toast ? <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  )
}

