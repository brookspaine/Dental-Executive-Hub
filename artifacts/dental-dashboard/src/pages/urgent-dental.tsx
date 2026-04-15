import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrganizations,
  useUpdateOrganization,
  getListOrganizationsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  UserCheck,
  DollarSign,
  Pencil,
  X,
  Save,
  Zap,
} from "lucide-react";

export function UrgentDental() {
  const queryClient = useQueryClient();
  const { data: allOrgs, isLoading } = useListOrganizations();
  const location = allOrgs?.find((o: any) => o.category === "urgent_dental");
  const updateOrg = useUpdateOrganization();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    providerCount: 0,
    patientCount: 0,
    monthlyRevenue: 0,
    status: "active" as "active" | "inactive",
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const startEditing = () => {
    if (!location) return;
    setForm({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      phone: location.phone ?? "",
      email: location.email ?? "",
      providerCount: location.providerCount ?? 0,
      patientCount: location.patientCount ?? 0,
      monthlyRevenue: location.monthlyRevenue ?? 0,
      status: (location.status as "active" | "inactive") ?? "active",
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!location) return;
    updateOrg.mutate(
      {
        id: location.id,
        data: {
          ...form,
          providerCount: Number(form.providerCount),
          patientCount: Number(form.patientCount),
          monthlyRevenue: Number(form.monthlyRevenue),
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditing(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Urgent Dental</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Single urgent dental care location
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No urgent dental location configured</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Urgent Dental</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Single urgent dental care location
          </p>
        </div>
        {!editing && (
          <Button onClick={startEditing} variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Location
          </Button>
        )}
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Location Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
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
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, providerCount: +e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Patients</Label>
                  <Input
                    type="number"
                    value={form.patientCount}
                    onChange={(e) => setForm({ ...form, patientCount: +e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Revenue ($)</Label>
                  <Input
                    type="number"
                    value={form.monthlyRevenue}
                    onChange={(e) => setForm({ ...form, monthlyRevenue: +e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-50">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {location.address}, {location.city}, {location.state}
                    </div>
                  </div>
                </div>
                <Badge variant={location.status === "active" ? "default" : "secondary"}>
                  {location.status}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{location.providerCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Providers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{(location.patientCount ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Patients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-50">
                    <DollarSign className="h-4 w-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${((location.monthlyRevenue ?? 0) / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{location.phone || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{location.email || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{location.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">City / State</p>
                    <p className="text-sm font-medium">{location.city}, {location.state}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
