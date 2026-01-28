import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageCircle, 
  Instagram, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2,
  Copy,
  RefreshCw,
  Shield
} from "lucide-react"

type IntegrationData = {
  whatsapp_access_token: string
  whatsapp_phone_number_id: string
  instagram_access_token: string
  instagram_business_id: string
}

export default function Integrations() {
  const navigate = useNavigate()
  const { businessId, loading: businessLoading } = useCurrentBusiness()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false)
  const [showInstagramToken, setShowInstagramToken] = useState(false)
  
  const [formData, setFormData] = useState<IntegrationData>({
    whatsapp_access_token: "",
    whatsapp_phone_number_id: "",
    instagram_access_token: "",
    instagram_business_id: "",
  })

  const [originalData, setOriginalData] = useState<IntegrationData | null>(null)

  useEffect(() => {
    if (!businessLoading && !businessId) {
      navigate("/login")
      return
    }

    if (businessId) {
      loadIntegrations()
    }
  }, [businessId, businessLoading, navigate])

  async function loadIntegrations() {
    if (!businessId) return

    setLoading(true)
    const { data, error } = await supabase
      .from("business_integrations")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle()

    if (!error && data) {
      const integrationData = {
        whatsapp_access_token: data.whatsapp_access_token || "",
        whatsapp_phone_number_id: data.whatsapp_phone_number_id || "",
        instagram_access_token: data.instagram_access_token || "",
        instagram_business_id: data.instagram_business_id || "",
      }
      setFormData(integrationData)
      setOriginalData(integrationData)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!businessId) return

    setSaving(true)

    const payload = {
      business_id: businessId,
      whatsapp_access_token: formData.whatsapp_access_token || null,
      whatsapp_phone_number_id: formData.whatsapp_phone_number_id || null,
      instagram_access_token: formData.instagram_access_token || null,
      instagram_business_id: formData.instagram_business_id || null,
      updated_at: new Date().toISOString(),
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from("business_integrations")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle()

    let error
    if (existing?.id) {
      const result = await supabase
        .from("business_integrations")
        .update(payload)
        .eq("business_id", businessId)
      error = result.error
    } else {
      const result = await supabase
        .from("business_integrations")
        .insert(payload)
      error = result.error
    }

    setSaving(false)

    if (!error) {
      setOriginalData(formData)
    }
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)
  
  const whatsAppConfigured = Boolean(formData.whatsapp_access_token && formData.whatsapp_phone_number_id)
  const instagramConfigured = Boolean(formData.instagram_access_token && formData.instagram_business_id)

  if (loading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your WhatsApp Business and Instagram accounts to enable AI-powered automated responses.
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className={whatsAppConfigured ? "border-emerald-500/50 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`p-3 rounded-full ${whatsAppConfigured ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
              <MessageCircle className={`h-6 w-6 ${whatsAppConfigured ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">WhatsApp Business</p>
              <p className="text-sm text-muted-foreground">
                {whatsAppConfigured ? "Connected and ready" : "Not configured"}
              </p>
            </div>
            {whatsAppConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
          </CardContent>
        </Card>

        <Card className={instagramConfigured ? "border-emerald-500/50 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="flex items-center gap-4 py-4">
            <div className={`p-3 rounded-full ${instagramConfigured ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
              <Instagram className={`h-6 w-6 ${instagramConfigured ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div className="flex-1">
              <p className="font-medium">Instagram DMs</p>
              <p className="text-sm text-muted-foreground">
                {instagramConfigured ? "Connected and ready" : "Not configured"}
              </p>
            </div>
            {instagramConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">WhatsApp Business API</CardTitle>
              <CardDescription>Configure your Meta WhatsApp Cloud API credentials</CardDescription>
            </div>
            <a 
              href="https://developers.facebook.com/apps/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Meta Developer Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number ID</label>
            <input
              type="text"
              value={formData.whatsapp_phone_number_id}
              onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
              placeholder="e.g., 123456789012345"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Found in WhatsApp Dashboard → Getting Started → Phone Number ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Access Token</label>
            <div className="relative">
              <input
                type={showWhatsAppToken ? "text" : "password"}
                value={formData.whatsapp_access_token}
                onChange={(e) => setFormData({ ...formData, whatsapp_access_token: e.target.value })}
                placeholder="Permanent access token"
                className="w-full px-4 py-2 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showWhatsAppToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use a System User token for production (never temporary tokens)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-2">Webhook URL</p>
            <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto">
              https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/webhook-whatsapp
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Configure this URL in your Meta App → WhatsApp → Configuration → Webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Verification Token */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Webhook Verification Token</CardTitle>
              <CardDescription>Secure token used by Meta to verify your webhook endpoints</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Important:</strong> This token must be set as a Supabase Edge Function secret named <code className="bg-background px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> and also entered in your Meta App webhook configuration.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verification Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="verify-token"
                  defaultValue=""
                  placeholder="e.g., my_secure_verify_token_123"
                  className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const input = document.getElementById('verify-token') as HTMLInputElement
                  const token = `verify_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
                  input.value = token
                }}
                title="Generate random token"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const input = document.getElementById('verify-token') as HTMLInputElement
                  if (input.value) {
                    navigator.clipboard.writeText(input.value)
                  }
                }}
                title="Copy token"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a secure token, copy it, and add it to both Supabase secrets and Meta webhook settings
            </p>
          </div>

          {/* Save to Secrets Button */}
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            onClick={() => {
              const input = document.getElementById('verify-token') as HTMLInputElement
              if (input.value) {
                navigator.clipboard.writeText(input.value)
                window.open('https://supabase.com/dashboard/project/ybifjdlelpvgzmzvgwls/settings/functions', '_blank')
              } else {
                // Generate token first if empty
                const token = `verify_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`
                input.value = token
                navigator.clipboard.writeText(token)
                window.open('https://supabase.com/dashboard/project/ybifjdlelpvgzmzvgwls/settings/functions', '_blank')
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Save to Supabase Secrets
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Copies token to clipboard and opens Supabase secrets page. Add as <code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code>
          </p>

          <div className="space-y-3">
            <p className="text-sm font-medium">Setup Steps:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Generate or enter a secure verification token above</li>
              <li>Copy the token and add it as <code className="bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> in <a href="https://supabase.com/dashboard/project/ybifjdlelpvgzmzvgwls/settings/functions" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Edge Function Secrets</a></li>
              <li>Enter the same token in Meta Developer Portal when configuring your webhook</li>
              <li>Subscribe to the <code className="bg-muted px-1 rounded">messages</code> field in webhook subscriptions</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Instagram Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <Instagram className="h-5 w-5 text-pink-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Instagram Messaging API</CardTitle>
              <CardDescription>Configure your Instagram Business account for DM automation</CardDescription>
            </div>
            <a 
              href="https://developers.facebook.com/docs/messenger-platform/instagram" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Documentation <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Instagram Business ID</label>
            <input
              type="text"
              value={formData.instagram_business_id}
              onChange={(e) => setFormData({ ...formData, instagram_business_id: e.target.value })}
              placeholder="e.g., 17841405309876"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Found in Graph API Explorer → Instagram Business Account ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Access Token</label>
            <div className="relative">
              <input
                type={showInstagramToken ? "text" : "password"}
                value={formData.instagram_access_token}
                onChange={(e) => setFormData({ ...formData, instagram_access_token: e.target.value })}
                placeholder="Long-lived access token"
                className="w-full px-4 py-2 pr-12 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="button"
                onClick={() => setShowInstagramToken(!showInstagramToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showInstagramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generate a long-lived token (60 days) or use a System User token
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium mb-2">Webhook URL</p>
            <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto">
              https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/webhook-instagram
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Configure this URL in your Meta App → Instagram → Webhooks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div>
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              Unsaved changes
            </Badge>
          )}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Integrations
        </Button>
      </div>

      {/* Help Section */}
      <Card className="mt-8 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Create a Meta Developer App at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com</a></p>
          <p>2. Add WhatsApp and/or Instagram products to your app</p>
          <p>3. Configure the webhook URLs shown above with a verify token</p>
          <p>4. Generate permanent access tokens using System Users</p>
          <p>5. Enter your credentials above and save</p>
        </CardContent>
      </Card>
    </div>
  )
}
