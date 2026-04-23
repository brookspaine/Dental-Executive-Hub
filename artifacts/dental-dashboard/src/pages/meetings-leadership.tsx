import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, ChevronRight, Building2 } from "lucide-react";

type Series = {
  id: number;
  name: string;
  members: string[];
  createdAt: string;
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

export function MeetingsLeadership() {
  const [, setLocation] = useLocation();
  const { data: seriesList = [], isLoading } = useQuery<Series[]>({
    queryKey: ["/api/meeting-series"],
    queryFn: async () => {
      const res = await fetch("/api/meeting-series");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

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
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Building2 className="w-4 h-4 mr-2" />
            Go to My Company Page
          </Button>
          <Button onClick={() => setLocation("/meetings/leadership/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Meeting Series
          </Button>
        </div>
      </div>

      <Card className="divide-y">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : seriesList.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No meeting series yet. Click <strong>New Meeting Series</strong> to
            get started.
          </div>
        ) : (
          seriesList.map((s) => (
            <Link
              key={s.id}
              href={`/meetings/leadership/series/${s.id}`}
              className="flex items-center justify-between p-5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <h3 className="text-lg font-semibold truncate">{s.name}</h3>
                <div className="flex -space-x-2">
                  {(s.members ?? []).slice(0, 4).map((m, i) => (
                    <Avatar
                      key={i}
                      className="w-8 h-8 border-2 border-background"
                    >
                      <AvatarFallback className="text-xs bg-primary/15 text-primary">
                        {initials(m)}
                      </AvatarFallback>
                    </Avatar>
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
          ))
        )}
      </Card>
    </div>
  );
}
