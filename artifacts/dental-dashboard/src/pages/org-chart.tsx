import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useListOrganizations,
  listOrgChartSeats,
  createOrgChartSeat,
  updateOrgChartSeat,
  deleteOrgChartSeat,
  getListOrgChartSeatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Network, Plus, Pencil, Trash2, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Seat = {
  id: number;
  organizationId: number;
  parentSeatId?: number | null;
  title: string;
  name?: string | null;
  accountabilities: string[];
  sortOrder: number;
};

type SeatFormState = {
  title: string;
  name: string;
  accountabilitiesText: string;
  parentSeatId: number | null;
};

const emptyForm: SeatFormState = {
  title: "",
  name: "",
  accountabilitiesText: "",
  parentSeatId: null,
};

function buildTree(seats: Seat[]): { roots: Seat[]; childrenOf: Map<number | null, Seat[]> } {
  const childrenOf = new Map<number | null, Seat[]>();
  for (const s of seats) {
    const key = s.parentSeatId ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(s);
    childrenOf.set(key, arr);
  }
  const roots = childrenOf.get(null) ?? [];
  return { roots, childrenOf };
}

function collectDescendantIds(
  rootId: number,
  childrenOf: Map<number | null, Seat[]>
): Set<number> {
  const out = new Set<number>();
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const kids = childrenOf.get(cur) ?? [];
    for (const k of kids) {
      if (!out.has(k.id)) {
        out.add(k.id);
        stack.push(k.id);
      }
    }
  }
  return out;
}

export function OrgChart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: orgs } = useListOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // Only Urgent Dental for now
  const locationOrgs = useMemo(
    () => (orgs ?? []).filter((o: any) => o.category === "urgent_dental"),
    [orgs]
  );

  useEffect(() => {
    if (selectedOrgId === null && locationOrgs.length > 0) {
      setSelectedOrgId(locationOrgs[0].id);
    }
  }, [locationOrgs, selectedOrgId]);

  const seatsQuery = useQuery({
    queryKey: selectedOrgId
      ? getListOrgChartSeatsQueryKey(selectedOrgId)
      : ["org-chart", "none"],
    queryFn: () => listOrgChartSeats(selectedOrgId as number),
    enabled: selectedOrgId !== null,
  });

  const seats: Seat[] = (seatsQuery.data as Seat[] | undefined) ?? [];
  const { roots, childrenOf } = useMemo(() => buildTree(seats), [seats]);

  const invalidateSeats = () => {
    if (selectedOrgId !== null) {
      queryClient.invalidateQueries({
        queryKey: getListOrgChartSeatsQueryKey(selectedOrgId),
      });
    }
  };

  const errorToast = (label: string) => (err: any) => {
    const msg =
      err?.response?.data?.error ??
      err?.body?.error ??
      err?.message ??
      "Something went wrong";
    toast({
      title: label,
      description: typeof msg === "string" ? msg : "Something went wrong",
      variant: "destructive",
    });
  };

  const createMut = useMutation({
    mutationFn: (data: any) =>
      createOrgChartSeat(selectedOrgId as number, data),
    onSuccess: invalidateSeats,
    onError: errorToast("Could not add seat"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateOrgChartSeat(id, data),
    onSuccess: invalidateSeats,
    onError: errorToast("Could not save seat"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOrgChartSeat(id),
    onSuccess: invalidateSeats,
    onError: errorToast("Could not delete seat"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [parentForNewSeat, setParentForNewSeat] = useState<number | null>(null);
  const [form, setForm] = useState<SeatFormState>(emptyForm);
  const [editMode, setEditMode] = useState(false);

  const openAddDialog = (parentId: number | null) => {
    setEditingSeat(null);
    setParentForNewSeat(parentId);
    setForm({
      title: "",
      name: "",
      accountabilitiesText: "",
      parentSeatId: parentId,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (seat: Seat) => {
    setEditingSeat(seat);
    setParentForNewSeat(null);
    setForm({
      title: seat.title,
      name: seat.name ?? "",
      accountabilitiesText: (seat.accountabilities ?? []).join("\n"),
      parentSeatId: seat.parentSeatId ?? null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    const accountabilities = form.accountabilitiesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      title: form.title.trim(),
      name: form.name.trim() ? form.name.trim() : null,
      parentSeatId: form.parentSeatId,
      accountabilities,
    };

    if (editingSeat) {
      updateMut.mutate(
        { id: editingSeat.id, data: payload },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingSeat(null);
          },
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          setParentForNewSeat(null);
        },
      });
    }
  };

  const handleDelete = (seat: Seat) => {
    if (
      window.confirm(
        `Delete the "${seat.title}" seat? Its direct reports will become top-level seats.`
      )
    ) {
      deleteMut.mutate(seat.id);
    }
  };

  const selectedOrg = (orgs ?? []).find((o: any) => o.id === selectedOrgId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Practice Organization Chart
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Seats and accountabilities — who owns what at each location
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedOrgId?.toString() ?? ""}
            onValueChange={(v) => setSelectedOrgId(parseInt(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {locationOrgs.map((o: any) => (
                <SelectItem key={o.id} value={o.id.toString()}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((v) => !v)}
            disabled={!selectedOrgId}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {editMode ? "Done editing" : "Edit"}
          </Button>
          {editMode && (
            <Button
              onClick={() => openAddDialog(null)}
              disabled={!selectedOrgId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add seat
            </Button>
          )}
        </div>
      </div>

      {!selectedOrgId ? null : seatsQuery.isLoading ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      ) : seats.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Network className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No seats defined for {selectedOrg?.name ?? "this location"} yet
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Start by adding the top-level seat (e.g., Visionary or Practice Owner)
            </p>
            <Button onClick={() => openAddDialog(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add first seat
            </Button>
          </CardContent>
        </Card>
      ) : (
        (() => {
          // Compute depth (tier) for each seat via BFS from roots.
          const depthOf = new Map<number, number>();
          const queue: { id: number; depth: number }[] = roots.map((r) => ({
            id: r.id,
            depth: 0,
          }));
          while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (depthOf.has(id)) continue;
            depthOf.set(id, depth);
            for (const c of childrenOf.get(id) ?? []) {
              queue.push({ id: c.id, depth: depth + 1 });
            }
          }
          // Any orphaned seats (shouldn't happen) default to depth 0.
          for (const s of seats) {
            if (!depthOf.has(s.id)) depthOf.set(s.id, 0);
          }
          const tiers = new Map<number, Seat[]>();
          for (const s of seats) {
            const d = depthOf.get(s.id) ?? 0;
            const arr = tiers.get(d) ?? [];
            arr.push(s);
            tiers.set(d, arr);
          }
          const sortedDepths = Array.from(tiers.keys()).sort((a, b) => a - b);
          return (
            <div className="space-y-8 overflow-x-auto pb-4">
              {sortedDepths.map((d, idx) => (
                <div key={d} className="relative">
                  {idx > 0 && (
                    <div
                      aria-hidden
                      className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-4 bg-border"
                    />
                  )}
                  <div className="flex flex-wrap justify-center gap-4">
                    {(tiers.get(d) ?? []).map((seat) => {
                      const parent = seat.parentSeatId
                        ? seats.find((s) => s.id === seat.parentSeatId)
                        : null;
                      const isOwnerTier = d === 0;
                      return (
                        <div
                          key={seat.id}
                          className={`relative max-w-full ${isOwnerTier ? "w-48" : "w-44"}`}
                        >
                          {idx > 0 && (
                            <div
                              aria-hidden
                              className="absolute -top-4 left-1/2 -translate-x-1/2 w-px h-4 bg-border"
                            />
                          )}
                          <SeatCard
                            seat={seat}
                            parent={parent ?? null}
                            compact={isOwnerTier}
                            editMode={editMode}
                            onAdd={openAddDialog}
                            onEdit={openEditDialog}
                            onDelete={handleDelete}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditingSeat(null);
            setParentForNewSeat(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeat ? "Edit seat" : "Add seat"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title / Role *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Office Manager"
              />
            </div>
            <div className="grid gap-2">
              <Label>Person's name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Leave blank if vacant"
              />
            </div>
            <div className="grid gap-2">
              <Label>Reports to</Label>
              <Select
                value={
                  form.parentSeatId === null
                    ? "__none__"
                    : form.parentSeatId.toString()
                }
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    parentSeatId: v === "__none__" ? null : parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Top level —</SelectItem>
                  {seats
                    .filter((s) => {
                      if (!editingSeat) return true;
                      if (s.id === editingSeat.id) return false;
                      const descendants = collectDescendantIds(
                        editingSeat.id,
                        childrenOf
                      );
                      return !descendants.has(s.id);
                    })
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.title}
                        {s.name ? ` — ${s.name}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Main accountabilities / LPIs</Label>
              <Textarea
                value={form.accountabilitiesText}
                onChange={(e) =>
                  setForm({ ...form, accountabilitiesText: e.target.value })
                }
                placeholder={"One per line, e.g.\nOversee daily operations\nHire and onboard staff\nManage P&L"}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                One accountability per line
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.title.trim() ||
                createMut.isPending ||
                updateMut.isPending
              }
            >
              {editingSeat ? "Save changes" : "Add seat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeatCard({
  seat,
  parent,
  compact = false,
  editMode = false,
  onAdd,
  onEdit,
  onDelete,
}: {
  seat: Seat;
  parent: Seat | null;
  compact?: boolean;
  editMode?: boolean;
  onAdd: (parentId: number | null) => void;
  onEdit: (seat: Seat) => void;
  onDelete: (seat: Seat) => void;
}) {
  const [, setLocation] = useLocation();
  const handleCardClick = () => {
    if (!editMode) setLocation(`/org-chart/seats/${seat.id}`);
  };
  return (
    <Card
      className={`h-full flex flex-col ${
        editMode ? "" : "cursor-pointer hover:shadow-md transition-shadow"
      }`}
      onClick={handleCardClick}
      role={editMode ? undefined : "button"}
      tabIndex={editMode ? undefined : 0}
      onKeyDown={(e) => {
        if (!editMode && e.key === "Enter") handleCardClick();
      }}
    >
      <CardContent
        className={`flex flex-col h-full ${compact ? "p-2.5" : "p-3"}`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-start gap-2 min-w-0">
            <div
              className={`shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center ${
                compact ? "h-6 w-6" : "h-7 w-7"
              }`}
            >
              <UserCircle2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </div>
            <div className="min-w-0">
              <div
                className={`font-semibold leading-tight truncate ${
                  compact ? "text-xs" : "text-sm"
                }`}
              >
                {seat.title}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {seat.name ? seat.name : <span className="italic">Vacant</span>}
              </div>
            </div>
          </div>
          {editMode && (
            <div className="flex items-center gap-0 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => onEdit(seat)}
                aria-label="Edit seat"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={() => onDelete(seat)}
                aria-label="Delete seat"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {!compact && parent && (
          <div className="mt-1.5 text-[10px] text-muted-foreground truncate">
            Reports to:{" "}
            <span className="font-medium text-foreground">{parent.title}</span>
          </div>
        )}

        {!compact &&
          seat.accountabilities &&
          seat.accountabilities.length > 0 && (
            <ul className="mt-2 space-y-0.5 flex-1">
              {seat.accountabilities.map((a, i) => (
                <li
                  key={i}
                  className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                >
                  <span className="h-1 w-1 mt-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="leading-snug">{a}</span>
                </li>
              ))}
            </ul>
          )}

        {compact &&
          seat.accountabilities &&
          seat.accountabilities.length > 0 && (
            <div className="mt-1.5 text-[10px] text-muted-foreground leading-snug line-clamp-2">
              {seat.accountabilities.join(" · ")}
            </div>
          )}

        {editMode && (
          <div className={`${compact ? "mt-1.5" : "mt-2"} pt-1.5 border-t`}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] w-full justify-start"
              onClick={() => onAdd(seat.id)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add direct report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
