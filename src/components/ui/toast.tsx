

import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

type ToastProps = {
  message: string
  variant?: "success" | "error"
  onClose?: () => void
}

export function Toast({ message, variant = "success", onClose }: ToastProps) {
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const closeLabel = isEs ? "Cerrar" : "Close"
  const colorStyles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-rose-200 bg-rose-50 text-rose-800"

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/5",
        colorStyles
      )}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-medium leading-relaxed">{message}</div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-inherit opacity-70 transition hover:opacity-100"
          aria-label={closeLabel}
        >
          {closeLabel}
        </button>
      ) : null}
    </div>
  )
}
