import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDirectReports,
  useCreateDirectReport,
  useUpdateDirectReport,
  useDeleteDirectReport,
  useListOrganizations,
  getListDirectReportsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Users, Mail, Phone, Star } from "lucide-react";

type ReportFormData = {
  name: string;
  role: string;
  email: string;
  phone: string;
  organizationId: number | undefined;
  status: "active" | "on_leave" | "inactive";
  hireDate: string;
  performanceRating: number | undefined;
};

const emptyForm: ReportFormData = {
  name: "",
  role: "",
  email: "",
  phone: "",
  organizationId: undefined,
  status: "active",
  hireDate: "",
  performanceRating: undefined,
};

export function DirectReports() {
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useListDirectReports();
  const { data: orgs } = useListOrganizations();
  const createReport = useCreateDirectReport();
  const updateReport = useUpdateDirectReport();
  const deleteReport = useDeleteDirectReport();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReportFormData>(emptyForm);

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
      organizationId: form.organizationId,
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
      organizationId: r.organizationId || undefined,
      status: r.status,
      hireDate: r.hireDate || "",
      performanceRating: r.performanceRating || undefined,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteReport.mutate({ id }, { onSuccess: invalidate });
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const statusColors: Record<string, string> = {
    active: "default",
    on_leave: "secondary",
    inactive: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Direct Reports</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your leadership team across all locations
          </p>
        </div>
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
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Direct Report" : "Add Direct Report"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="e.g. Office Manager"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    type="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Organization</Label>
                  <Select
                    value={form.organizationId?.toString() || ""}
                    onValueChange={(v) =>
                      setForm({ ...form, organizationId: v ? parseInt(v) : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select org" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs?.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({ ...form, status: v as "active" | "on_leave" | "inactive" })
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
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
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
                        performanceRating: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleSubmit} className="mt-2">
                {editingId ? "Update" : "Add"} Direct Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Card key={r.id} className="group relative">
              <CardContent className="p-5">
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => handleEdit(r)}
                    aria-label={`Edit ${r.name}`}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    aria-label={`Delete ${r.name}`}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(r.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.role}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{r.email}</span>
                  </div>
                  {r.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{r.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusColors[r.status] as any}
                      className="text-[10px]"
                    >
                      {r.status.replace("_", " ")}
                    </Badge>
                    {r.organizationName && (
                      <span className="text-[10px] text-muted-foreground">
                        {r.organizationName}
                      </span>
                    )}
                  </div>
                  {r.performanceRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-medium">{r.performanceRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No direct reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first team member to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
