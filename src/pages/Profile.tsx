import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
        subtitle: "Gestiona identidad, email y credenciales.",
        profileTitle: "Detalles de perfil",
        profileDesc: "Actualiza tu nombre y correo de acceso.",
        fullName: "Nombre completo",
        email: "Email",
        emailHint: "Cambiar el email enviara un mensaje de confirmacion.",
        phone: "Telefono",
        company: "Empresa",
        titleLabel: "Puesto",
        timezone: "Zona horaria",
        preferredLang: "Idioma preferido",
        bio: "Bio corta",
        bioHint: "Una linea sobre ti o tu rol.",
        save: "Guardar cambios",
        saving: "Guardando...",
        accountTitle: "Cuenta",
        accountDesc: "Datos basicos de la cuenta en Supabase.",
        userId: "User ID",
        lastSignIn: "Ultimo acceso",
        securityTitle: "Seguridad",
        securityDesc: "Actualiza tu contrasena para mantener la cuenta segura.",
        newPassword: "Nueva contrasena",
        passwordHint: "Minimo 8 caracteres.",
        updatePassword: "Actualizar contrasena",
        updatingPassword: "Actualizando...",
        unknown: "Desconocido",
        profileUpdated: "Perfil actualizado.",
        profileUpdatedEmail: "Perfil actualizado. Revisa tu correo para confirmar el nuevo email.",
        passwordUpdated: "Contrasena actualizada.",
        passwordShort: "Usa al menos 8 caracteres para tu contrasena.",
      }
    : {
        title: "Profile",
        subtitle: "Manage your account identity, email, and credentials.",
        profileTitle: "Profile details",
        profileDesc: "Update your display name and sign-in email.",
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
        accountDesc: "Basic account facts pulled from Supabase.",
        userId: "User ID",
        lastSignIn: "Last sign-in",
        securityTitle: "Security",
        securityDesc: "Rotate your password to keep the account safe.",
        newPassword: "New password",
        passwordHint: "Minimum 8 characters.",
        updatePassword: "Update password",
        updatingPassword: "Updating...",
        unknown: "Unknown",
        profileUpdated: "Profile updated.",
        profileUpdatedEmail: "Profile updated. Check your inbox to confirm the new email.",
        passwordUpdated: "Password updated.",
        passwordShort: "Use at least 8 characters for your password.",
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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="text-muted-foreground text-sm">{copy.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="lg:col-span-1">
          <CardHeader className="border-b">
            <CardTitle>{copy.profileTitle}</CardTitle>
            <CardDescription>{copy.profileDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form className="space-y-4" onSubmit={handleProfileUpdate}>
              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {copy.fullName}
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={isEs ? "Tu nombre" : "Your name"}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {copy.email}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <span className="text-muted-foreground text-xs">{copy.emailHint}</span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  {copy.phone}
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+1 555 0100"
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  {copy.company}
                  <input
                    type="text"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder={isEs ? "Empresa" : "Company"}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  {copy.titleLabel}
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={isEs ? "Gerente" : "Manager"}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                  {copy.timezone}
                  <select
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Asia/Karachi">Asia/Karachi</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-foreground md:col-span-2">
                  {copy.preferredLang}
                  <select
                    value={preferredLang}
                    onChange={(event) => setPreferredLang(event.target.value === "es" ? "es" : "en")}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
                {copy.bio}
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder={copy.bioHint}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                <span className="text-muted-foreground text-xs">{copy.bioHint}</span>
              </label>

              {profileError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {profileError}
                </p>
              ) : null}
              {profileSuccess ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {profileSuccess}
                </p>
              ) : null}

              <Button type="submit" disabled={profileSaving} className="w-full sm:w-auto">
                {profileSaving ? copy.saving : copy.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>{copy.accountTitle}</CardTitle>
            <CardDescription>{copy.accountDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">{copy.userId}</span>
              <span className="font-mono text-xs">{user?.id}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">{copy.email}</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">{copy.lastSignIn}</span>
              <span className="font-medium">{lastSignedIn}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{copy.securityTitle}</CardTitle>
          <CardDescription>{copy.securityDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <form className="space-y-4" onSubmit={handlePasswordUpdate}>
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              {copy.newPassword}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="********"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
              <span className="text-muted-foreground text-xs">{copy.passwordHint}</span>
            </label>

            {passwordError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {passwordError}
              </p>
            ) : null}
            {passwordSuccess ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {passwordSuccess}
              </p>
            ) : null}

            <Button type="submit" disabled={passwordSaving} className="w-full sm:w-auto">
              {passwordSaving ? copy.updatingPassword : copy.updatePassword}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

