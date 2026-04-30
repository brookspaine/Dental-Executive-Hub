import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetLeaseToolkit,
  updateLeaseToolkit,
  getGetLeaseToolkitQueryKey,
} from "@workspace/api-client-react";
import type { LeaseToolkitDoc } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Save, X, Loader2 } from "lucide-react";

/**
 * Editable, single-document "Lease Toolkit" panel rendered as a tab on
 * the EDGE Organizations page next to the Lease Matrix. Loads the
 * server-side singleton document, lets the user toggle into an edit
 * mode (textarea), and PUTs back on save. Whitespace and newlines are
 * preserved in read mode so pasted Word-document text continues to look
 * the same after saving.
 */
export default function LeaseToolkit() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetLeaseToolkit();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Sync the local draft whenever the server doc loads or changes (e.g.
  // after a save invalidates the query). We only sync while NOT editing
  // so an in-flight edit isn't blown away by a refetch.
  useEffect(() => {
    if (!isEditing && data?.content !== undefined) {
      setDraft(data.content);
    }
  }, [data?.content, isEditing]);

  const saveMutation = useMutation<LeaseToolkitDoc, Error, string>({
    mutationFn: (content) => updateLeaseToolkit({ content }),
    onSuccess: (saved) => {
      queryClient.setQueryData(getGetLeaseToolkitQueryKey(), saved);
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setDraft(data?.content ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(data?.content ?? "");
    setIsEditing(false);
  };

  const handleSave = () => {
    saveMutation.mutate(draft);
  };

  const updatedAtLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-4" data-testid="lease-toolkit">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Lease Toolkit</h2>
          {updatedAtLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated {updatedAtLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={saveMutation.isPending}
                data-testid="lease-toolkit-cancel"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="lease-toolkit-save"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEdit}
              disabled={isLoading || isError}
              data-testid="lease-toolkit-edit"
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading toolkit…
            </div>
          ) : isError ? (
            <div className="text-sm text-destructive">
              Failed to load the toolkit. Please refresh.
            </div>
          ) : isEditing ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[420px] font-mono text-sm"
              placeholder="Paste your toolkit content here…"
              data-testid="lease-toolkit-textarea"
            />
          ) : data?.content?.trim() ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert
                prose-headings:font-semibold prose-h1:text-2xl prose-h1:mt-0
                prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1
                prose-p:my-2 prose-li:my-0.5 prose-ol:my-2 prose-ul:my-2
                prose-blockquote:border-l-4 prose-blockquote:border-muted
                prose-blockquote:pl-4 prose-blockquote:italic
                prose-blockquote:text-muted-foreground
                prose-strong:text-foreground"
              data-testid="lease-toolkit-content"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div
              className="text-sm text-muted-foreground"
              data-testid="lease-toolkit-content"
            >
              No content yet. Click Edit to add your Lease Toolkit.
            </div>
          )}
          {saveMutation.isError && (
            <p className="text-xs text-destructive mt-3">
              Failed to save: {saveMutation.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
