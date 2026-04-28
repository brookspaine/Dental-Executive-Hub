import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Pencil, Plus, Trash2, Users, Network } from "lucide-react";
import {
  useListRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useListOrganizations,
  getGetRoleQueryKey,
  type Role,
  type Organization,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { areaStyle } from "@/lib/role-styles";
import { useQueryClient } from "@tanstack/react-query";
import { getListRolesQueryKey } from "@workspace/api-client-react";

function NewRoleButton({
  roles,
  organizations,
  defaultOrgId,
}: {
  roles: Role[];
  organizations: Organization[];
  defaultOrgId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [reportsTo, setReportsTo] = useState<string>("__none__");
  const [orgId, setOrgId] = useState<string>(
    defaultOrgId !== null ? String(defaultOrgId) : "__none__",
  );
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const createRole = useCreateRole({
    mutation: {
      onSuccess: (created) => {
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        setOpen(false);
        setTitle("");
        setReportsTo("__none__");
        setLocation(`/my-roles/${created.id}`);
      },
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> New Role
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-title">Role title</Label>
              <Input
                id="role-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clinical Assistant"
                autoFocus
              />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No location —</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {(o.name ?? "").trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reports to</Label>
              <Select value={reportsTo} onValueChange={setReportsTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Top level —</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.title}
                      {r.seatHolderName && r.seatHolderName !== "Open"
                        ? ` — ${r.seatHolderName}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || createRole.isPending}
              onClick={() =>
                createRole.mutate({
                  data: {
                    title: title.trim(),
                    businessArea: "Operations",
                    tier: "Operations Support",
                    reportsToRoleId:
                      reportsTo === "__none__" ? null : Number(reportsTo),
                    organizationId:
                      orgId === "__none__" ? null : Number(orgId),
                  },
                })
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function initialsOf(name: string): string {
  if (!name || name === "Open") return "";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

function RoleNodeCard({
  role,
  compact,
  editMode,
  onEdit,
}: {
  role: Role;
  compact: boolean;
  editMode: boolean;
  onEdit: (role: Role) => void;
}) {
  const style = areaStyle(role.businessArea);
  const isOpen = !role.seatHolderName || role.seatHolderName === "Open";
  const cardInner = (
    <div
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md ${style.ring}`}
    >
      {editMode && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(role);
          }}
          className="absolute right-1.5 top-1.5 z-10 rounded-md border border-slate-200 bg-white/90 p-1 text-slate-500 shadow-sm hover:bg-[#0F2A47] hover:text-white"
          aria-label={`Edit ${role.title}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <div className={`h-1 w-full ${style.bar}`} />
      <div
        className={`flex flex-1 flex-col items-center gap-2 px-3 ${compact ? "py-4" : "pt-4 pb-3"}`}
      >
        <div
          className={`flex items-center justify-center rounded-full text-sm font-semibold ${
            isOpen
              ? "border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700"
              : "bg-[#0F2A47] text-white"
          } ${compact ? "h-12 w-12" : "h-10 w-10"}`}
        >
          {isOpen ? "?" : initialsOf(role.seatHolderName)}
        </div>
        <div className="text-center">
          <div
            className={`font-semibold leading-tight text-slate-900 group-hover:text-[#0F2A47] ${compact ? "text-sm" : "text-[13px]"}`}
          >
            {role.title}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {isOpen ? (
              <span className="text-amber-700">Open seat</span>
            ) : (
              role.seatHolderName
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return <Link href={`/my-roles/${role.id}`}>{cardInner}</Link>;
}

function EditRoleDialog({
  role,
  open,
  onClose,
}: {
  role: Role | null;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [seatHolderName, setSeatHolderName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();
  const updateRole = useUpdateRole({
    mutation: {
      onSuccess: (_data, vars) => {
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetRoleQueryKey(vars.id) });
        onClose();
      },
    },
  });
  const deleteRole = useDeleteRole({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        setConfirmDelete(false);
        onClose();
      },
    },
  });

  useEffect(() => {
    if (role) {
      setTitle(role.title);
      setSeatHolderName(role.seatHolderName === "Open" ? "" : role.seatHolderName);
      setConfirmDelete(false);
    }
  }, [role]);

  if (!role) return null;
  const trimmedName = seatHolderName.trim();
  const initials = trimmedName
    ? trimmedName
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-role-title">Role title</Label>
            <Input
              id="edit-role-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="edit-seat-holder">Seat holder name</Label>
            <Input
              id="edit-seat-holder"
              value={seatHolderName}
              onChange={(e) => setSeatHolderName(e.target.value)}
              placeholder="Leave blank for Open seat"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm text-red-700">
              <span>Delete this role?</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteRole.isPending}
                onClick={() => deleteRole.mutate({ id: role.id })}
              >
                Yes, delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete role
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || updateRole.isPending || confirmDelete}
              onClick={() =>
                updateRole.mutate({
                  id: role.id,
                  data: {
                    title: title.trim(),
                    seatHolderName: trimmedName || "Open",
                    seatHolderInitials: initials,
                  },
                })
              }
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildTree(roles: Role[]): {
  roots: Role[];
  childrenOf: Map<number | null, Role[]>;
} {
  const childrenOf = new Map<number | null, Role[]>();
  for (const r of roles) {
    const key = r.reportsToRoleId ?? null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(r);
    childrenOf.set(key, arr);
  }
  for (const arr of childrenOf.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title));
  }
  const roots = childrenOf.get(null) ?? [];
  return { roots, childrenOf };
}

const ORG_GROUP_ORDER = ["edge_dso", "edge", "urgent_dental"];

export function RolesIndex() {
  const { data: roles = [], isLoading } = useListRoles();
  const { data: organizations = [] } = useListOrganizations();
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Group organizations by category for the dropdown.
  const groupedOrgs = useMemo(() => {
    const byCat = new Map<string, Organization[]>();
    for (const o of organizations) {
      const cat = o.category ?? "other";
      const arr = byCat.get(cat) ?? [];
      arr.push(o);
      byCat.set(cat, arr);
    }
    for (const arr of byCat.values()) {
      arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }
    return ORG_GROUP_ORDER.flatMap((cat) =>
      byCat.get(cat) ? [{ cat, orgs: byCat.get(cat)! }] : [],
    );
  }, [organizations]);

  // Auto-select the first available org once organizations load.
  useEffect(() => {
    if (orgFilter !== "" || groupedOrgs.length === 0) return;
    const firstOrg = groupedOrgs[0]?.orgs[0];
    if (firstOrg) setOrgFilter(String(firstOrg.id));
  }, [orgFilter, groupedOrgs]);

  // Default org for new roles is whichever location is currently selected.
  const defaultOrgId = useMemo(
    () => (orgFilter ? Number(orgFilter) : null),
    [orgFilter],
  );

  const filtered = useMemo(() => {
    if (!orgFilter) return [];
    const allById = new Map<number, Role>(roles.map((r) => [r.id, r]));

    // Location filter — keep matching roles plus their ancestors so the tree
    // stays connected (a clinical lead under EDGE DSO still needs to show when
    // filtering Urgent Dental, otherwise its child cards become orphans).
    const keep = new Set<number>();
    for (const r of roles) {
      if (String(r.organizationId ?? "") === orgFilter) {
        let cur: Role | undefined = r;
        while (cur && !keep.has(cur.id)) {
          keep.add(cur.id);
          cur = cur.reportsToRoleId
            ? allById.get(cur.reportsToRoleId)
            : undefined;
        }
      }
    }
    return roles.filter((r) => keep.has(r.id));
  }, [roles, orgFilter]);

  const tiers = useMemo(() => {
    const { roots, childrenOf } = buildTree(filtered);
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
    // Orphans (shouldn't normally happen) default to depth 0.
    for (const r of filtered) {
      if (!depthOf.has(r.id)) depthOf.set(r.id, 0);
    }
    const byDepth = new Map<number, Role[]>();
    for (const r of filtered) {
      const d = depthOf.get(r.id) ?? 0;
      const arr = byDepth.get(d) ?? [];
      arr.push(r);
      byDepth.set(d, arr);
    }
    for (const arr of byDepth.values()) {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    return Array.from(byDepth.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#0F2A47]">
            <Users className="h-6 w-6" />
            Organizational Chart
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every seat in the practice — click any position to see what it
            exists to do, what success looks like, and the playbooks that make
            it run.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewRoleButton
            roles={roles}
            organizations={organizations}
            defaultOrgId={defaultOrgId}
          />
          <Button
            variant={editMode ? "default" : "outline"}
            size="icon"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? "Done editing" : "Edit roles"}
            title={editMode ? "Done editing" : "Edit roles"}
          >
            {editMode ? (
              <Check className="h-4 w-4" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupedOrgs.flatMap(({ orgs }) =>
              orgs.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {(o.name ?? "").trim()}
                </SelectItem>
              )),
            )}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading roles…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Network className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No roles defined yet. Add your first role to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 pb-8">
          {tiers.map(([depth, tierRoles], idx) => (
            <div key={depth} className="relative">
              {idx > 0 && (
                <div
                  aria-hidden
                  className="absolute -top-8 left-1/2 h-4 w-px -translate-x-1/2 bg-slate-200"
                />
              )}
              <div className="flex flex-wrap justify-center gap-4">
                {tierRoles.map((r) => {
                  const isOwnerTier = depth === 0;
                  return (
                    <div
                      key={r.id}
                      className={`relative ${isOwnerTier ? "w-52" : "w-44"}`}
                    >
                      {idx > 0 && (
                        <div
                          aria-hidden
                          className="absolute -top-4 left-1/2 h-4 w-px -translate-x-1/2 bg-slate-200"
                        />
                      )}
                      <RoleNodeCard
                        role={r}
                        compact={isOwnerTier}
                        editMode={editMode}
                        onEdit={setEditingRole}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditRoleDialog
        role={editingRole}
        open={editingRole !== null}
        onClose={() => setEditingRole(null)}
      />
    </div>
  );
}
