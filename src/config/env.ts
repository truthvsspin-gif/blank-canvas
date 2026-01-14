type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadEnv(): PublicEnv {
  return {
    supabaseUrl: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
    supabaseAnonKey: required("VITE_SUPABASE_PUBLISHABLE_KEY", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  };
}

export const env = loadEnv();
