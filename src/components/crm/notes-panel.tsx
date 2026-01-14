

import { FormEvent, useEffect, useState } from "react"
import { Loader2, MessageSquarePlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useLanguage } from "@/components/providers/language-provider"
import { supabase } from "@/lib/supabaseClient"
import { Note } from "@/types/crm"

type NotesPanelProps = {
  entityId: string
  entityType: "customer" | "booking"
}

export function NotesPanel({ entityId, entityType }: NotesPanelProps) {
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const copy = {
    title: isEs ? "Notas" : "Notes",
    addPlaceholder: isEs ? "Anade una nota..." : "Add a note...",
    addButton: isEs ? "Anadir nota" : "Add note",
    loading: isEs ? "Cargando notas..." : "Loading notes...",
    empty: isEs ? "Sin notas todavia." : "No notes yet.",
  }
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchNotes = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from("notes")
        .select("*")
        .eq("business_id", businessId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
      if (err) {
        setError(err.message)
        setNotes([])
      } else {
        setNotes((data as Note[]) || [])
      }
      setLoading(false)
    }
    fetchNotes()
  }, [businessId, entityId, entityType])

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!businessId || !message.trim()) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from("notes")
      .insert({
        business_id: businessId,
        entity_type: entityType,
        entity_id: entityId,
        message: message.trim(),
      })
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
    } else if (data) {
      setNotes((prev) => [data as Note, ...prev])
      setMessage("")
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{copy.title}</CardTitle>
        <Badge variant="outline" className="border-slate-200 text-slate-700">
          Timeline
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">Error: {error}</div>
        ) : null}
        <form className="space-y-3" onSubmit={handleAddNote}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder={copy.addPlaceholder}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="bg-rose-600 text-white hover:bg-rose-500" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <MessageSquarePlus className="mr-2 size-4" />}
              {copy.addButton}
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="size-4 animate-spin" />
            {copy.loading}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-slate-600">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-slate-900">{note.message}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
