export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
