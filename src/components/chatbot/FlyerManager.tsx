import { useEffect, useState } from "react";
import {
  Image,
  Loader2,
  Star,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  Eye,
  X,
  FileText,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";

type FlyerType = "menu" | "price_list" | "services_flyer";

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

const FLYER_TYPES: { value: FlyerType; labelEn: string; labelEs: string; icon: typeof FileText }[] = [
  { value: "services_flyer", labelEn: "Services", labelEs: "Servicios", icon: Briefcase },
  { value: "price_list", labelEn: "Price List", labelEs: "Lista de Precios", icon: DollarSign },
  { value: "menu", labelEn: "Menu", labelEs: "Menú", icon: FileText },
];

export function FlyerManager({ businessId, lang }: FlyerManagerProps) {
  const isEs = lang === "es";
  const [flyers, setFlyers] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [flyerTitle, setFlyerTitle] = useState("");
  const [selectedType, setSelectedType] = useState<FlyerType>("services_flyer");
  const [filterType, setFilterType] = useState<FlyerType | "all">("all");

  const copy = isEs
    ? {
        title: "Gestión de Flyers",
        desc: "Sube imágenes categorizadas para enviar automáticamente según el tipo de consulta del cliente",
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
        typeLabel: "Tipo de Flyer",
        filterAll: "Todos",
        typeTriggers: {
          menu: "Se activa con: menú, comida, plato, desayuno...",
          price_list: "Se activa con: precio, costo, cuánto cuesta...",
          services_flyer: "Se activa con: servicios, paquetes, qué ofrecen...",
        },
      }
    : {
        title: "Flyer Management",
        desc: "Upload categorized images to automatically send based on customer inquiry type",
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
        typeLabel: "Flyer Type",
        filterAll: "All",
        typeTriggers: {
          menu: "Triggers on: menu, food, dish, breakfast...",
          price_list: "Triggers on: price, cost, how much...",
          services_flyer: "Triggers on: services, packages, offerings...",
        },
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
      .in("asset_type", ["services_flyer", "price_list", "menu"])
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

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError(isEs ? "Tipo de archivo no válido. Use PNG, JPG o PDF." : "Invalid file type. Use PNG, JPG, or PDF.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileName = `${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("flyers")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("flyers")
        .getPublicUrl(fileName);

      // Check if this is the first flyer of this type
      const existingOfType = flyers.filter((f) => f.asset_type === selectedType);
      const isFirstOfType = existingOfType.length === 0;

      const { error: insertError } = await supabase.from("media_assets").insert({
        business_id: businessId,
        asset_type: selectedType,
        title: flyerTitle.trim() || file.name,
        file_url: urlData.publicUrl,
        file_name: file.name,
        mime_type: file.type,
        is_active: true,
        is_default: isFirstOfType,
      });

      if (insertError) throw insertError;

      setFlyerTitle("");
      await loadFlyers();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }

    setUploading(false);
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
    // Remove default from all other flyers of same type
    await supabase
      .from("media_assets")
      .update({ is_default: false })
      .eq("business_id", businessId)
      .eq("asset_type", flyer.asset_type);

    await supabase
      .from("media_assets")
      .update({ is_default: true, is_active: true })
      .eq("id", flyer.id);

    await loadFlyers();
  };

  const deleteFlyer = async (flyer: MediaAsset) => {
    if (!confirm(isEs ? "¿Eliminar este flyer?" : "Delete this flyer?")) return;

    try {
      const path = flyer.file_url.split("/flyers/")[1];
      if (path) {
        await supabase.storage.from("flyers").remove([path]);
      }
    } catch {
      // Continue even if storage delete fails
    }

    await supabase.from("media_assets").delete().eq("id", flyer.id);
    await loadFlyers();
  };

  const getTypeLabel = (type: string) => {
    const found = FLYER_TYPES.find((t) => t.value === type);
    return found ? (isEs ? found.labelEs : found.labelEn) : type;
  };

  const getTypeIcon = (type: string) => {
    const found = FLYER_TYPES.find((t) => t.value === type);
    return found?.icon || FileText;
  };

  const filteredFlyers = filterType === "all" 
    ? flyers 
    : flyers.filter((f) => f.asset_type === filterType);

  const flyerCounts = FLYER_TYPES.reduce((acc, type) => {
    acc[type.value] = flyers.filter((f) => f.asset_type === type.value).length;
    return acc;
  }, {} as Record<FlyerType, number>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h4 className="font-medium flex items-center gap-2">
          <Image className="h-4 w-4 text-accent" />
          {copy.title}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">{copy.desc}</p>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Flyer Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.typeLabel}
            </label>
            <div className="flex gap-1">
              {FLYER_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "bg-background border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {isEs ? type.labelEs : type.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trigger hint */}
        <p className="text-xs text-muted-foreground italic">
          {copy.typeTriggers[selectedType]}
        </p>

        <div className="flex flex-wrap items-end gap-3">
          {/* Title Input */}
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground">
              {copy.titleLabel}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              placeholder={copy.titlePlaceholder}
              value={flyerTitle}
              onChange={(e) => setFlyerTitle(e.target.value)}
            />
          </div>

          {/* Upload Button */}
          <label className="cursor-pointer shrink-0">
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
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            filterType === "all"
              ? "bg-accent text-accent-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {copy.filterAll} ({flyers.length})
        </button>
        {FLYER_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => setFilterType(type.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterType === type.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Icon className="h-3 w-3" />
              {isEs ? type.labelEs : type.labelEn} ({flyerCounts[type.value]})
            </button>
          );
        })}
      </div>

      {/* Flyer List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      ) : filteredFlyers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{copy.noFlyers}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFlyers.map((flyer) => {
            const TypeIcon = getTypeIcon(flyer.asset_type);
            return (
              <div
                key={flyer.id}
                className={`relative rounded-xl border p-3 transition-all ${
                  flyer.is_default ? "border-accent bg-accent/5" : "border-border"
                }`}
              >
                {/* Type Badge */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <TypeIcon className="h-3 w-3" />
                    {getTypeLabel(flyer.asset_type)}
                  </Badge>
                </div>

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
                      <Badge className="bg-accent text-accent-foreground shrink-0">
                        <Star className="h-3 w-3 mr-1" />
                        {copy.default}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-wrap">
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
            );
          })}
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
