import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/member-avatar";
import { MemberPicker } from "@/components/team/member-picker";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Plus, Pencil, Building2, X, Trash2 } from "lucide-react";
import { useListDirectReports } from "@workspace/api-client-react";
import { useMeetingOrgOptions } from "@/lib/meeting-orgs";

// Sentinel value used by the Organization Select to mean "no organization
// set". Radix Select can't bind to an empty string, so we round-trip this
// constant through the picker and translate it to `null` on save.
const NO_ORG = "__none__";

type Series = {
  id: number;
  name: string;
  organization: string | null;
  members: string[];
  memberIds: number[];
};

type Agenda = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

export function MeetingsSeriesDetail() {
  const params = useParams<{ id: string }>();
  const seriesId = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState<string>(NO_ORG);
  const [editMemberIds, setEditMemberIds] = useState<number[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const { options: orgOptions } = useMeetingOrgOptions();

  const { data: series } = useQuery<Series>({
    queryKey: [`/api/meeting-series/${seriesId}`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: allMembers } = useListDirectReports();
  const memberById = useMemo(() => {
    const m = new Map<number, { id: number; name: string }>();
    for (const r of allMembers ?? []) m.set(r.id, { id: r.id, name: r.name });
    return m;
  }, [allMembers]);

  // Seed the dialog from server state when it opens or series changes.
  useEffect(() => {
    if (!editOpen || !series) return;
    setEditName(series.name);
    setEditOrg(series.organization && series.organization.length > 0
      ? series.organization
      : NO_ORG);
    setEditMemberIds(series.memberIds ?? []);
    setEditError(null);
  }, [editOpen, series]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          // Send `null` to clear the organization (server treats null as
          // "remove location"); send the trimmed string otherwise.
          organization: editOrg === NO_ORG ? null : editOrg,
          memberIds: editMemberIds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-series/${seriesId}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-series"] });
      setEditOpen(false);
    },
    onError: (e: Error) => setEditError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to delete series");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-series"] });
      setLocation("/meetings/leadership");
    },
    onError: (e: Error) => window.alert(e.message),
  });

  function handleDeleteSeries(): void {
    if (!series) return;
    const ok = window.confirm(
      `Delete "${series.name}"? This removes the series and its agendas. This cannot be undone.`,
    );
    if (!ok) return;
    deleteMutation.mutate();
  }

  function addEditMember(id: number | null): void {
    if (id === null) return;
    if (editMemberIds.includes(id)) return;
    setEditMemberIds([...editMemberIds, id]);
  }
  function removeEditMember(id: number): void {
    setEditMemberIds(editMemberIds.filter((x) => x !== id));
  }

  const { data: agendas = [] } = useQuery<Agenda[]>({
    queryKey: [`/api/meeting-series/${seriesId}/agendas`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}/agendas`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const newAgendaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}/agendas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Agenda>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-series/${seriesId}/agendas`],
      });
      setLocation(`/meetings/leadership/agendas/${created.id}`);
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/meetings/leadership"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        Leadership Meeting Series
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {series?.name ?? "Loading…"}
          </h1>
          {series?.organization && (
            <Badge variant="secondary" className="font-normal">
              <Building2 className="w-3 h-3 mr-1" />
              {series.organization}
            </Badge>
          )}
          <div className="flex -space-x-2">
            {(series?.members ?? []).map((m, i) => (
              <MemberAvatar
                key={i}
                name={m}
                className="w-8 h-8 border-2 border-background"
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(true)} disabled={!series}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Series
          </Button>
          <Button onClick={() => newAgendaMutation.mutate()} disabled={newAgendaMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            New Agenda
          </Button>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="series-name">Name</Label>
              <Input
                id="series-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Weekly Growth Meeting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="series-org">Location</Label>
              <Select
                value={editOrg}
                onValueChange={(v) => setEditOrg(v)}
              >
                <SelectTrigger
                  id="series-org"
                  data-testid="series-org-trigger"
                >
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ORG}>Unassigned</SelectItem>
                  {orgOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                  {/* If the current org isn't one of the canonical options
                      (e.g. legacy / renamed), still show it so the user
                      can see and keep it. */}
                  {editOrg !== NO_ORG &&
                    !orgOptions.some((o) => o.value === editOrg) && (
                      <SelectItem value={editOrg}>{editOrg}</SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roster</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MemberPicker
                  value={null}
                  onChange={(id) => addEditMember(id)}
                  allowCreate
                  placeholder="Add a team member"
                />
                <div className="border rounded-md p-3 min-h-[120px] space-y-2">
                  {editMemberIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No members. Use the picker to add people.
                    </p>
                  ) : (
                    editMemberIds.map((id) => {
                      const m = memberById.get(id);
                      const label = m?.name ?? `Member #${id}`;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MemberAvatar name={label} className="w-7 h-7" />
                            <span className="text-sm truncate">{label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditMember(id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${label}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDeleteSeries}
              disabled={!series || deleteMutation.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Delete series"
              title="Delete series"
              data-testid="delete-series-button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={!editName.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="grid grid-cols-[1fr_180px_180px] gap-4 px-5 py-3 border-b font-semibold text-sm">
          <div>Agenda Name</div>
          <div>Date Created</div>
          <div>Last Updated</div>
        </div>
        {agendas.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No agendas yet. Click <strong>New Agenda</strong> to create one.
          </div>
        ) : (
          <div className="divide-y">
            {agendas.map((a) => (
              <Link
                key={a.id}
                href={`/meetings/leadership/agendas/${a.id}`}
                className="grid grid-cols-[1fr_180px_180px] gap-4 px-5 py-4 hover:bg-muted/40 transition-colors text-sm"
              >
                <div className="font-medium text-primary">{a.name}</div>
                <div className="text-muted-foreground">{fmtDate(a.createdAt)}</div>
                <div className="text-muted-foreground">{fmtDate(a.updatedAt)}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
