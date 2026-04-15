import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Trash2, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";

const typeIcons: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  urgent: AlertCircle,
};

const typeColors: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export function Announcements() {
  const queryClient = useQueryClient();
  const { data: announcements, isLoading } = useListAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "urgent">("info");

  const handleSubmit = () => {
    if (!title.trim() || content == null) return;
    createAnnouncement.mutate(
      { data: { title: title.trim(), content, type } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          setDialogOpen(false);
          setTitle("");
          setContent("");
          setType("info");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteAnnouncement.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Keep your team informed with important updates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="mt-2">
                Post Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : announcements && announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((a) => {
            const Icon = typeIcons[a.type] || Info;
            return (
              <Card key={a.id} className={`border ${typeColors[a.type] || ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{a.title}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          {a.type}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-80">{a.content}</p>
                      <p className="text-xs opacity-60 mt-2">
                        {new Date(a.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded hover:bg-black/10 opacity-50 hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first announcement to keep your team informed
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
