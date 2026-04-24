import { useState } from "react";
import { useLocation } from "wouter";
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
import {
  Plus,
  Building2,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

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
  category: "edge" | "edge_dso";
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
  category: "edge",
};

export function Organizations() {
  const queryClient = useQueryClient();
  const { data: allOrgs, isLoading } = useListOrganizations();
  const dsoOrgs = allOrgs?.filter((o: any) => o.category === "edge_dso");
  const orgs = allOrgs?.filter((o: any) => !o.category || o.category === "edge");
  const udOrgs = allOrgs?.filter((o: any) => o.category === "urgent_dental");
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const deleteOrg = useDeleteOrganization();

  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OrgFormData>(emptyForm);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const handleSubmit = () => {
    if (!form.name) return;

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
      category: (org.category as "edge" | "edge_dso") || "edge",
    });
    setDialogOpen(true);
  };

  const openAddDialog = (category: "edge" | "edge_dso") => {
    setEditingId(null);
    setForm({ ...emptyForm, category });
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openAddDialog("edge_dso")}>
            <Plus className="h-4 w-4 mr-2" />
            Add EDGE DSO
          </Button>
          <Button onClick={() => openAddDialog("edge")}>
            <Plus className="h-4 w-4 mr-2" />
            Add EDGE Location
          </Button>
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit" : "Add"}{" "}
                {form.category === "edge_dso" ? "EDGE DSO" : "EDGE Location"}
              </DialogTitle>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                {editingId ? "Update" : "Create"}{" "}
                {form.category === "edge_dso" ? "EDGE DSO" : "EDGE Location"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DsoSection
        isLoading={isLoading}
        dsoOrgs={dsoOrgs}
        edgeOrgs={orgs}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <OrgSection
        title=""
        nameLabel="EDGE Locations"
        emptyText="No EDGE locations yet"
        isLoading={isLoading}
        orgs={orgs}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <OrgSection
        title=""
        nameLabel="UD Locations"
        emptyText="No UD locations yet"
        isLoading={isLoading}
        orgs={udOrgs}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

type DsoSectionProps = {
  isLoading: boolean;
  dsoOrgs: any[] | undefined;
  edgeOrgs: any[] | undefined;
  onRowClick: (id: number) => void;
  onEdit: (org: any) => void;
  onDelete: (id: number) => void;
};

function DsoSection({
  isLoading,
  dsoOrgs,
  edgeOrgs,
  onRowClick,
  onEdit,
  onDelete,
}: DsoSectionProps) {
  const totalRevenue = (edgeOrgs ?? []).reduce(
    (sum, o) => sum + (o.monthlyRevenue ?? 0),
    0
  );
  const locationCount = (edgeOrgs ?? []).length;

  return (
    <div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : dsoOrgs && dsoOrgs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DSO</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead className="text-right"># of Locations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dsoOrgs.map((org) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(org.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-primary/10">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        {org.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(totalRevenue / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${((org.monthlyRevenue ?? 0) / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {locationCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={org.status === "active" ? "default" : "secondary"}
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit(org)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Edit DSO"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(org.id)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete DSO"
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
            <div className="p-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No EDGE DSOs yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type OrgSectionProps = {
  title: string;
  nameLabel: string;
  emptyText: string;
  isLoading: boolean;
  orgs: any[] | undefined;
  onRowClick: (id: number) => void;
  onEdit: (org: any) => void;
  onDelete: (id: number) => void;
};

function OrgSection({
  title,
  nameLabel,
  emptyText,
  isLoading,
  orgs,
  onRowClick,
  onEdit,
  onDelete,
}: OrgSectionProps) {
  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {title}
        </h3>
      )}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : orgs && orgs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{nameLabel}</TableHead>
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
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onRowClick(org.id)}
                  >
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
                        {org.city}
                        {org.city && org.state ? ", " : ""}
                        {org.state}
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
                    <TableCell className="text-right">
                      {org.providerCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {(org.patientCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${((org.monthlyRevenue ?? 0) / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={org.status === "active" ? "default" : "secondary"}
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit(org)}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(org.id)}
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
            <div className="p-8 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
