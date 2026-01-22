import { useEffect, useState } from "react";
import {
  Image,
  Loader2,
  Plus,
  Star,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";

interface MediaAsset {
  id: string;
  title: string | null;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  is_active: boolean;
  is_default: boolean;
  asset_type: string;
  created_at: string;
}

interface FlyerManagerProps {
  businessId: string;
  lang: "en" | "es";
}

export function FlyerManager({ businessId, lang }: FlyerManagerProps) {
  const isEs = lang === "es";
  const [flyers, setFlyers] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [flyerTitle, setFlyerTitle] = useState("");

  const copy = isEs
    ? {
        title: "Flyers de Servicios",
        desc: "Sube imágenes para enviar automáticamente cuando los clientes pregunten por servicios o precios",
        upload: "Subir Flyer",
        uploading: "Subiendo...",
        noFlyers: "No hay flyers subidos aún",
        default: "Principal",
        setDefault: "Hacer Principal",
        active: "Activo",
        inactive: "Inactivo",
        delete: "Eliminar",
        preview: "Vista Previa",
        titleLabel: "Título del Flyer",
        titlePlaceholder: "Ej: Menú de Servicios",
        cooldown: "Enfriamiento entre envíos",
        hours: "horas",
        cooldownDesc: "Tiempo mínimo entre envíos del mismo flyer por conversación",
      }
    : {
        title: "Service Flyers",
        desc: "Upload images to automatically send when customers ask about services or pricing",
        upload: "Upload Flyer",
        uploading: "Uploading...",
        noFlyers: "No flyers uploaded yet",
        default: "Default",
        setDefault: "Set as Default",
        active: "Active",
        inactive: "Inactive",
        delete: "Delete",
        preview: "Preview",
        titleLabel: "Flyer Title",
        titlePlaceholder: "E.g., Service Menu",
        cooldown: "Send Cooldown",
        hours: "hours",
        cooldownDesc: "Minimum time between sending same flyer per conversation",
      };

  useEffect(() => {
    loadFlyers();
  }, [businessId]);

  const loadFlyers = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("media_assets")
      .select("*")
      .eq("business_id", businessId)
      .eq("asset_type", "services_flyer")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setFlyers(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError(isEs ? "Tipo de archivo no válido. Use PNG, JPG o PDF." : "Invalid file type. Use PNG, JPG, or PDF.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload to storage
      const fileName = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("flyers")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("flyers")
        .getPublicUrl(fileName);

      // Check if this is the first flyer (make it default)
      const isFirst = flyers.length === 0;

      // Insert media asset record
      const { error: insertError } = await supabase.from("media_assets").insert({
        business_id: businessId,
        asset_type: "services_flyer",
        title: flyerTitle.trim() || file.name,
        file_url: urlData.publicUrl,
        file_name: file.name,
        mime_type: file.type,
        is_active: true,
        is_default: isFirst,
      });

      if (insertError) throw insertError;

      setFlyerTitle("");
      await loadFlyers();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }

    setUploading(false);
    // Reset file input
    event.target.value = "";
  };

  const toggleActive = async (flyer: MediaAsset) => {
    await supabase
      .from("media_assets")
      .update({ is_active: !flyer.is_active })
      .eq("id", flyer.id);
    await loadFlyers();
  };

  const setAsDefault = async (flyer: MediaAsset) => {
    // Remove default from all other flyers
    await supabase
      .from("media_assets")
      .update({ is_default: false })
      .eq("business_id", businessId)
      .eq("asset_type", "services_flyer");

    // Set this one as default
    await supabase
      .from("media_assets")
      .update({ is_default: true, is_active: true })
      .eq("id", flyer.id);

    await loadFlyers();
  };

  const deleteFlyer = async (flyer: MediaAsset) => {
    if (!confirm(isEs ? "¿Eliminar este flyer?" : "Delete this flyer?")) return;

    // Delete from storage
    try {
      const path = flyer.file_url.split("/flyers/")[1];
      if (path) {
        await supabase.storage.from("flyers").remove([path]);
      }
    } catch {
      // Continue even if storage delete fails
    }

    // Delete record
    await supabase.from("media_assets").delete().eq("id", flyer.id);
    await loadFlyers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Image className="h-4 w-4 text-accent" />
            {copy.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">{copy.desc}</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {copy.titleLabel}
          </label>
          <input
            type="text"
            className="w-48 rounded-lg border bg-background px-3 py-2 text-sm"
            placeholder={copy.titlePlaceholder}
            value={flyerTitle}
            onChange={(e) => setFlyerTitle(e.target.value)}
          />
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button asChild disabled={uploading}>
            <span>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? copy.uploading : copy.upload}
            </span>
          </Button>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Flyer List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : flyers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{copy.noFlyers}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flyers.map((flyer) => (
            <div
              key={flyer.id}
              className={`relative rounded-xl border p-3 transition-all ${
                flyer.is_default ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              {/* Preview Image */}
              {flyer.mime_type?.startsWith("image/") ? (
                <div
                  className="h-32 w-full rounded-lg bg-muted/50 bg-cover bg-center cursor-pointer"
                  style={{ backgroundImage: `url(${flyer.file_url})` }}
                  onClick={() => setPreviewUrl(flyer.file_url)}
                />
              ) : (
                <div className="h-32 w-full rounded-lg bg-muted/50 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">PDF</span>
                </div>
              )}

              {/* Info */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{flyer.title || flyer.file_name}</p>
                  {flyer.is_default && (
                    <Badge className="bg-accent text-white shrink-0">
                      <Star className="h-3 w-3 mr-1" />
                      {copy.default}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(flyer)}
                    className={flyer.is_active ? "text-emerald-600" : "text-muted-foreground"}
                  >
                    {flyer.is_active ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {flyer.is_active ? copy.active : copy.inactive}
                  </Button>

                  {!flyer.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsDefault(flyer)}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      {copy.setDefault}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewUrl(flyer.file_url)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {copy.preview}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFlyer(flyer)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={previewUrl}
              alt="Flyer preview"
              className="max-w-full max-h-[80vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
