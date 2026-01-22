"use client"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/components/providers/auth-provider"

type State = {
  businessId: string | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  switchBusiness: (newBusinessId: string) => void
}

export function useCurrentBusiness(): State {
  const { user } = useAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user) {
        setBusinessId(null)
        setLoading(false)
        return
      }
      setLoading(true)
      
      // Check if there's a stored business preference
      const storedBusinessId = localStorage.getItem("currentBusinessId")
      
      // Fetch all memberships ordered by most recent first
      const { data: memberships, error: err } = await supabase
        .from("memberships")
        .select("business_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      
      if (!active) return
      if (err || !memberships?.length) {
        setError(err?.message || "No hay negocio activo. Crea uno para continuar.")
        setBusinessId(null)
      } else {
        // Use stored preference if valid, otherwise use most recent
        const validStoredId = memberships.some(m => m.business_id === storedBusinessId)
        const selectedId = validStoredId ? storedBusinessId : memberships[0].business_id
        setBusinessId(selectedId)
        // Store the selection for consistency
        if (selectedId) localStorage.setItem("currentBusinessId", selectedId)
        setError(null)
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user, refreshKey])

  const refresh = async () => {
    setRefreshKey((x) => x + 1)
  }

  const switchBusiness = (newBusinessId: string) => {
    localStorage.setItem("currentBusinessId", newBusinessId)
    setBusinessId(newBusinessId)
  }

  return { businessId, loading, error, refresh, switchBusiness }
}
