import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateOrgChartSeat,
  getListOrgChartSeatsQueryKey,
  getGetOrgChartSeatQueryKey,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_BYTES = 10 * 1024 * 1024;

export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "vacant")}`;
}

export function resolvePhotoUrl(seat: {
  name?: string | null;
  photoUrl?: string | null;
  title?: string;
}): string {
  if (seat.photoUrl && seat.photoUrl.trim()) {
    const u = seat.photoUrl.trim();
    if (u.startsWith("/objects/")) return `/api/storage${u}`;
    return u;
  }
  return dicebearUrl(seat.name?.trim() || seat.title || "vacant");
}

type EditablePhotoSeat = {
  id: number;
  organizationId: number;
  title: string;
  name?: string | null;
  photoUrl?: string | null;
};

export function EditablePhoto({
  seat,
  size = "md",
  className = "",
  ariaLabel,
}: {
  seat: EditablePhotoSeat;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
}) {
  const sizeClass = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-14 w-14",
  }[size];
  const iconSize = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  const [open, setOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) setPendingPath(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: (photoUrl: string | null) =>
      updateOrgChartSeat(seat.id, { photoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListOrgChartSeatsQueryKey(seat.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: getGetOrgChartSeatQueryKey(seat.id),
      });
      setOpen(false);
      setPendingPath(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not update photo",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      setPendingPath(response.objectPath);
    },
    onError: (err) => {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please choose a JPG, PNG, GIF, or WebP file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "Image too large",
        description: "Please choose an image under 10 MB.",
        variant: "destructive",
      });
      return;
    }
    await uploadFile(file);
  };

  const previewSeat = pendingPath
    ? { ...seat, photoUrl: pendingPath }
    : seat;
  const previewUrl = resolvePhotoUrl(previewSeat);
  const currentUrl = resolvePhotoUrl(seat);

  const busy = isUploading || mutation.isPending;

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel ?? `Edit photo for ${seat.name ?? seat.title}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`group relative shrink-0 rounded-full overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/40 transition ${sizeClass} ${className}`}
      >
        <img
          src={currentUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <span
          className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white"
          aria-hidden
        >
          <Camera className={iconSize} />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              Photo for {seat.name?.trim() || seat.title}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-muted border">
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                className="hidden"
                onChange={onFilePicked}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <Upload className="h-4 w-4 mr-2" />
                {pendingPath ? "Choose a different photo" : "Choose photo"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG, GIF, or WebP — up to 10 MB.
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => mutation.mutate(null)}
              disabled={busy || !seat.photoUrl}
              title="Use the auto-generated avatar"
            >
              Reset to default
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={() => pendingPath && mutation.mutate(pendingPath)}
                disabled={busy || !pendingPath}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save photo"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
