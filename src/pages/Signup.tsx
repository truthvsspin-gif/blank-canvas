import { Link } from "react-router-dom"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Suspense, useEffect, useState } from "react"
import { ArrowRight, Lock, Mail, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { Toast } from "@/components/ui/toast"
import { useLanguage } from "@/components/providers/language-provider"

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null)
  const { session, loading: authLoading } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"

  const copy = isEs
    ? {
        badge: "Registro",
        title: "Crea tu cuenta",
        subtitle: "Desbloquea el panel Detapro con una cuenta compartida o individual.",
        fullName: "Nombre completo",
        email: "Correo electronico",
        password: "Contrasena",
        confirmPassword: "Confirmar contrasena",
        mismatch: "Las contrasenas no coinciden.",
        submit: "Crear cuenta",
        submitting: "Creando...",
        toastConfirm: "Cuenta creada. Revisa tu correo para confirmar.",
        toastSuccess: "Cuenta creada, redirigiendo...",
        haveAccount: "Ya tienes cuenta?",
        login: "Iniciar sesion",
      }
    : {
        badge: "Sign up",
        title: "Create your account",
        subtitle: "Unlock the Detapro console with a shared or individual account.",
        fullName: "Full name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm password",
        mismatch: "Passwords do not match.",
        submit: "Create account",
        submitting: "Creating...",
        toastConfirm: "Account created. Check your email to confirm.",
        toastSuccess: "Account created, redirecting...",
        haveAccount: "Already have an account?",
        login: "Sign in",
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

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <Badge className="bg-rose-100 text-rose-700 border-rose-200">{copy.badge}</Badge>
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {copy.fullName}
          <div className="flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-rose-200">
            <User className="size-4 text-muted-foreground" />
            <input
              type="text"
              required
              placeholder={isEs ? "Nombre y apellido" : "First and last name"}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
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
              type="password"
              required
              placeholder="********"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          {copy.confirmPassword}
          <div className="flex items-center gap-2 rounded-lg border border-input bg-white px-3 py-2 shadow-xs focus-within:ring-2 focus-within:ring-rose-200">
            <Lock className="size-4 text-muted-foreground" />
            <input
              type="password"
              required
              placeholder="********"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
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

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {copy.haveAccount} {" "}
        <Link to="/login" className="font-semibold underline">
          {copy.login}
        </Link>
      </div>

      {toast ? <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  )
}

