import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateOrgChartSeat,
  getListOrgChartSeatsQueryKey,
  getGetOrgChartSeatQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "vacant")}`;
}

export function resolvePhotoUrl(seat: {
  name?: string | null;
  photoUrl?: string | null;
  title?: string;
}): string {
  if (seat.photoUrl && seat.photoUrl.trim()) return seat.photoUrl.trim();
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
  const [value, setValue] = useState(seat.photoUrl ?? "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (open) setValue(seat.photoUrl ?? "");
  }, [open, seat.photoUrl]);

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
    },
    onError: (err: any) => {
      toast({
        title: "Could not update photo",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const previewUrl =
    value.trim() ||
    dicebearUrl(seat.name?.trim() || seat.title || "vacant");

  const currentUrl = resolvePhotoUrl(seat);

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
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt=""
                className="h-24 w-24 rounded-full object-cover bg-muted border"
              />
            </div>
            <div className="grid gap-2">
              <Label>Photo URL</Label>
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Paste a photo URL — leave blank for an auto-generated avatar"
              />
              <p className="text-xs text-muted-foreground">
                Tip: right-click any image online and copy its address.
              </p>
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending || !seat.photoUrl}
              title="Use the auto-generated avatar"
            >
              Reset to default
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  mutation.mutate(value.trim() ? value.trim() : null)
                }
                disabled={mutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
