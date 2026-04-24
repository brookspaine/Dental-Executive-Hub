import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDirectReports,
  useCreateDirectReport,
  useUpdateDirectReport,
  useDeleteDirectReport,
  getListDirectReportsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Search,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Shield,
  Bell,
  Mail,
  Phone,
} from "lucide-react";

type ReportFormData = {
  name: string;
  role: string;
  email: string;
  phone: string;
  organization: string;
  status: "active" | "on_leave" | "inactive";
  hireDate: string;
  performanceRating: number | undefined;
};

const emptyForm: ReportFormData = {
  name: "",
  role: "",
  email: "",
  phone: "",
  organization: "",
  status: "active",
  hireDate: "",
  performanceRating: undefined,
};

type SortKey = "name" | "status" | "reportsTo";
type SortDir = "asc" | "desc";

const statusLabels: Record<string, string> = {
  active: "Active",
  on_leave: "On Leave",
  inactive: "Inactive",
};

const statusClasses: Record<string, string> = {
  active: "text-emerald-600",
  on_leave: "text-amber-600",
  inactive: "text-muted-foreground",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DirectReports() {
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useListDirectReports();
  const createReport = useCreateDirectReport();
  const updateReport = useUpdateDirectReport();
  const deleteReport = useDeleteDirectReport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReportFormData>(emptyForm);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detailMember, setDetailMember] = useState<any | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListDirectReportsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleSubmit = () => {
    if (!form.name || !form.role || !form.email) return;

    const data: any = {
      name: form.name,
      role: form.role,
      email: form.email,
      phone: form.phone || undefined,
      organization: form.organization || undefined,
      organizationId: undefined,
      status: form.status,
      hireDate: form.hireDate || undefined,
      performanceRating: form.performanceRating,
    };

    if (editingId) {
      updateReport.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            invalidate();
            setDialogOpen(false);
            setEditingId(null);
            setForm(emptyForm);
          },
        }
      );
    } else {
      createReport.mutate(
        { data },
        {
          onSuccess: () => {
            invalidate();
            setDialogOpen(false);
            setForm(emptyForm);
          },
        }
      );
    }
  };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      role: r.role,
      email: r.email,
      phone: r.phone || "",
      organization: r.organization || r.organizationName || "",
      status: r.status,
      hireDate: r.hireDate || "",
      performanceRating: r.performanceRating || undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteReport.mutate({ id }, { onSuccess: invalidate });
  };

  const visible = useMemo(() => {
    const list = (reports ?? []) as any[];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (r) =>
            r.name?.toLowerCase().includes(q) ||
            r.email?.toLowerCase().includes(q) ||
            r.role?.toLowerCase().includes(q) ||
            (r.organization || r.organizationName || "")
              .toLowerCase()
              .includes(q)
        )
      : list;
    const reportsTo = (r: any) => r.organization || r.organizationName || "";
    const sorted = [...filtered].sort((a, b) => {
      let av = "";
      let bv = "";
      if (sortKey === "name") {
        av = a.name ?? "";
        bv = b.name ?? "";
      } else if (sortKey === "status") {
        av = statusLabels[a.status] ?? a.status ?? "";
        bv = statusLabels[b.status] ?? b.status ?? "";
      } else {
        av = reportsTo(a);
        bv = reportsTo(b);
      }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [reports, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k)
      return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Manage Company</h2>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <button className="flex items-center gap-1.5 text-primary hover:underline">
            <Shield className="h-4 w-4" />
            Administrators
          </button>
          <button className="flex items-center gap-1.5 text-primary hover:underline">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingId(null);
                setForm(emptyForm);
              }
            }}
          >
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 text-primary hover:underline">
                <Plus className="h-4 w-4" />
                Add Team Member
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Team Member" : "Add Team Member"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Input
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                      placeholder="e.g. Office Manager"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      type="email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Reports To / Organization</Label>
                    <Input
                      value={form.organization}
                      onChange={(e) =>
                        setForm({ ...form, organization: e.target.value })
                      }
                      placeholder="e.g. Urgent Dental"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Account Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          status: v as "active" | "on_leave" | "inactive",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Hire Date</Label>
                    <Input
                      type="date"
                      value={form.hireDate}
                      onChange={(e) =>
                        setForm({ ...form, hireDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Performance Rating (1-5)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      step={0.1}
                      value={form.performanceRating || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          performanceRating: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={handleSubmit} className="mt-2">
                  {editingId ? "Update" : "Add"} Team Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for Team Member or Leader"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b bg-muted/30 text-sm font-semibold">
          <button
            className="text-left flex items-center hover:text-primary"
            onClick={() => toggleSort("name")}
          >
            Team Member <SortIcon k="name" />
          </button>
          <button
            className="text-left flex items-center hover:text-primary"
            onClick={() => toggleSort("status")}
          >
            Account Status <SortIcon k="status" />
          </button>
          <button
            className="text-left flex items-center hover:text-primary"
            onClick={() => toggleSort("reportsTo")}
          >
            Reports To <SortIcon k="reportsTo" />
          </button>
          <span className="w-5" />
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {(reports ?? []).length === 0
                ? "No team members yet"
                : "No team members match your search"}
            </p>
            {(reports ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Click <strong>Add Team Member</strong> to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((r: any) => {
              const reportsTo = r.organization || r.organizationName || "";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setDetailMember(r)}
                  className="w-full text-left grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.email}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm ${statusClasses[r.status] ?? ""}`}>
                    {statusLabels[r.status] ?? r.status}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {reportsTo || "—"}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Sheet
        open={!!detailMember}
        onOpenChange={(open) => {
          if (!open) setDetailMember(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {detailMember && (
            <div className="flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-2">
                <SheetTitle className="sr-only">
                  {detailMember.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col items-center px-6 pt-2 pb-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {getInitials(detailMember.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="mt-4 text-lg font-semibold">
                  {detailMember.name}
                </h3>
                {detailMember.role && (
                  <p className="text-sm text-muted-foreground">
                    {detailMember.role}
                  </p>
                )}
              </div>

              <div className="px-6 pb-6 space-y-6">
                <section>
                  <h4 className="text-sm font-semibold mb-3">
                    Personal Information
                  </h4>
                  <div className="rounded-lg border bg-card divide-y">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium w-16">Email</span>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {detailMember.email}
                      </span>
                    </div>
                    {detailMember.phone && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium w-16">Phone</span>
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {detailMember.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium w-16">
                        Reports
                      </span>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {detailMember.organization ||
                          detailMember.organizationName ||
                          "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium w-16">Status</span>
                      <span
                        className={`text-sm flex-1 ${
                          statusClasses[detailMember.status] ?? ""
                        }`}
                      >
                        {statusLabels[detailMember.status] ??
                          detailMember.status}
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-sm font-semibold mb-3">Weekly Report</h4>
                  <div className="rounded-lg border bg-card divide-y">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm">
                        Who can see your personal Weekly Reports?
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm">
                        Who has "View as Me" access?
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </section>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const m = detailMember;
                      setDetailMember(null);
                      handleEdit(m);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      const id = detailMember.id;
                      setDetailMember(null);
                      handleDelete(id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
