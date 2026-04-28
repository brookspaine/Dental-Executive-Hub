import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, Users, ArrowRight } from "lucide-react";
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
  AREA_STYLES,
  areaStyle,
  type BusinessArea,
  type Tier,
} from "@/lib/role-styles";
import { useQueryClient } from "@tanstack/react-query";
import { getListRolesQueryKey } from "@workspace/api-client-react";

function NewRoleButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [businessArea, setBusinessArea] = useState<BusinessArea>("Operations");
  const [tier, setTier] = useState<Tier>("Operations Support");
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const createRole = useCreateRole({
    mutation: {
      onSuccess: (created) => {
        qc.invalidateQueries({ queryKey: getListRolesQueryKey() });
        setOpen(false);
        setTitle("");
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || createRole.isPending}
              onClick={() =>
                createRole.mutate({
                  data: { title: title.trim(), businessArea, tier },
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

function RoleCard({ role }: { role: Role }) {
  const style = areaStyle(role.businessArea);
  return (
    <Link href={`/my-roles/${role.id}`}>
      <div className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 group-hover:text-[#0F2A47]">
              {role.title}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {role.seatHolderName === "Open" ? (
                <span className="text-amber-700">Open</span>
              ) : (
                role.seatHolderName
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#0F2A47]" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.pill}`}>
            {role.businessArea}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            {role.tier}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RolesIndex() {
  const { data: roles = [], isLoading } = useListRoles();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.seatHolderName.toLowerCase().includes(q),
    );
  }, [roles, search]);

  // Group: Business Area → Tier → roles
  const grouped = useMemo(() => {
    const map = new Map<BusinessArea, Map<Tier, Role[]>>();
    for (const area of BUSINESS_AREAS) {
      map.set(area, new Map());
      for (const tier of TIERS) {
        map.get(area)!.set(tier, []);
      }
    }
    for (const r of filtered) {
      const area = (BUSINESS_AREAS as readonly string[]).includes(r.businessArea)
        ? (r.businessArea as BusinessArea)
        : "Operations";
      const tier = (TIERS as readonly string[]).includes(r.tier)
        ? (r.tier as Tier)
        : "Operations Support";
      map.get(area)!.get(tier)!.push(r);
    }
    return map;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#0F2A47]">
            <Users className="h-6 w-6" />
            My Roles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every seat in the practice — what it exists to do, what success
            looks like, and the playbooks that make it run.
          </p>
        </div>
        <NewRoleButton />
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
      ) : (
        <div className="space-y-6">
          {BUSINESS_AREAS.map((area) => {
            const tierMap = grouped.get(area)!;
            const totalInArea = TIERS.reduce(
              (sum, t) => sum + (tierMap.get(t)?.length ?? 0),
              0,
            );
            if (totalInArea === 0 && search.trim()) return null;
            const style = AREA_STYLES[area];
            return (
              <section key={area} className={`rounded-xl border ${style.ring} ${style.tint} p-4`}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-5 w-1 rounded-full ${style.bar}`} />
                  <h2 className={`text-sm font-semibold uppercase tracking-wide ${style.label}`}>
                    {area}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {totalInArea} {totalInArea === 1 ? "role" : "roles"}
                  </span>
                </div>
                <div className="space-y-4">
                  {TIERS.map((tier) => {
                    const tierRoles = tierMap.get(tier)!;
                    if (tierRoles.length === 0) return null;
                    return (
                      <div key={tier}>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          {tier}
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {tierRoles.map((r) => (
                            <RoleCard key={r.id} role={r} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {totalInArea === 0 && (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white/50 p-3 text-xs text-slate-500">
                      No roles in this area yet.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
