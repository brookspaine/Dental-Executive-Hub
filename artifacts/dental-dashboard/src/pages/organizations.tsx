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
  DollarSign,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionItems } from "@/contexts/action-items-context";

type Belt = "white" | "blue" | "brown" | "black";

type OrgCategory = "edge" | "edge_dso" | "urgent_dental";

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
  category: OrgCategory;
  beltClassification: Belt | null;
};

const categoryLabels: Record<OrgCategory, string> = {
  edge: "EDGE Location",
  edge_dso: "EDGE DSO",
  urgent_dental: "UD Location",
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
  beltClassification: null,
};

const BELT_OPTIONS: Belt[] = ["white", "blue", "brown", "black"];

const beltClasses: Record<Belt, string> = {
  white: "bg-white text-slate-900 border border-slate-300 hover:bg-white",
  blue: "bg-blue-600 text-white border-transparent hover:bg-blue-600",
  brown: "bg-amber-800 text-white border-transparent hover:bg-amber-800",
  black: "bg-black text-white border-transparent hover:bg-black",
};

function beltLabel(belt: Belt): string {
  return `${belt.charAt(0).toUpperCase()}${belt.slice(1)} Belt`;
}

function BeltBadge({ belt }: { belt: string | null | undefined }) {
  if (!belt || !(BELT_OPTIONS as string[]).includes(belt)) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return <Badge className={beltClasses[belt as Belt]}>{beltLabel(belt as Belt)}</Badge>;
}

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
  const [editMode, setEditMode] = useState(false);

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
      category: (org.category as OrgCategory) || "edge",
      beltClassification: (BELT_OPTIONS as string[]).includes(org.beltClassification)
        ? (org.beltClassification as Belt)
        : null,
    });
    setDialogOpen(true);
  };

  const openAddDialog = (category: OrgCategory) => {
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
          <Button
            variant={editMode ? "default" : "outline"}
            size="icon"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? "Done editing" : "Edit"}
            aria-pressed={editMode}
            title={editMode ? "Done editing" : "Edit"}
          >
            <Pencil className="h-4 w-4" />
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
                {editingId ? "Edit" : "Add"} {categoryLabels[form.category]}
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
                <Label>Belt Classification</Label>
                <Select
                  value={form.beltClassification ?? "__none__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      beltClassification: v === "__none__" ? null : (v as Belt),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {BELT_OPTIONS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {beltLabel(b)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="mt-2">
                {editingId ? "Update" : "Create"} {categoryLabels[form.category]}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DsoSection
        isLoading={isLoading}
        dsoOrgs={dsoOrgs}
        edgeOrgs={orgs}
        editMode={editMode}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => openAddDialog("edge_dso")}
        addLabel="Add EDGE DSO"
      />

      <OrgSection
        title=""
        nameLabel="EDGE Locations"
        emptyText="No EDGE locations yet"
        isLoading={isLoading}
        orgs={orgs}
        editMode={editMode}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => openAddDialog("edge")}
        addLabel="Add EDGE Location"
      />

      <OrgSection
        title=""
        nameLabel="UD Locations"
        emptyText="No UD locations yet"
        isLoading={isLoading}
        orgs={udOrgs}
        editMode={editMode}
        onRowClick={(id) => setLocation(`/organizations/${id}`)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => openAddDialog("urgent_dental")}
        addLabel="Add UD Location"
      />

      {[
        { title: "Financials", icon: DollarSign },
        { title: "Location", icon: MapPin },
        { title: "People", icon: Users },
        { title: "Operations", icon: Settings },
      ].map(({ title, icon: Icon }) => (
        <CategoryActionCard key={title} title={title} icon={Icon} />
      ))}
    </div>
  );
}

function CategoryActionCard({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { items, addItem, toggleDone, removeItem } = useActionItems();
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const categoryItems = items.filter((i) => i.source === title);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addItem({ title: newTitle, source: title });
    setNewTitle("");
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
        aria-expanded={expanded}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold flex-1">{title}</div>
        {categoryItems.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {categoryItems.length}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {categoryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No action items yet. Add one below.
            </p>
          ) : (
            <ul className="space-y-2">
              {categoryItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 group py-1"
                >
                  <Checkbox
                    checked={!!item.done}
                    onCheckedChange={() => toggleDone(item.id)}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.done
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove action item"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`Add ${title.toLowerCase()} action item…`}
              className="h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newTitle.trim()}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

type DsoSectionProps = {
  isLoading: boolean;
  dsoOrgs: any[] | undefined;
  edgeOrgs: any[] | undefined;
  editMode: boolean;
  onRowClick: (id: number) => void;
  onEdit: (org: any) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  addLabel: string;
};

function DsoSection({
  isLoading,
  dsoOrgs,
  edgeOrgs,
  editMode,
  onRowClick,
  onEdit,
  onDelete,
  onAdd,
  addLabel,
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
                  <TableHead>Belt Classification</TableHead>
                  {editMode && <TableHead className="w-20"></TableHead>}
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
                      <BeltBadge belt={org.beltClassification} />
                    </TableCell>
                    {editMode && (
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
                    )}
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
          {editMode && (
            <div className="border-t p-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {addLabel}
              </Button>
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
  editMode: boolean;
  onRowClick: (id: number) => void;
  onEdit: (org: any) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  addLabel: string;
};

function OrgSection({
  title,
  nameLabel,
  emptyText,
  isLoading,
  orgs,
  editMode,
  onRowClick,
  onEdit,
  onDelete,
  onAdd,
  addLabel,
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
                  <TableHead className="text-right">EBITDA</TableHead>
                  <TableHead>Belt Classification</TableHead>
                  {editMode && <TableHead className="w-20"></TableHead>}
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
                    <TableCell className="text-right font-medium">
                      ${((org.monthlyRevenue ?? 0) / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell>
                      <BeltBadge belt={org.beltClassification} />
                    </TableCell>
                    {editMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEdit(org)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(org.id)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    )}
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
          {editMode && (
            <div className="border-t p-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                {addLabel}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
