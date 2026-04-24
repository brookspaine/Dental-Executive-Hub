import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MemberAvatar } from "@/components/member-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronRight, Building2 } from "lucide-react";
import { useMeetingOrgOptions } from "@/lib/meeting-orgs";

type Series = {
  id: number;
  name: string;
  organization: string | null;
  members: string[];
  createdAt: string;
};

const ALL = "__all__";
const UNASSIGNED = "__unassigned__";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MeetingsLeadership() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>(ALL);
  const { options: orgOptions } = useMeetingOrgOptions();

  const { data: seriesList = [], isLoading } = useQuery<Series[]>({
    queryKey: ["/api/meeting-series"],
    queryFn: async () => {
      const res = await fetch("/api/meeting-series");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  // Combined org options: known options plus any orgs that exist on series
  // but aren't in the current org list (e.g. a renamed location).
  const allOrgValues = useMemo(() => {
    const set = new Set<string>(orgOptions.map((o) => o.value));
    for (const s of seriesList) {
      if (s.organization) set.add(s.organization);
    }
    return Array.from(set);
  }, [orgOptions, seriesList]);

  const filtered = useMemo(() => {
    if (filter === ALL) return seriesList;
    if (filter === UNASSIGNED) return seriesList.filter((s) => !s.organization);
    return seriesList.filter((s) => s.organization === filter);
  }, [seriesList, filter]);

  const groups = useMemo(() => {
    const m = new Map<string, Series[]>();
    for (const s of filtered) {
      const key = s.organization || UNASSIGNED;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(s);
    }
    return Array.from(m.entries()).sort(([a], [b]) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Leadership Team Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recurring meeting series with your leadership team.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-60">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All organizations</SelectItem>
              {allOrgValues.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setLocation("/meetings/leadership/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting Series
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {seriesList.length === 0 ? (
            <>
              No meeting series yet. Click <strong>New Meeting Series</strong>{" "}
              to get started.
            </>
          ) : (
            <>No meeting series for this organization.</>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([orgKey, items]) => (
            <div key={orgKey} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {orgKey === UNASSIGNED ? "Unassigned" : orgKey}
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              <Card className="divide-y">
                {items.map((s) => (
                  <Link
                    key={s.id}
                    href={`/meetings/leadership/series/${s.id}`}
                    className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-wrap">
                      <h3 className="text-lg font-semibold truncate">
                        {s.name}
                      </h3>
                      {s.organization && (
                        <Badge variant="secondary" className="font-normal">
                          {s.organization}
                        </Badge>
                      )}
                      <div className="flex -space-x-2">
                        {(s.members ?? []).slice(0, 4).map((m, i) => (
                          <MemberAvatar
                            key={i}
                            name={m}
                            className="w-8 h-8 border-2 border-background"
                          />
                        ))}
                        {(s.members?.length ?? 0) > 4 && (
                          <Avatar className="w-8 h-8 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              +{s.members.length - 4}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
