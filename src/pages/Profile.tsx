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
  Sparkles,
  Save,
  Loader2
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
        title: "Mi Perfil",
        subtitle: "Gestiona tu identidad y preferencias de cuenta.",
        profileTitle: "Información Personal",
        profileDesc: "Actualiza tus datos personales y de contacto.",
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
        accountTitle: "Información de Cuenta",
        accountDesc: "Detalles básicos de tu cuenta.",
        userId: "User ID",
        lastSignIn: "Último acceso",
        securityTitle: "Seguridad",
        securityDesc: "Mantén tu cuenta segura.",
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
        title: "My Profile",
        subtitle: "Manage your identity and account preferences.",
        profileTitle: "Personal Information",
        profileDesc: "Update your personal and contact details.",
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
        accountTitle: "Account Information",
        accountDesc: "Basic account details.",
        userId: "User ID",
        lastSignIn: "Last sign-in",
        securityTitle: "Security",
        securityDesc: "Keep your account secure.",
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg shadow-black/5 border-0 bg-gradient-to-r from-violet-50 via-white to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 text-white text-3xl font-bold shadow-lg shadow-violet-500/30">
              {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-10 w-10" />}
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
              <p className="text-muted-foreground">{copy.subtitle}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {email || copy.unknown}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {copy.memberSince} {memberSince}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{copy.active}</Badge>
              <Badge variant="outline" className="border-violet-200 text-violet-700">{copy.verified}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                <Clock className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-violet-600/70">{copy.memberSince}</p>
                <p className="text-lg font-bold text-violet-700">{memberSince}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-600/70">{copy.accountStatus}</p>
                <p className="text-lg font-bold text-emerald-700">{copy.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600/70">{copy.lastSignIn}</p>
                <p className="text-sm font-medium text-amber-700 truncate max-w-[120px]">{lastSignedIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <User className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.profileTitle}</CardTitle>
                  <CardDescription>{copy.profileDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleProfileUpdate}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.fullName}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isEs ? "Tu nombre" : "Your name"}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.email}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                    <span className="text-xs text-muted-foreground">{copy.emailHint}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.phone}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555 0100"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.company}
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder={isEs ? "Empresa" : "Company"}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.titleLabel}
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={isEs ? "Gerente" : "Manager"}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.timezone}
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Europe/Madrid">Europe/Madrid</option>
                      <option value="Asia/Dubai">Asia/Dubai</option>
                      <option value="Asia/Karachi">Asia/Karachi</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.preferredLang}
                  </label>
                  <select
                    value={preferredLang}
                    onChange={(e) => setPreferredLang(e.target.value === "es" ? "es" : "en")}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.bio}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={copy.bioHint}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
                  />
                </div>

                {profileError && (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-5 shrink-0" />
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="size-5 shrink-0" />
                    {profileSuccess}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={profileSaving} 
                    className="bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/20"
                  >
                    {profileSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    {profileSaving ? copy.saving : copy.save}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Hash className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.accountTitle}</CardTitle>
                  <CardDescription>{copy.accountDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">{copy.userId}</span>
                <span className="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded-lg">{user?.id?.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">{copy.email}</span>
                <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                <span className="text-sm text-muted-foreground">{copy.lastSignIn}</span>
                <span className="text-sm font-medium text-foreground">{lastSignedIn}</span>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <Shield className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.securityTitle}</CardTitle>
                  <CardDescription>{copy.securityDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.newPassword}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  <span className="text-xs text-muted-foreground">{copy.passwordHint}</span>
                </div>

                {passwordError && (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="size-5 shrink-0" />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    <CheckCircle2 className="size-5 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={passwordSaving} 
                  variant="outline"
                  className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
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
