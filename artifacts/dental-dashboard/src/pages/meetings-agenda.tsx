import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MemberAvatar } from "@/components/member-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Lock, Trash2, Check } from "lucide-react";

const SECTIONS = [
  {
    key: "iceBreaker",
    label: "Segue",
    description:
      "Kick things off with a quick, fun question or activity to get everyone talking. It's a simple way to start the meeting on a positive note and build team connection.",
    type: "notes" as const,
  },
  {
    key: "winsShoutouts",
    label: "Wins and Shoutouts",
    description:
      "Celebrate recent wins and recognize team members who went above and beyond.",
    type: "notes" as const,
  },
  {
    key: "foundationalPrinciples",
    label: "Foundational Principles",
    description:
      "Reaffirm the team's core operating principles and discuss how they're showing up in the work this week.",
    type: "notes" as const,
  },
  {
    key: "desiredFuture",
    label: "Desired Future",
    description:
      "Check progress against your long-term Desired Future goal and current pace.",
    type: "notes" as const,
  },
  {
    key: "scoreCard",
    label: "Scorecard",
    description:
      "Review the key metrics that tell you whether the business is healthy this week.",
    type: "notes" as const,
  },
  {
    key: "closeTheLoop",
    label: "Open Loops",
    description:
      "Revisit open items and key topics from last week to confirm completion or carry them forward.",
    type: "notes" as const,
  },
  {
    key: "keyTopics",
    label: "Key Topics",
    description:
      "Surface and work through the most important issues facing the team.",
    type: "keyTopics" as const,
  },
  {
    key: "actionItems",
    label: "To-Do List",
    description: "Capture the commitments coming out of this meeting.",
    type: "actionItems" as const,
  },
];

type Agenda = {
  id: number;
  seriesId: number;
  name: string;
  sectionData: Record<string, string>;
};

type KeyTopic = {
  id: number;
  agendaId: number;
  coreIssue: string;
  owner: string | null;
  notes: string | null;
  resolved: boolean;
};

type ActionItem = {
  source: "meeting" | "seatTask";
  id: number;
  item: string;
  owner: string | null;
  dueDate: string | null;
  isDailyTop3: boolean;
  notes: string | null;
  completed: boolean;
  seatTitle: string | null;
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

export function MeetingsAgenda() {
  const params = useParams<{ id: string }>();
  const agendaId = Number(params.id);
  const [section, setSection] = useState<string>("iceBreaker");

  const { data: agenda } = useQuery<Agenda>({
    queryKey: [`/api/meeting-agendas/${agendaId}`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const current = SECTIONS.find((s) => s.key === section)!;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link
        href={
          agenda
            ? `/meetings/leadership/series/${agenda.seriesId}`
            : "/meetings/leadership"
        }
        className="inline-flex items-center gap-1 text-2xl font-bold hover:text-primary transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
        {agenda?.name ?? "Weekly Agenda"}
      </Link>

      <Select value={section} onValueChange={setSection}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SECTIONS.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {current.type === "notes" && agenda && (
        <NotesSection
          agendaId={agendaId}
          sectionKey={current.key}
          label={current.label}
          description={current.description}
          initialValue={agenda.sectionData?.[current.key] ?? ""}
        />
      )}

      {current.type === "keyTopics" && (
        <KeyTopicsSection agendaId={agendaId} />
      )}

      {current.type === "actionItems" && (
        <ActionItemsSection agendaId={agendaId} />
      )}
    </div>
  );
}

function NotesSection({
  agendaId,
  sectionKey,
  label,
  description,
  initialValue,
}: {
  agendaId: number;
  sectionKey: string;
  label: string;
  description: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, sectionKey]);

  function scheduleSave(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await fetch(`/api/meeting-agendas/${agendaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionData: { [sectionKey]: next } }),
      });
      queryClient.setQueriesData<Agenda>(
        { queryKey: [`/api/meeting-agendas/${agendaId}`] },
        (old) =>
          old
            ? {
                ...old,
                sectionData: { ...old.sectionData, [sectionKey]: next },
              }
            : old
      );
      setSavedAt(Date.now());
    }, 800);
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-lg font-bold">{label}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div>
          <label className="text-sm font-semibold block mb-2">Notes</label>
          <Textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              scheduleSave(e.target.value);
            }}
            rows={8}
            placeholder="Type notes here…"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          {savedAt ? "Saved" : "Changes Saved Automatically"}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyTopicsSection({ agendaId }: { agendaId: number }) {
  const [open, setOpen] = useState(false);
  const [coreIssue, setCoreIssue] = useState("");
  const [owner, setOwner] = useState("Brooks Paine");
  const queryClient = useQueryClient();

  const { data: topics = [] } = useQuery<KeyTopic[]>({
    queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/key-topics`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/key-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coreIssue, owner }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
      setCoreIssue("");
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<KeyTopic>;
    }) => {
      const res = await fetch(`/api/meeting-key-topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/meeting-key-topics/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/key-topics`],
      });
    },
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Key Topics</h2>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Key Topic
          </Button>
        </div>
        {topics.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No key topics yet.
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-3 p-3 border rounded-md"
              >
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      id: t.id,
                      patch: { resolved: !t.resolved },
                    })
                  }
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    t.resolved
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                  aria-label="Toggle resolved"
                >
                  {t.resolved && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      t.resolved ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.coreIssue}
                  </div>
                  {t.owner && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <MemberAvatar
                        name={t.owner}
                        className="w-5 h-5"
                        fallbackClassName="text-[10px] bg-primary/15 text-primary"
                      />
                      <span className="text-xs text-muted-foreground">
                        {t.owner}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Key Topic</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Create a New Key Topic.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Core Issue
              </label>
              <Input
                value={coreIssue}
                onChange={(e) => setCoreIssue(e.target.value)}
                placeholder="Enter Key Topic here"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Owner</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!coreIssue.trim() || createMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ActionItemsSection({ agendaId }: { agendaId: number }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState("");
  const [owner, setOwner] = useState("Brooks Paine");
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isDailyTop3, setIsDailyTop3] = useState(false);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery<ActionItem[]>({
    queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-agendas/${agendaId}/action-items`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/meeting-agendas/${agendaId}/action-items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item, owner, dueDate, isDailyTop3, notes }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
      setItem("");
      setNotes("");
      setIsDailyTop3(false);
      setOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      completed,
      source,
    }: {
      id: number;
      completed: boolean;
      source: ActionItem["source"];
    }) => {
      // Phase 4: meeting items are stored in `action_items`, so toggling
      // them goes through the canonical PATCH /api/action-items/:id
      // (which expects `done`, not `completed`). Seat tasks still live
      // in their own table for now.
      const url =
        source === "seatTask"
          ? `/api/seat-tasks/${id}`
          : `/api/action-items/${id}`;
      const body =
        source === "seatTask"
          ? JSON.stringify({ completed, status: completed ? "done" : "todo" })
          : JSON.stringify({ done: completed });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      source,
    }: {
      id: number;
      source: ActionItem["source"];
    }) => {
      if (source === "seatTask") return;
      // Phase 4: meeting items live in `action_items`, so deletes go
      // through the canonical endpoint.
      await fetch(`/api/action-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meeting-agendas/${agendaId}/action-items`],
      });
    },
  });

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Action Items</h2>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary"
            onClick={() => setOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Action Item
          </Button>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No action items yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div
                key={`${a.source}-${a.id}`}
                className="flex items-start gap-3 p-3 border rounded-md"
              >
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      id: a.id,
                      completed: !a.completed,
                      source: a.source,
                    })
                  }
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                    a.completed
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  }`}
                  aria-label="Toggle complete"
                >
                  {a.completed && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      a.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {a.item}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                    {a.owner && (
                      <div className="flex items-center gap-1.5">
                        <MemberAvatar
                          name={a.owner}
                          className="w-5 h-5"
                          fallbackClassName="text-[10px] bg-primary/15 text-primary"
                        />
                        <span>{a.owner}</span>
                      </div>
                    )}
                    {a.dueDate && <span>Due {a.dueDate}</span>}
                    {a.isDailyTop3 && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        Daily Top 3
                      </span>
                    )}
                    {a.source === "seatTask" && (
                      <span
                        className="px-1.5 py-0.5 rounded bg-secondary text-foreground/80 font-medium"
                        title={a.seatTitle ?? undefined}
                      >
                        Org Chart{a.seatTitle ? ` · ${a.seatTitle}` : ""}
                      </span>
                    )}
                  </div>
                  {a.notes && (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                      {a.notes}
                    </div>
                  )}
                </div>
                {a.source === "meeting" ? (
                  <button
                    onClick={() =>
                      deleteMutation.mutate({ id: a.id, source: a.source })
                    }
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Action Item
              </label>
              <Textarea
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Enter Action Item here"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Owner</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={isDailyTop3}
                onCheckedChange={setIsDailyTop3}
                id="daily-top-3"
              />
              <label htmlFor="daily-top-3" className="text-sm">
                Make this Action Item a Daily Top 3
              </label>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">
                Action Item Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-center pt-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!item.trim() || createMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
