import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDirectReports,
  useListOrganizations,
  useCreateDirectReport,
  useUpdateDirectReport,
  useDeleteDirectReport,
  useListViewAsMeGrants,
  useCreateViewAsMeGrant,
  useDeleteViewAsMeGrant,
  useListAdditionalViewers,
  useCreateAdditionalViewer,
  useDeleteAdditionalViewer,
  getListDirectReportsQueryKey,
  getListViewAsMeGrantsQueryKey,
  getListAdditionalViewersQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  EditableReportPhoto,
  resolveAvatarUrl,
} from "@/components/editable-report-photo";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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
  Send,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";

type ReportFormData = {
  firstName: string;
  lastName: string;
  email: string;
  reportsTo: string;
  hasDirectReports: "yes" | "no";
};

const SELF_REPORTS_TO = "__self__";

const emptyForm: ReportFormData = {
  firstName: "",
  lastName: "",
  email: "",
  reportsTo: SELF_REPORTS_TO,
  hasDirectReports: "no",
};

const CURRENT_USER_NAME = "Brooks Paine";

type SortKey = "name" | "status" | "reportsTo";
type SortDir = "asc" | "desc";

const statusLabels: Record<string, string> = {
  active: "Active",
  invite_not_sent: "Invite Not Sent",
  on_leave: "On Leave",
  inactive: "Inactive",
};

const statusClasses: Record<string, string> = {
  active: "text-emerald-600",
  invite_not_sent: "text-primary",
  on_leave: "text-amber-600",
  inactive: "text-muted-foreground",
};

function formatCompanyLabel(o: any): string {
  const name = (o?.name ?? "").trim();
  const cat = o?.category;
  if (cat === "edge_dso") return "EDGE DSO";
  if (cat === "edge") return `EDGE - ${name}`;
  return name;
}

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
  const { data: organizations } = useListOrganizations();
  const createReport = useCreateDirectReport();
  const updateReport = useUpdateDirectReport();
  const deleteReport = useDeleteDirectReport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReportFormData>(emptyForm);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detailMember, setDetailMember] = useState<any | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [weeklyReminders, setWeeklyReminders] = useState(true);
  const [viewAsMeOpen, setViewAsMeOpen] = useState(false);
  const [viewAsMeSearch, setViewAsMeSearch] = useState("");
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersSearch, setViewersSearch] = useState("");
  const [viewersAdding, setViewersAdding] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListDirectReportsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleSubmit = () => {
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    if (!fullName || !form.email) return;

    const reportsToName =
      form.reportsTo === SELF_REPORTS_TO
        ? CURRENT_USER_NAME
        : form.reportsTo;

    const data: any = {
      name: fullName,
      role: editingId
        ? (reports as any[] | undefined)?.find((r) => r.id === editingId)?.role ||
          "Team Member"
        : "Team Member",
      email: form.email,
      organization: reportsToName || undefined,
      organizationId: undefined,
      status: editingId ? undefined : "invite_not_sent",
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
    const parts = (r.name ?? "").trim().split(/\s+/);
    const firstName = parts.shift() ?? "";
    const lastName = parts.join(" ");
    const reportsToValue = r.organization || r.organizationName || "";
    setEditingId(r.id);
    setForm({
      firstName,
      lastName,
      email: r.email ?? "",
      reportsTo:
        !reportsToValue || reportsToValue === CURRENT_USER_NAME
          ? SELF_REPORTS_TO
          : reportsToValue,
      hasDirectReports: "no",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteReport.mutate({ id }, { onSuccess: invalidate });
  };

  const visible = useMemo(() => {
    const list = (reports ?? []) as any[];
    const q = search.trim().toLowerCase();
    const orgFiltered =
      orgFilter === "all"
        ? list
        : list.filter(
            (r) =>
              ((r.organization || r.organizationName || "") as string)
                .trim()
                .toLowerCase() === orgFilter.trim().toLowerCase(),
          );
    const filtered = q
      ? orgFiltered.filter(
          (r) =>
            r.name?.toLowerCase().includes(q) ||
            r.email?.toLowerCase().includes(q) ||
            r.role?.toLowerCase().includes(q) ||
            (r.organization || r.organizationName || "")
              .toLowerCase()
              .includes(q)
        )
      : orgFiltered;
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
  }, [reports, search, sortKey, sortDir, orgFilter]);

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
        <h2 className="text-2xl font-bold tracking-tight">Manage Teams</h2>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <button className="flex items-center gap-1.5 text-primary hover:underline">
            <Shield className="h-4 w-4" />
            Administrators
          </button>
          <button
            onClick={() => setNotificationsOpen(true)}
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
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
            <DialogContent className="max-w-md">
              <DialogHeader className="space-y-1">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Manage Team Members
                </p>
                <DialogTitle className="text-2xl">
                  {editingId ? "Edit Team Member" : "Add Team Member"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Who do they report to?
                  </Label>
                  <Select
                    value={form.reportsTo}
                    onValueChange={(v) =>
                      setForm({ ...form, reportsTo: v })
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELF_REPORTS_TO}>
                        <span className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                              {getInitials(CURRENT_USER_NAME)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {CURRENT_USER_NAME}{" "}
                            <span className="text-muted-foreground">(me)</span>
                          </span>
                        </span>
                      </SelectItem>
                      {((reports as any[] | undefined) ?? [])
                        .filter((r) => r.id !== editingId)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.name}>
                            <span className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                                  {getInitials(r.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{r.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Do they have direct reports?
                  </Label>
                  <RadioGroup
                    value={form.hasDirectReports}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        hasDirectReports: v as "yes" | "no",
                      })
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="dr-yes" />
                      <Label
                        htmlFor="dr-yes"
                        className="font-normal cursor-pointer"
                      >
                        Yes, they lead at least one person.
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="dr-no" />
                      <Label
                        htmlFor="dr-no"
                        className="font-normal cursor-pointer"
                      >
                        No, they have no direct reports.
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      !form.firstName.trim() ||
                      !form.lastName.trim() ||
                      !form.email.trim()
                    }
                    className="px-8"
                  >
                    Save & Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:w-72">
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Filter by company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {(organizations ?? [])
                .slice()
                .sort((a: any, b: any) =>
                  formatCompanyLabel(a).localeCompare(formatCompanyLabel(b)),
                )
                .map((o: any) => (
                  <SelectItem key={o.id} value={(o.name ?? "").trim()}>
                    {formatCompanyLabel(o)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
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
                      {resolveAvatarUrl(r.avatarUrl) && (
                        <AvatarImage
                          src={resolveAvatarUrl(r.avatarUrl) ?? undefined}
                          alt={r.name}
                        />
                      )}
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

      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl">Notification Preferences</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <section className="space-y-3">
              <h4 className="font-bold text-base">Get notified. Build habits.</h4>
              <p className="text-sm text-muted-foreground">
                Building a habit is hard! Get help with reminders from Brooks
                Paine. Turning this setting ON will allow the system to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  Email your team every Friday, reminding them to fill out a
                  report for the week.
                </li>
                <li>
                  Email your leaders every Monday, reminding them to review
                  their team's reports.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-base">Allow Weekly Reminders</h4>
              <div className="flex items-start gap-3">
                <Switch
                  checked={weeklyReminders}
                  onCheckedChange={setWeeklyReminders}
                  className="mt-0.5"
                />
                <Label className="text-sm font-normal leading-snug cursor-pointer">
                  Allow weekly report reminder emails for you and your
                  organization.
                </Label>
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

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
                <EditableReportPhoto report={detailMember} />
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
                {detailMember.status === "invite_not_sent" && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        Invite team member!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        They'll receive an email invitation to create their
                        account.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary/10 shrink-0"
                      disabled={updateReport.isPending}
                      onClick={() => {
                        const id = detailMember.id;
                        updateReport.mutate(
                          { id, data: { status: "active" } as any },
                          {
                            onSuccess: () => {
                              invalidate();
                              setDetailMember((prev: any) =>
                                prev && prev.id === id
                                  ? { ...prev, status: "active" }
                                  : prev
                              );
                            },
                          }
                        );
                      }}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Send Invite
                    </Button>
                  </div>
                )}
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
                      onClick={() => {
                        setViewersSearch("");
                        setViewersAdding(false);
                        setViewersOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm">
                        Who can see your personal Weekly Reports?
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewAsMeSearch("");
                        setViewAsMeOpen(true);
                      }}
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

      <ViewAsMeSheet
        open={viewAsMeOpen}
        onOpenChange={setViewAsMeOpen}
        member={detailMember}
        allReports={(reports as any[] | undefined) ?? []}
        search={viewAsMeSearch}
        onSearchChange={setViewAsMeSearch}
      />

      <AdditionalViewersSheet
        open={viewersOpen}
        onOpenChange={setViewersOpen}
        member={detailMember}
        allReports={(reports as any[] | undefined) ?? []}
        search={viewersSearch}
        onSearchChange={setViewersSearch}
        adding={viewersAdding}
        onAddingChange={setViewersAdding}
      />
    </div>
  );
}

function AdditionalViewersSheet({
  open,
  onOpenChange,
  member,
  allReports,
  search,
  onSearchChange,
  adding,
  onAddingChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any | null;
  allReports: any[];
  search: string;
  onSearchChange: (v: string) => void;
  adding: boolean;
  onAddingChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const memberId = member?.id ?? 0;
  const enabled = open && !!member;

  const { data: viewers } = useListAdditionalViewers(memberId, {
    query: { enabled },
  });
  const addMut = useCreateAdditionalViewer();
  const removeMut = useDeleteAdditionalViewer();

  const invalidateViewers = () => {
    queryClient.invalidateQueries({
      queryKey: getListAdditionalViewersQueryKey(memberId),
    });
  };

  if (!member) return null;

  const viewerIds = new Set(viewers ?? []);
  const candidates = allReports.filter((r) => r.id !== member.id);
  const q = search.trim().toLowerCase();
  const matches = q
    ? candidates.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q),
      )
    : candidates;
  const granted = candidates.filter((r) => viewerIds.has(r.id));
  const firstName = (member.name ?? "").split(" ")[0] || "they";
  const possessive =
    firstName.endsWith("s") ? `${firstName}'` : `${firstName}'s`;

  const showAddList = adding || q.length > 0;

  const toggleViewer = (id: number) => {
    if (viewerIds.has(id)) {
      removeMut.mutate(
        { id: memberId, viewerReportId: id },
        { onSuccess: invalidateViewers },
      );
    } else {
      addMut.mutate(
        { id: memberId, data: { viewerReportId: id } },
        { onSuccess: invalidateViewers },
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="sr-only">
            Who can see {possessive} personal Weekly Reports
          </SheetTitle>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="px-6 pt-4 pb-6 space-y-4">
          <div className="rounded-xl bg-muted/50 px-5 py-5 text-center space-y-2">
            <h3 className="text-lg font-semibold">
              Who can see {possessive} personal Weekly Reports
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As the owner, {possessive} personal Weekly Reports do not get
              shared by default. To share with team members, add them as an
              Additional Viewer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search for Team Member"
                className="pl-9 h-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 whitespace-nowrap"
              onClick={() => {
                onSearchChange("");
                onAddingChange(!adding);
              }}
            >
              {adding ? "Done" : "Add Additional Viewer"}
            </Button>
          </div>

          {showAddList ? (
            matches.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground italic py-6">
                {q
                  ? `No team members match "${search}".`
                  : "No team members available."}
              </p>
            ) : (
              <div className="rounded-lg border bg-card divide-y">
                {matches.map((r) => {
                  const isViewer = viewerIds.has(r.id);
                  const url = resolveAvatarUrl(r.avatarUrl);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleViewer(r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                    >
                      <Avatar className="h-9 w-9">
                        {url && <AvatarImage src={url} alt={r.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.email}
                        </div>
                      </div>
                      {isViewer ? (
                        <span className="flex items-center gap-1 text-xs text-primary font-medium">
                          <Check className="h-4 w-4" />
                          Added
                        </span>
                      ) : (
                        <span className="text-xs text-primary font-medium">
                          Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : granted.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground italic py-6">
              No one can view {possessive} personal Weekly Reports.
            </p>
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {granted.map((r) => {
                const url = resolveAvatarUrl(r.avatarUrl);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar className="h-9 w-9">
                      {url && <AvatarImage src={url} alt={r.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleViewer(r.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ViewAsMeSheet({
  open,
  onOpenChange,
  member,
  allReports,
  search,
  onSearchChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any | null;
  allReports: any[];
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const queryClient = useQueryClient();
  const memberId = member?.id ?? 0;
  const enabled = open && !!member;

  const { data: grants } = useListViewAsMeGrants(memberId, {
    query: { enabled },
  });
  const grantMut = useCreateViewAsMeGrant();
  const revokeMut = useDeleteViewAsMeGrant();

  const invalidateGrants = () => {
    queryClient.invalidateQueries({
      queryKey: getListViewAsMeGrantsQueryKey(memberId),
    });
  };

  if (!member) return null;

  const grantedIds = new Set(grants ?? []);
  const candidates = allReports.filter((r) => r.id !== member.id);
  const q = search.trim().toLowerCase();
  const matches = q
    ? candidates.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q),
      )
    : candidates;
  const granted = candidates.filter((r) => grantedIds.has(r.id));
  const firstName = (member.name ?? "").split(" ")[0] || "they";

  const toggleGrant = (id: number) => {
    if (grantedIds.has(id)) {
      revokeMut.mutate(
        { id: memberId, granteeReportId: id },
        { onSuccess: invalidateGrants },
      );
    } else {
      grantMut.mutate(
        { id: memberId, data: { granteeReportId: id } },
        { onSuccess: invalidateGrants },
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="sr-only">"View as Me" Access</SheetTitle>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="px-6 pt-4 pb-6 space-y-4">
          <div className="rounded-xl bg-muted/50 px-5 py-5 text-center space-y-2">
            <h3 className="text-lg font-semibold">"View as Me" Access</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These team members have the ability to see any Weekly Report that{" "}
              {firstName} has access to, such as their direct reports',
              extended team's, and anyone who has added {firstName} as their
              Additional Viewer. This is helpful if {firstName} needs someone
              to review Weekly Reports on their behalf.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search for Team Member"
              className="pl-9 h-10"
            />
          </div>

          {q ? (
            matches.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground italic py-6">
                No team members match "{search}".
              </p>
            ) : (
              <div className="rounded-lg border bg-card divide-y">
                {matches.map((r) => {
                  const isGranted = grantedIds.has(r.id);
                  const url = resolveAvatarUrl(r.avatarUrl);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => toggleGrant(r.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
                    >
                      <Avatar className="h-9 w-9">
                        {url && <AvatarImage src={url} alt={r.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(r.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.email}
                        </div>
                      </div>
                      {isGranted ? (
                        <span className="flex items-center gap-1 text-xs text-primary font-medium">
                          <Check className="h-4 w-4" />
                          Granted
                        </span>
                      ) : (
                        <span className="text-xs text-primary font-medium">
                          Grant
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : granted.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground italic py-6">
              No one has "View as Me" access.
            </p>
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {granted.map((r) => {
                const url = resolveAvatarUrl(r.avatarUrl);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar className="h-9 w-9">
                      {url && <AvatarImage src={url} alt={r.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(r.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGrant(r.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
