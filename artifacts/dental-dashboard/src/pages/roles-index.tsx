import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, Users, Network } from "lucide-react";
import {
  useListRoles,
  useCreateRole,
  type Role,
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
import {
  BUSINESS_AREAS,
  TIERS,
  areaStyle,
  type BusinessArea,
  type Tier,
} from "@/lib/role-styles";
import { useQueryClient } from "@tanstack/react-query";
import { getListRolesQueryKey } from "@workspace/api-client-react";

function NewRoleButton({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [businessArea, setBusinessArea] = useState<BusinessArea>("Operations");
  const [tier, setTier] = useState<Tier>("Operations Support");
  const [reportsTo, setReportsTo] = useState<string>("__none__");
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Business area</Label>
                <Select
                  value={businessArea}
                  onValueChange={(v) => setBusinessArea(v as BusinessArea)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    businessArea,
                    tier,
                    reportsToRoleId:
                      reportsTo === "__none__" ? null : Number(reportsTo),
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

function RoleNodeCard({ role, compact }: { role: Role; compact: boolean }) {
  const style = areaStyle(role.businessArea);
  const isOpen = !role.seatHolderName || role.seatHolderName === "Open";
  return (
    <Link href={`/my-roles/${role.id}`}>
      <div
        className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md ${style.ring}`}
      >
        <div className={`h-1 w-full ${style.bar}`} />
        <div className={`flex flex-1 flex-col items-center gap-2 px-3 ${compact ? "py-4" : "pt-4 pb-3"}`}>
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
            <div className={`font-semibold leading-tight text-slate-900 group-hover:text-[#0F2A47] ${compact ? "text-sm" : "text-[13px]"}`}>
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
          {!compact && (
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${style.pill}`}>
                {role.businessArea}
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-700">
                {role.tier}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
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

export function RolesIndex() {
  const { data: roles = [], isLoading } = useListRoles();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    // When searching, return matching roles plus their ancestors so the tree
    // remains coherent.
    const byId = new Map<number, Role>(roles.map((r) => [r.id, r]));
    const keep = new Set<number>();
    for (const r of roles) {
      if (
        r.title.toLowerCase().includes(q) ||
        r.seatHolderName.toLowerCase().includes(q) ||
        r.businessArea.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
      ) {
        let cur: Role | undefined = r;
        while (cur && !keep.has(cur.id)) {
          keep.add(cur.id);
          cur = cur.reportsToRoleId ? byId.get(cur.reportsToRoleId) : undefined;
        }
      }
    }
    return roles.filter((r) => keep.has(r.id));
  }, [roles, search]);

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
            My Role
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every seat in the practice — click any position to see what it
            exists to do, what success looks like, and the playbooks that make
            it run.
          </p>
        </div>
        <NewRoleButton roles={roles} />
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles or seat holders…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading roles…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Network className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            {search.trim()
              ? "No roles match your search."
              : "No roles defined yet. Add your first role to get started."}
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
                      <RoleNodeCard role={r} compact={isOwnerTier} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
