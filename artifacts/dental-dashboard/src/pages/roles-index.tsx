import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, Pencil, Plus, Trash2, Users, Network } from "lucide-react";
import {
  useListRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useListOrganizations,
  useListDirectReports,
  useUpdateDirectReport,
  getGetRoleQueryKey,
  getListDirectReportsQueryKey,
  type Role,
  type Organization,
} from "@workspace/api-client-react";
import { useQueryClient as useQC } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/components/editable-report-photo";
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
import { MemberPicker } from "@/components/team/member-picker";

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
        <Plus className="h-4 w-4" /> New Seat
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
  const [seatHolderId, setSeatHolderId] = useState<number | null>(null);
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
      setSeatHolderId(role.seatHolderId ?? null);
      setConfirmDelete(false);
    }
  }, [role]);

  if (!role) return null;

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
            <Label>Seat holder</Label>
            {/*
             * The picker is the single source of truth — assigning here
             * writes seatHolderId on the role, and the API derives the
             * cached display name/initials from the canonical
             * team_members row.
             */}
            <MemberPicker
              value={seatHolderId}
              onChange={(id) => setSeatHolderId(id)}
              allowUnassigned
              allowCreate
              defaultOrganizationId={role.organizationId ?? null}
              placeholder="Open seat — pick a team member…"
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
                    seatHolderId,
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

type OrgChartViewMode = "by-role" | "by-people";

export function RolesIndex() {
  const { data: roles = [], isLoading } = useListRoles();
  const { data: organizations = [] } = useListOrganizations();
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("by-role");

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
        <div
          role="tablist"
          aria-label="Org chart view"
          className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "by-role"}
            onClick={() => setViewMode("by-role")}
            className={`px-3 py-1.5 rounded-sm font-medium transition-colors ${
              viewMode === "by-role"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            data-testid="org-chart-view-by-role"
          >
            By Role
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "by-people"}
            onClick={() => setViewMode("by-people")}
            className={`px-3 py-1.5 rounded-sm font-medium transition-colors ${
              viewMode === "by-people"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            data-testid="org-chart-view-by-people"
          >
            By People
          </button>
        </div>
      </div>

      {viewMode === "by-people" ? (
        <PeopleTree />
      ) : isLoading ? (
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

/**
 * People view of the org chart, built from `team_members` joined to
 * itself by `manager_id`. Each node has an inline picker so a manager
 * can be re-assigned without leaving the page.
 */
function PeopleTree() {
  const { data: members = [], isLoading } = useListDirectReports();
  const updateMember = useUpdateDirectReport();
  const qc = useQC();

  type Person = {
    id: number;
    name: string;
    role?: string;
    avatarUrl?: string | null;
    managerId: number | null;
  };

  const people: Person[] = useMemo(
    () =>
      ((members as any[]) ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatarUrl: m.avatarUrl ?? null,
        managerId: typeof m.managerId === "number" ? m.managerId : null,
      })),
    [members],
  );

  const childrenOf = useMemo(() => {
    const map = new Map<number | null, Person[]>();
    for (const p of people) {
      const key = p.managerId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [people]);

  const knownIds = useMemo(() => new Set(people.map((p) => p.id)), [people]);

  // "True" roots: anyone whose managerId is null OR points to a missing
  // person.
  const roots = useMemo(
    () =>
      people
        .filter((p) => p.managerId === null || !knownIds.has(p.managerId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [people, knownIds],
  );

  // Walk the tree from those roots and collect every reachable node so we
  // can detect anyone trapped in a cycle (e.g. legacy data with mutually
  // pointing manager_ids). Those nodes would otherwise vanish from the UI
  // and become un-fixable.
  const orphans = useMemo(() => {
    const reachable = new Set<number>();
    const stack: number[] = roots.map((r) => r.id);
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const c of childrenOf.get(id) ?? []) {
        if (!reachable.has(c.id)) stack.push(c.id);
      }
    }
    return people
      .filter((p) => !reachable.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, roots, childrenOf]);

  function handleSetManager(personId: number, managerId: number | null): void {
    updateMember.mutate(
      { id: personId, data: { managerId } as any },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getListDirectReportsQueryKey() }),
        onError: (err: any) => {
          // Surface the cycle-guard / unknown-id 400 from the server.
          // eslint-disable-next-line no-alert
          alert(err?.message ?? "Failed to set manager");
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading people…
      </div>
    );
  }
  if (people.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          No team members yet. Add someone on Team Members.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-xl border border-slate-200 bg-white p-6"
      data-testid="people-tree"
    >
      {roots.map((p) => (
        <PeopleNode
          key={p.id}
          person={p}
          depth={0}
          childrenOf={childrenOf}
          allPeople={people}
          onSetManager={handleSetManager}
        />
      ))}
      {orphans.length > 0 && (
        <div
          className="mt-6 rounded-lg border border-amber-300 bg-amber-50/40 p-4"
          data-testid="people-tree-orphans"
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Detached / cyclic ({orphans.length}) — pick a different "Reports
            to" to bring them back into the tree
          </div>
          <div className="space-y-2">
            {orphans.map((p) => (
              <PeopleNode
                key={p.id}
                person={p}
                depth={0}
                childrenOf={new Map()}
                allPeople={people}
                onSetManager={handleSetManager}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PeopleNode({
  person,
  depth,
  childrenOf,
  allPeople,
  onSetManager,
}: {
  person: {
    id: number;
    name: string;
    role?: string;
    avatarUrl?: string | null;
    managerId: number | null;
  };
  depth: number;
  childrenOf: Map<
    number | null,
    {
      id: number;
      name: string;
      role?: string;
      avatarUrl?: string | null;
      managerId: number | null;
    }[]
  >;
  allPeople: {
    id: number;
    name: string;
    role?: string;
    avatarUrl?: string | null;
    managerId: number | null;
  }[];
  onSetManager: (personId: number, managerId: number | null) => void;
}) {
  const kids = childrenOf.get(person.id) ?? [];
  // Anyone but the person themself is a candidate manager. The server
  // re-validates with a cycle walk, so listing descendants here is fine
  // — the user just gets a friendly error if they pick badly.
  const candidates = allPeople.filter((p) => p.id !== person.id);
  const initials = (person.name ?? "")
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="space-y-2"
      style={{ marginLeft: depth === 0 ? 0 : 24 }}
      data-testid={`people-node-${person.id}`}
    >
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/40 px-3 py-2">
        <Avatar className="h-9 w-9 shrink-0">
          {resolveAvatarUrl(person.avatarUrl) && (
            <AvatarImage
              src={resolveAvatarUrl(person.avatarUrl) ?? undefined}
              alt={person.name}
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{person.name}</div>
          {person.role && (
            <div className="text-xs text-slate-500 truncate">{person.role}</div>
          )}
        </div>
        <div className="shrink-0">
          <Select
            value={person.managerId === null ? "__none__" : String(person.managerId)}
            onValueChange={(v) =>
              onSetManager(person.id, v === "__none__" ? null : Number(v))
            }
          >
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Reports to…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No manager (top) —</SelectItem>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {kids.length > 0 && (
        <div className="space-y-2 border-l border-slate-200 pl-3 ml-4">
          {kids.map((k) => (
            <PeopleNode
              key={k.id}
              person={k}
              depth={depth + 1}
              childrenOf={childrenOf}
              allPeople={allPeople}
              onSetManager={onSetManager}
            />
          ))}
        </div>
      )}
    </div>
  );
}
