import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { Toast } from "@/components/ui/toast"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

export default function SignupPage() {
  const { lang } = useLanguage()
  const isEs = lang === "es"

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</div>}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null)
  const { session, loading: authLoading } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"

  const copy = isEs
    ? {
        badge: "Comienza gratis",
        title: "Crea tu cuenta",
        subtitle: "Únete a miles de negocios que usan Detapro.",
        fullName: "Nombre completo",
        email: "Correo electrónico",
        password: "Contraseña",
        confirmPassword: "Confirmar contraseña",
        mismatch: "Las contraseñas no coinciden.",
        submit: "Crear cuenta",
        submitting: "Creando...",
        toastConfirm: "Cuenta creada. Revisa tu correo para confirmar.",
        toastSuccess: "Cuenta creada, redirigiendo...",
        haveAccount: "¿Ya tienes cuenta?",
        login: "Iniciar sesión",
        features: [
          "Gestión de clientes ilimitada",
          "Reservas y calendario integrado",
          "Chatbot con IA incluido",
        ],
      }
    : {
        badge: "Start for free",
        title: "Create your account",
        subtitle: "Join thousands of businesses using Detapro.",
        fullName: "Full name",
        email: "Email address",
        password: "Password",
        confirmPassword: "Confirm password",
        mismatch: "Passwords do not match.",
        submit: "Create account",
        submitting: "Creating...",
        toastConfirm: "Account created. Check your email to confirm.",
        toastSuccess: "Account created, redirecting...",
        haveAccount: "Already have an account?",
        login: "Sign in",
        features: [
          "Unlimited customer management",
          "Integrated bookings & calendar",
          "AI chatbot included",
        ],
      }

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

    if (password !== confirmPassword) {
      setError(copy.mismatch)
      return
    }

    setSubmitting(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setToast({ variant: "error", message: signUpError.message })
      setSubmitting(false)
      return
    }

    if (!data.session) {
      setToast({ variant: "success", message: copy.toastConfirm })
      navigate("/login")
      setSubmitting(false)
      return
    }

    setToast({ variant: "success", message: copy.toastSuccess })

    await supabase.auth.getSession()
    navigate(redirect)
    setSubmitting(false)
  }

  const passwordMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        </div>
        <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">{copy.badge}</Badge>
        <h1 className="text-2xl font-bold text-foreground mb-2">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* Features List */}
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {copy.features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
            <Check className="h-3 w-3 text-emerald-600" />
            {feature}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-card rounded-2xl border shadow-xl shadow-black/5 p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Full Name Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{copy.fullName}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                required
                placeholder={isEs ? "Juan García" : "John Doe"}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{copy.email}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{copy.confirmPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                className={cn(
                  "w-full pl-10 pr-12 py-3 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  passwordMatch 
                    ? "border-emerald-500 focus:ring-emerald-500/20" 
                    : "border-input focus:ring-emerald-500/20 focus:border-emerald-500"
                )}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {passwordMatch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:opacity-90 shadow-lg shadow-emerald-500/20 py-6 text-base font-semibold" 
            type="submit" 
            disabled={submitting}
          >
            {submitting ? copy.submitting : copy.submit}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </form>
      </div>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          {copy.haveAccount}{" "}
          <Link to="/login" className="text-emerald-600 font-semibold hover:underline">
            {copy.login}
          </Link>
        </p>
      </div>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  )
}
