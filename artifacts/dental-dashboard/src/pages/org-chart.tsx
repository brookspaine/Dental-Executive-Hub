import { useMemo, useState, useEffect } from "react";
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
            onClick={() => openAddDialog(null)}
            disabled={!selectedOrgId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add seat
          </Button>
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
        <div className="space-y-4">
          {roots.map((seat) => (
            <SeatNode
              key={seat.id}
              seat={seat}
              childrenOf={childrenOf}
              depth={0}
              onAdd={openAddDialog}
              onEdit={openEditDialog}
              onDelete={handleDelete}
            />
          ))}
        </div>
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

function SeatNode({
  seat,
  childrenOf,
  depth,
  onAdd,
  onEdit,
  onDelete,
}: {
  seat: Seat;
  childrenOf: Map<number | null, Seat[]>;
  depth: number;
  onAdd: (parentId: number | null) => void;
  onEdit: (seat: Seat) => void;
  onDelete: (seat: Seat) => void;
}) {
  const children = childrenOf.get(seat.id) ?? [];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold leading-tight">{seat.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {seat.name ? seat.name : (
                    <span className="italic">Vacant</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => onAdd(seat.id)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Direct report
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit(seat)}
                aria-label="Edit seat"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(seat)}
                aria-label="Delete seat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {seat.accountabilities && seat.accountabilities.length > 0 && (
            <ul className="mt-3 ml-12 space-y-1">
              {seat.accountabilities.map((a, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-center gap-2"
                >
                  <span className="h-1 w-1 rounded-full bg-muted-foreground leading-none" />
                  {a}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {children.length > 0 && (
        <div
          className="ml-6 pl-4 border-l-2 border-dashed border-muted space-y-3"
          style={{ marginLeft: depth === 0 ? 24 : undefined }}
        >
          {children.map((c) => (
            <SeatNode
              key={c.id}
              seat={c}
              childrenOf={childrenOf}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
