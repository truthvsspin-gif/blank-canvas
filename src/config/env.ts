type PublicEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
}

type ServerEnv = {
  supabaseServiceRoleKey?: string
  whatsappAccessToken?: string
  whatsappPhoneNumberId?: string
  instagramAccessToken?: string
  instagramBusinessId?: string
  openaiApiKey?: string
}

type AppEnv = PublicEnv & ServerEnv

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function loadEnv(): AppEnv {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID,
    openaiApiKey: process.env.OPENAI_API_KEY,
  }
}

export const env = loadEnv()
