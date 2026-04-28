import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, BookOpen, ArrowRight } from "lucide-react";
import {
  useListPlaybooks,
  useListRoles,
  useCreatePlaybook,
  getListPlaybooksQueryKey,
  type Playbook,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { PLAYBOOK_CATEGORIES } from "@/lib/role-styles";

const CATEGORY_PILL: Record<string, string> = {
  "Clinical Procedure": "bg-rose-100 text-rose-800",
  "Patient Communication": "bg-violet-100 text-violet-800",
  "Operational Process": "bg-orange-100 text-orange-800",
  Compliance: "bg-slate-200 text-slate-800",
  "Emergency Response": "bg-amber-100 text-amber-800",
};

function NewPlaybookDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] =
    useState<(typeof PLAYBOOK_CATEGORIES)[number]>("Operational Process");
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const create = useCreatePlaybook({
    mutation: {
      onSuccess: (pb) => {
        qc.invalidateQueries({ queryKey: getListPlaybooksQueryKey() });
        setOpen(false);
        setTitle("");
        setLocation(`/playbook-library/${pb.id}`);
      },
    },
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" /> New Playbook
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New playbook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pb-title">Title</Label>
              <Input
                id="pb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to handle a hot tooth"
                autoFocus
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as (typeof PLAYBOOK_CATEGORIES)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBOOK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
              disabled={!title.trim() || create.isPending}
              onClick={() =>
                create.mutate({ data: { title: title.trim(), category } })
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

function PlaybookCard({
  pb,
  roleNames,
}: {
  pb: Playbook;
  roleNames: string[];
}) {
  const pillCls = CATEGORY_PILL[pb.category] ?? "bg-slate-100 text-slate-700";
  return (
    <Link href={`/playbook-library/${pb.id}`}>
      <div className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 group-hover:text-[#0F2A47]">
              {pb.title}
            </div>
            {pb.purpose && (
              <div className="mt-1 line-clamp-2 text-xs text-slate-600">
                {pb.purpose}
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#0F2A47]" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pillCls}`}>
            {pb.category}
          </span>
          {roleNames.slice(0, 2).map((n) => (
            <span
              key={n}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
            >
              {n}
            </span>
          ))}
          {roleNames.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
              +{roleNames.length - 2}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PlaybookLibrary() {
  const { data: playbooks = [], isLoading } = useListPlaybooks();
  const { data: roles = [] } = useListRoles();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [roleFilter, setRoleFilter] = useState<string>("All");

  const roleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of roles) m.set(r.id, r.title);
    return m;
  }, [roles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return playbooks.filter((pb) => {
      if (q && !pb.title.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "All" && pb.category !== categoryFilter) return false;
      if (roleFilter !== "All") {
        const roleId = parseInt(roleFilter, 10);
        if (!pb.roleIds.includes(roleId)) return false;
      }
      return true;
    });
  }, [playbooks, search, categoryFilter, roleFilter]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-[#0F2A47]">
            <BookOpen className="h-6 w-6" />
            Playbook Library
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every "how-to" used across the practice — the institutional
            knowledge of EDGE in one searchable place.
          </p>
        </div>
        <NewPlaybookDialog />
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playbooks…"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {PLAYBOOK_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading playbooks…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No playbooks match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pb) => (
            <PlaybookCard
              key={pb.id}
              pb={pb}
              roleNames={pb.roleIds
                .map((id) => roleById.get(id))
                .filter((s): s is string => !!s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
