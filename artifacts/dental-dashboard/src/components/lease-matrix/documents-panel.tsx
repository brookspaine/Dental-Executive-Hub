import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLeaseDocuments,
  getListLeaseDocumentsQueryKey,
  createLeaseDocument,
  deleteLeaseDocument,
} from "@workspace/api-client-react";
import type { LeaseDocument } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Download, FileText, Loader2 } from "lucide-react";

const DOC_TYPES = [
  "Signed Lease",
  "LOI",
  "Amendment",
  "Exhibit",
  "Side Letter",
  "Guaranty",
  "Signage Approval",
  "Exclusive Recording",
  "Other",
] as const;

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function objectPathToHref(objectPath: string): string {
  if (objectPath.startsWith("/objects/")) {
    return `/api/storage${objectPath}`;
  }
  return objectPath;
}

interface PendingUpload {
  objectPath: string;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  type: (typeof DOC_TYPES)[number];
  label: string;
}

export function DocumentsPanel({
  open,
  onOpenChange,
  leaseRecordId,
  locationName,
  readOnly,
  uploadedByName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseRecordId: number;
  locationName: string;
  readOnly: boolean;
  uploadedByName?: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingUpload | null>(null);

  const docsQuery = useQuery({
    queryKey: getListLeaseDocumentsQueryKey(leaseRecordId),
    queryFn: () => listLeaseDocuments(leaseRecordId),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (input: PendingUpload) =>
      createLeaseDocument(leaseRecordId, {
        type: input.type,
        label: input.label,
        objectPath: input.objectPath,
        fileName: input.fileName,
        fileSize: input.fileSize,
        contentType: input.contentType,
        uploadedByName: uploadedByName ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListLeaseDocumentsQueryKey(leaseRecordId),
      });
      // Also invalidate the parent matrix list so the badge count
      // showing the number of attached files updates immediately.
      queryClient.invalidateQueries({
        queryKey: ["lease-records-document-counts"],
      });
      setPending(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not save document",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => deleteLeaseDocument(leaseRecordId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListLeaseDocumentsQueryKey(leaseRecordId),
      });
      queryClient.invalidateQueries({
        queryKey: ["lease-records-document-counts"],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not remove document",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const docs: LeaseDocument[] = docsQuery.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Documents — {locationName}</SheetTitle>
          <SheetDescription>
            Lease, LOI, amendments, exhibits, side letters, guaranty
            documents, signage approvals, exclusive recordings.
          </SheetDescription>
        </SheetHeader>

        {!readOnly && (
          <div className="mt-4 border border-slate-200 rounded-lg p-3 space-y-3 bg-slate-50">
            {pending ? (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="truncate font-medium">
                    {pending.fileName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatBytes(pending.fileSize)}
                  </span>
                </div>
                <div>
                  <Label
                    htmlFor="doc-type"
                    className="text-xs text-slate-600"
                  >
                    Type
                  </Label>
                  <Select
                    value={pending.type}
                    onValueChange={(v) =>
                      setPending({
                        ...pending,
                        type: v as PendingUpload["type"],
                      })
                    }
                  >
                    <SelectTrigger
                      id="doc-type"
                      className="h-8 text-sm bg-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="doc-label"
                    className="text-xs text-slate-600"
                  >
                    Label
                  </Label>
                  <Input
                    id="doc-label"
                    value={pending.label}
                    onChange={(e) =>
                      setPending({ ...pending, label: e.target.value })
                    }
                    placeholder="Short description"
                    className="h-8 text-sm bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending(null)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createMutation.mutate(pending)}
                    disabled={
                      !pending.label.trim() || createMutation.isPending
                    }
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Save document"
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <SimpleFileButton
                disabled={createMutation.isPending}
                onPicked={(picked) => {
                  setPending({
                    objectPath: picked.objectPath,
                    fileName: picked.fileName,
                    fileSize: picked.fileSize,
                    contentType: picked.contentType,
                    type: "Signed Lease",
                    label: picked.fileName.replace(/\.[^.]+$/, ""),
                  });
                }}
              />
            )}
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto space-y-2">
          {docsQuery.isLoading ? (
            <div className="text-sm text-slate-500 p-2">Loading…</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-slate-400 italic p-2">
              No documents yet.
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                className="border border-slate-200 rounded-md p-2.5 flex items-start gap-2 bg-white"
              >
                <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {doc.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {doc.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {doc.fileName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatBytes(doc.fileSize)} ·{" "}
                    {formatUploadedAt(doc.uploadedAt)}
                    {doc.uploadedByName ? ` · ${doc.uploadedByName}` : ""}
                  </div>
                </div>
                <a
                  href={objectPathToHref(doc.objectPath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-[#0F2A47] rounded hover:bg-slate-100"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove "${doc.label}" from this lease record?`,
                        )
                      ) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Minimal file picker that uses the same /api/storage presigned-PUT flow
 * as the rest of the app. Returns the resulting objectPath + file
 * metadata so the caller can prompt for type / label before persisting.
 */
function SimpleFileButton({
  disabled,
  onPicked,
}: {
  disabled?: boolean;
  onPicked: (picked: {
    objectPath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }) => void;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onError: (err) =>
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      }),
  });

  return (
    <label
      className={`flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-md py-4 text-sm text-slate-600 cursor-pointer hover:border-[#0F2A47] hover:bg-white transition-colors ${
        disabled || isUploading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {isUploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading…
        </>
      ) : (
        <>
          <FileText className="h-4 w-4" />
          Click to upload a document
        </>
      )}
      <input
        type="file"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Reset so the same file can be picked twice in a row.
          e.currentTarget.value = "";
          if (!file) return;
          const result = await uploadFile(file);
          if (!result) return;
          onPicked({
            objectPath: result.objectPath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type || "application/octet-stream",
          });
        }}
      />
    </label>
  );
}
