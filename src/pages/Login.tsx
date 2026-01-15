import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react"

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
        badge: "Bienvenido",
        title: "Iniciar sesión",
        subtitle: "Accede a tu panel de Detapro y gestiona tu negocio.",
        email: "Correo electrónico",
        password: "Contraseña",
        remember: "Recordarme",
        forgot: "¿Olvidaste la contraseña?",
        submit: "Iniciar sesión",
        submitting: "Entrando...",
        toastSuccess: "Sesión iniciada, redirigiendo...",
        noAccount: "¿No tienes cuenta?",
        createAccount: "Crear cuenta gratis",
        toastError: "Error al iniciar sesión.",
      }
    : {
        badge: "Welcome back",
        title: "Sign in to your account",
        subtitle: "Access your Detapro dashboard and manage your business.",
        email: "Email address",
        password: "Password",
        remember: "Remember me",
        forgot: "Forgot password?",
        submit: "Sign in",
        submitting: "Signing in...",
        toastSuccess: "Signed in, redirecting...",
        noAccount: "Don't have an account?",
        createAccount: "Create free account",
        toastError: "Unable to sign in.",
      }

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-chart-1 shadow-lg shadow-accent/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
        <Badge className="mb-3 bg-accent/10 text-accent border-accent/20 font-medium">{copy.badge}</Badge>
        <h1 className="text-2xl font-bold text-foreground mb-2">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* Form Card */}
      <div className="bg-card rounded-2xl border shadow-xl shadow-black/5 p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{copy.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{copy.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
              <input type="checkbox" className="size-4 rounded border border-input accent-accent" />
              <span>{copy.remember}</span>
            </label>
            <Link to="#" className="text-accent font-medium hover:underline">
              {copy.forgot}
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            className="w-full bg-gradient-to-r from-accent to-chart-1 hover:opacity-90 shadow-lg shadow-accent/20 py-6 text-base font-semibold !text-black" 
            type="submit" 
            disabled={submitting}
          >
            <span className="text-black font-semibold">{submitting ? copy.submitting : copy.submit}</span>
            <ArrowRight className="ml-2 size-4 text-black" />
          </Button>
        </form>
      </div>

      {/* Signup Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {copy.noAccount}{" "}
          <Link to="/signup" className="text-accent font-semibold hover:underline">
            {copy.createAccount}
          </Link>
        </p>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
