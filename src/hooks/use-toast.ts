import { useState, useCallback } from "react"

type ToastVariant = "success" | "error"

type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ message, variant = "success" }: { message: string; variant?: ToastVariant }) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, variant }])
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}
