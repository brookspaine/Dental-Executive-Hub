import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Plus, Pencil, Building2 } from "lucide-react";

type Series = {
  id: number;
  name: string;
  organization: string | null;
  members: string[];
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

  const { data: series } = useQuery<Series>({
    queryKey: [`/api/meeting-series/${seriesId}`],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-series/${seriesId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

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
              <Avatar key={i} className="w-8 h-8 border-2 border-background">
                <AvatarFallback className="text-xs bg-primary/15 text-primary">
                  {initials(m)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" disabled>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Series
          </Button>
          <Button onClick={() => newAgendaMutation.mutate()} disabled={newAgendaMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            New Agenda
          </Button>
        </div>
      </div>

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
