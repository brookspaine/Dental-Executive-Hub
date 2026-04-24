import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateDirectReport,
  getListDirectReportsQueryKey,
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

export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url || !url.trim()) return null;
  const u = url.trim();
  if (u.startsWith("/objects/")) return `/api/storage${u}`;
  return u;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type EditableReport = {
  id: number;
  name: string;
  avatarUrl?: string | null;
};

export function EditableReportPhoto({
  report,
  size = "md",
  className = "",
  ariaLabel,
  stopPropagation = true,
}: {
  report: EditableReport;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ariaLabel?: string;
  stopPropagation?: boolean;
}) {
  const sizeClass = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-14 w-14 text-base",
    xl: "h-24 w-24 text-2xl",
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
    mutationFn: (avatarUrl: string | null) =>
      updateDirectReport(report.id, { avatarUrl } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListDirectReportsQueryKey(),
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

  const previewUrl = resolveAvatarUrl(pendingPath ?? report.avatarUrl);
  const currentUrl = resolveAvatarUrl(report.avatarUrl);
  const busy = isUploading || mutation.isPending;
  const initials = getInitials(report.name);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel ?? `Edit photo for ${report.name}`}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen(true);
        }}
        className={`group relative shrink-0 rounded-full overflow-hidden border bg-primary/10 hover:ring-2 hover:ring-primary/40 transition ${sizeClass} ${className}`}
      >
        {currentUrl ? (
          <img
            src={currentUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-semibold text-primary">
            {initials}
          </span>
        )}
        <span
          className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/40 text-white"
          aria-hidden
        >
          <Camera className="h-4 w-4" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Photo for {report.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-primary/10 border">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary">
                    {initials}
                  </div>
                )}
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
              disabled={busy || !report.avatarUrl}
              title="Remove the uploaded photo"
            >
              Remove photo
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
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
