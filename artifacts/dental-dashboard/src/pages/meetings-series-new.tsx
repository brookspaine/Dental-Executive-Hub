import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, X, Plus, Search } from "lucide-react";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MeetingsSeriesNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>(["Brooks Paine"]);
  const [desiredFuture, setDesiredFuture] = useState(
    "By April 2027 we will implement alignment and accountability strategies, resulting in a 20% revenue growth. [DRAFT]"
  );
  const [status, setStatus] = useState("on-pace");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meeting-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          members,
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

  function addMember() {
    const t = memberInput.trim();
    if (!t) return;
    if (members.includes(t)) return;
    setMembers([...members, t]);
    setMemberInput("");
  }

  function removeMember(m: string) {
    setMembers(members.filter((x) => x !== m));
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
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addMember();
                        }
                      }}
                      placeholder="Search for Team Member"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMember}
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                <div className="border rounded-md p-3 min-h-[120px] space-y-2">
                  {members.map((m) => (
                    <div
                      key={m}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs bg-primary/15 text-primary">
                            {initials(m)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{m}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(m)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${m}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
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
              disabled={!name.trim() || createMutation.isPending}
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
