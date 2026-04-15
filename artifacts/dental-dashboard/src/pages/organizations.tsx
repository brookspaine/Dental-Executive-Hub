import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  getListOrganizationsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Pencil, Trash2, MapPin, Phone, Mail } from "lucide-react";

type OrgFormData = {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  providerCount: number;
  patientCount: number;
  monthlyRevenue: number;
  status: "active" | "inactive";
};

const emptyForm: OrgFormData = {
  name: "",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  providerCount: 0,
  patientCount: 0,
  monthlyRevenue: 0,
  status: "active",
};

export function Organizations() {
  const queryClient = useQueryClient();
  const { data: allOrgs, isLoading } = useListOrganizations();
  const orgs = allOrgs?.filter((o: any) => !o.category || o.category === "edge");
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OrgFormData>(emptyForm);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleSubmit = () => {
    if (!form.name || !form.address || !form.city || !form.state) return;

    if (editingId) {
      updateOrg.mutate(
        { id: editingId, data: form },
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
      createOrg.mutate(
        { data: form },
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

  const handleEdit = (org: any) => {
    setEditingId(org.id);
    setForm({
      name: org.name,
      address: org.address,
      city: org.city,
      state: org.state,
      phone: org.phone || "",
      email: org.email || "",
      providerCount: org.providerCount || 0,
      patientCount: org.patientCount || 0,
      monthlyRevenue: org.monthlyRevenue || 0,
      status: org.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteOrg.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">EDGE</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your dental practice locations
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
              Add EDGE Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit EDGE Location" : "Add EDGE Location"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Practice name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>State</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label>Providers</Label>
                  <Input
                    type="number"
                    value={form.providerCount}
                    onChange={(e) =>
                      setForm({ ...form, providerCount: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Patients</Label>
                  <Input
                    type="number"
                    value={form.patientCount}
                    onChange={(e) =>
                      setForm({ ...form, patientCount: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Revenue</Label>
                  <Input
                    type="number"
                    value={form.monthlyRevenue}
                    onChange={(e) =>
                      setForm({ ...form, monthlyRevenue: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="mt-2">
                {editingId ? "Update" : "Create"} EDGE Location
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : orgs && orgs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EDGE Location</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                  <TableHead className="text-right">Patients</TableHead>
                  <TableHead className="text-right">Monthly Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <MapPin className="h-3 w-3" />
                        {org.city}, {org.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-sm text-muted-foreground">
                        {org.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {org.phone}
                          </div>
                        )}
                        {org.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {org.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{org.providerCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {(org.patientCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${((org.monthlyRevenue ?? 0) / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.status === "active" ? "default" : "secondary"}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(org)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No EDGE locations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first dental practice to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
