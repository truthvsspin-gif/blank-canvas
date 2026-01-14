import { useEffect, useMemo, useState } from "react"
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Globe, 
  Languages, 
  FileText,
  Shield,
  Key,
  Clock,
  Hash,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/components/providers/language-provider"

export default function ProfilePage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"

  const copy = isEs
    ? {
        title: "Perfil",
        subtitle: "Gestiona tu identidad, email y credenciales de forma segura.",
        profileTitle: "Detalles de perfil",
        profileDesc: "Actualiza tu información personal y preferencias.",
        fullName: "Nombre completo",
        email: "Email",
        emailHint: "Cambiar el email enviará un mensaje de confirmación.",
        phone: "Teléfono",
        company: "Empresa",
        titleLabel: "Puesto",
        timezone: "Zona horaria",
        preferredLang: "Idioma preferido",
        bio: "Bio corta",
        bioHint: "Una línea sobre ti o tu rol.",
        save: "Guardar cambios",
        saving: "Guardando...",
        accountTitle: "Cuenta",
        accountDesc: "Información básica de tu cuenta.",
        userId: "User ID",
        lastSignIn: "Último acceso",
        securityTitle: "Seguridad",
        securityDesc: "Mantén tu cuenta segura actualizando tu contraseña.",
        newPassword: "Nueva contraseña",
        passwordHint: "Mínimo 8 caracteres.",
        updatePassword: "Actualizar contraseña",
        updatingPassword: "Actualizando...",
        unknown: "Desconocido",
        profileUpdated: "Perfil actualizado correctamente.",
        profileUpdatedEmail: "Perfil actualizado. Revisa tu correo para confirmar el nuevo email.",
        passwordUpdated: "Contraseña actualizada correctamente.",
        passwordShort: "Usa al menos 8 caracteres para tu contraseña.",
        quickStats: "Resumen rápido",
        memberSince: "Miembro desde",
        accountStatus: "Estado de cuenta",
        active: "Activo",
        verified: "Verificado",
      }
    : {
        title: "Profile",
        subtitle: "Manage your identity, email, and credentials securely.",
        profileTitle: "Profile Details",
        profileDesc: "Update your personal information and preferences.",
        fullName: "Full name",
        email: "Email",
        emailHint: "Changing your email will send a confirmation message.",
        phone: "Phone",
        company: "Company",
        titleLabel: "Title",
        timezone: "Timezone",
        preferredLang: "Preferred language",
        bio: "Short bio",
        bioHint: "One line about you or your role.",
        save: "Save changes",
        saving: "Saving...",
        accountTitle: "Account",
        accountDesc: "Basic account information.",
        userId: "User ID",
        lastSignIn: "Last sign-in",
        securityTitle: "Security",
        securityDesc: "Keep your account safe by updating your password.",
        newPassword: "New password",
        passwordHint: "Minimum 8 characters.",
        updatePassword: "Update password",
        updatingPassword: "Updating...",
        unknown: "Unknown",
        profileUpdated: "Profile updated successfully.",
        profileUpdatedEmail: "Profile updated. Check your inbox to confirm the new email.",
        passwordUpdated: "Password updated successfully.",
        passwordShort: "Use at least 8 characters for your password.",
        quickStats: "Quick Stats",
        memberSince: "Member since",
        accountStatus: "Account status",
        active: "Active",
        verified: "Verified",
      }

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [title, setTitle] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [preferredLang, setPreferredLang] = useState<"en" | "es">("en")
  const [bio, setBio] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name ?? "")
    setEmail(user?.email ?? "")
    setPhone(user?.user_metadata?.phone ?? "")
    setCompany(user?.user_metadata?.company ?? "")
    setTitle(user?.user_metadata?.title ?? "")
    setTimezone(user?.user_metadata?.timezone ?? "UTC")
    setPreferredLang(
      user?.user_metadata?.preferred_lang === "es" || user?.user_metadata?.preferred_lang === "en"
        ? user.user_metadata.preferred_lang
        : "en"
    )
    setBio(user?.user_metadata?.bio ?? "")
  }, [user])

  const lastSignedIn = useMemo(() => {
    if (!user?.last_sign_in_at) return copy.unknown
    return new Date(user.last_sign_in_at).toLocaleString()
  }, [copy.unknown, user?.last_sign_in_at])

  const memberSince = useMemo(() => {
    if (!user?.created_at) return copy.unknown
    return new Date(user.created_at).toLocaleDateString()
  }, [copy.unknown, user?.created_at])

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setProfileSaving(true)

    const updatePayload: {
      email?: string
      data: Record<string, string | null>
    } = {
      data: {
        full_name: fullName || null,
        phone: phone || null,
        company: company || null,
        title: title || null,
        timezone: timezone || null,
        preferred_lang: preferredLang || null,
        bio: bio || null,
      },
    }

    if (email && email !== user?.email) {
      updatePayload.email = email
    }

    const { error } = await supabase.auth.updateUser(updatePayload)
    setProfileSaving(false)

    if (error) {
      setProfileError(error.message)
      return
    }

    setProfileSuccess(
      updatePayload.email && updatePayload.email !== user?.email
        ? copy.profileUpdatedEmail
        : copy.profileUpdated
    )
  }

  const handlePasswordUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword || newPassword.length < 8) {
      setPasswordError(copy.passwordShort)
      return
    }

    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
      return
    }

    setPasswordSuccess(copy.passwordUpdated)
    setNewPassword("")
  }

  const inputClasses = "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
  const selectClasses = "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-foreground to-foreground/80 p-8 text-background">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-bl-full" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-accent/20 to-transparent rounded-tr-full" />
        <div className="relative flex items-center gap-6">
          <div className="grid size-20 place-items-center rounded-2xl bg-background/10 backdrop-blur-sm border border-background/20">
            <User className="size-10 text-background" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{copy.title}</h1>
            <p className="text-background/70 mt-1">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{copy.memberSince}</p>
                <p className="text-lg font-semibold text-foreground">{memberSince}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{copy.accountStatus}</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{copy.active}</Badge>
                  <Badge variant="outline" className="border-primary/20 text-primary">{copy.verified}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent-foreground">
                <Sparkles className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{copy.lastSignIn}</p>
                <p className="text-sm font-medium text-foreground">{lastSignedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Profile Form */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <CardTitle className="text-foreground">{copy.profileTitle}</CardTitle>
                <CardDescription className="text-muted-foreground">{copy.profileDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form className="space-y-6" onSubmit={handleProfileUpdate}>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <User className="size-4 text-muted-foreground" />
                    {copy.fullName}
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isEs ? "Tu nombre" : "Your name"}
                    className={inputClasses}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mail className="size-4 text-muted-foreground" />
                    {copy.email}
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClasses}
                  />
                  <span className="text-xs text-muted-foreground">{copy.emailHint}</span>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Phone className="size-4 text-muted-foreground" />
                      {copy.phone}
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 0100"
                      className={inputClasses}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Building className="size-4 text-muted-foreground" />
                      {copy.company}
                    </span>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={isEs ? "Empresa" : "Company"}
                      className={inputClasses}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Briefcase className="size-4 text-muted-foreground" />
                      {copy.titleLabel}
                    </span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isEs ? "Gerente" : "Manager"}
                      className={inputClasses}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Globe className="size-4 text-muted-foreground" />
                      {copy.timezone}
                    </span>
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClasses}>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Madrid">Europe/Madrid</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Asia/Karachi">Asia/Karachi</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Languages className="size-4 text-muted-foreground" />
                    {copy.preferredLang}
                  </span>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value === "es" ? "es" : "en")}
                    className={selectClasses}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="size-4 text-muted-foreground" />
                    {copy.bio}
                  </span>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={copy.bioHint}
                    className={inputClasses}
                  />
                </label>
              </div>

              {profileError && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="size-5 shrink-0" />
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 animate-fade-in">
                  <CheckCircle2 className="size-5 shrink-0" />
                  {profileSuccess}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={profileSaving} 
                className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 transition-all duration-300"
              >
                {profileSaving ? copy.saving : copy.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent-foreground">
                  <Hash className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{copy.accountTitle}</CardTitle>
                  <CardDescription className="text-muted-foreground">{copy.accountDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md">
                <span className="text-sm text-muted-foreground">{copy.userId}</span>
                <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded-lg">{user?.id?.slice(0, 8)}...</span>
              </div>
              <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md">
                <span className="text-sm text-muted-foreground">{copy.email}</span>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
              <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:shadow-md">
                <span className="text-sm text-muted-foreground">{copy.lastSignIn}</span>
                <span className="text-sm font-medium text-foreground">{lastSignedIn}</span>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{copy.securityTitle}</CardTitle>
                  <CardDescription className="text-muted-foreground">{copy.securityDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Key className="size-4 text-muted-foreground" />
                    {copy.newPassword}
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClasses}
                  />
                  <span className="text-xs text-muted-foreground">{copy.passwordHint}</span>
                </label>

                {passwordError && (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive animate-fade-in">
                    <AlertCircle className="size-5 shrink-0" />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600 animate-fade-in">
                    <CheckCircle2 className="size-5 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={passwordSaving} 
                  variant="outline"
                  className="w-full border-border hover:bg-accent transition-all duration-300"
                >
                  {passwordSaving ? copy.updatingPassword : copy.updatePassword}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
