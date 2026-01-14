import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/auth-helpers-nextjs"

const protectedPaths = ["/dashboard", "/crm", "/chatbot", "/admin", "/profile"]
const authPaths = ["/login", "/signup"]

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const path = req.nextUrl.pathname
  const isProtected = protectedPaths.some((route) => path.startsWith(route))
  const isAuthRoute = authPaths.some((route) => path.startsWith(route))

  // If we cannot create supabase client, fall back to protecting the routes.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      const redirectUrl = new URL("/login", req.url)
      redirectUrl.searchParams.set("redirect", path)
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if ((!session || error) && isProtected) {
    const redirectUrl = new URL("/login", req.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/crm/:path*",
    "/chatbot/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
    "/",
  ],
}
