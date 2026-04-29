import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberAvatar } from "@/components/member-avatar";
import { MemberPicker } from "@/components/team/member-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, X } from "lucide-react";
import { useMeetingOrgOptions } from "@/lib/meeting-orgs";
import { useListDirectReports } from "@workspace/api-client-react";

export function MeetingsSeriesNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState<string>("");
  const { options: orgOptions } = useMeetingOrgOptions();
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [desiredFuture, setDesiredFuture] = useState(
    "By April 2027 we will implement alignment and accountability strategies, resulting in a 20% revenue growth. [DRAFT]"
  );
  const [status, setStatus] = useState("on-pace");

  const { data: allMembers } = useListDirectReports();
  const memberById = useMemo(() => {
    const m = new Map<number, { id: number; name: string }>();
    for (const r of allMembers ?? []) m.set(r.id, { id: r.id, name: r.name });
    return m;
  }, [allMembers]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // The server prefers `memberIds` when present and writes the join
      // table; the legacy `members` jsonb is derived from it, so we no
      // longer send a parallel string list.
      const res = await fetch("/api/meeting-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          organization: organization || null,
          memberIds,
          desiredFuture,
          desiredFutureStatus: status,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json() as Promise<{ id: number }>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-series"] });
      setLocation(`/meetings/leadership/series/${created.id}`);
    },
  });

  function addMember(id: number | null): void {
    if (id === null) return;
    if (memberIds.includes(id)) return;
    setMemberIds([...memberIds, id]);
  }

  function removeMember(id: number): void {
    setMemberIds(memberIds.filter((x) => x !== id));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link
        href="/meetings/leadership"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        Leadership Meeting Series
      </Link>

      <Card>
        <CardContent className="p-6 space-y-8">
          <h2 className="text-xl font-bold">Create New Leadership Meeting Series</h2>

          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-primary font-semibold shrink-0">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-primary">Give it a name.</h3>
              <p className="text-sm text-muted-foreground">
                A series is a recurring meeting that happens with the same group of people.
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weekly Growth Meeting"
              />
              <div className="pt-2 space-y-1">
                <p className="text-sm font-medium">Organization</p>
                <p className="text-xs text-muted-foreground">
                  Which part of the business is this meeting for?
                </p>
                <Select value={organization} onValueChange={setOrganization}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization or location" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-primary font-semibold shrink-0">
              2
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-primary">
                Invite your leadership team.
              </h3>
              <p className="text-sm text-muted-foreground">
                Attendees will be able to contribute to the agenda.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  {/*
                   * MemberPicker is single-select; for multi-add we
                   * reset its value to null after each pick so the user
                   * can keep adding people from the same control. The
                   * shared cache means newly created members appear in
                   * every other picker without an extra fetch.
                   */}
                  <MemberPicker
                    value={null}
                    onChange={(id) => addMember(id)}
                    allowCreate
                    placeholder="Search for team member"
                  />
                </div>
                <div className="border rounded-md p-3 min-h-[120px] space-y-2">
                  {memberIds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No members added yet.
                    </p>
                  ) : (
                    memberIds.map((id) => {
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
                            onClick={() => removeMember(id)}
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
          </div>

          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-primary font-semibold shrink-0">
              3
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-primary">
                Connect a Desired Future Dashboard.
              </h3>
              <p className="text-sm text-muted-foreground">
                Check in with all of your leaders to make sure you're on track to hit your goals.
              </p>
              <div className="border rounded-md p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <Textarea
                    value={desiredFuture}
                    onChange={(e) => setDesiredFuture(e.target.value)}
                    rows={3}
                    className="flex-1"
                  />
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-pace">🟢 On Pace</SelectItem>
                      <SelectItem value="at-risk">🟡 At Risk</SelectItem>
                      <SelectItem value="off-pace">🔴 Off Pace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || !organization || createMutation.isPending}
              size="lg"
            >
              {createMutation.isPending ? "Creating…" : "Create Series"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
