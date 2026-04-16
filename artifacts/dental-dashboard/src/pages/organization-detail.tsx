import { useRoute, Link } from "wouter";
import { useGetOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  MapPin,
  Users as UsersIcon,
  Activity,
  Phone,
  Mail,
} from "lucide-react";

export function OrganizationDetail() {
  const [, params] = useRoute("/organizations/:id");
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  const { data: org, isLoading } = useGetOrganization(id, {
    query: { enabled: !isNaN(id) },
  });

  if (isLoading || !org) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const annualRevenue = (org.monthlyRevenue ?? 0) * 12;
  const revenuePerPatient =
    org.patientCount && org.patientCount > 0
      ? Math.round((org.monthlyRevenue ?? 0) / org.patientCount)
      : 0;
  const patientsPerProvider =
    org.providerCount && org.providerCount > 0
      ? Math.round((org.patientCount ?? 0) / org.providerCount)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/organizations">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to EDGE
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{org.name}</h2>
              <p className="text-sm text-muted-foreground">
                {org.city}
                {org.city && org.state ? ", " : ""}
                {org.state}
              </p>
            </div>
          </div>
        </div>
        <Badge variant={org.status === "active" ? "default" : "secondary"}>
          {org.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="min-h-[280px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Monthly Revenue</span>
              <span className="text-2xl font-semibold">
                ${(org.monthlyRevenue ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Annual (est.)</span>
              <span className="text-lg font-medium">
                ${annualRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Revenue / Patient</span>
              <span className="text-lg font-medium">
                ${revenuePerPatient.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[280px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-base">
              {org.address || (
                <span className="text-muted-foreground italic">No address on file</span>
              )}
            </div>
            <div className="text-base text-muted-foreground">
              {org.city}
              {org.city && org.state ? ", " : ""}
              {org.state}
            </div>
            {org.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {org.phone}
              </div>
            )}
            {org.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {org.email}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[280px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5 text-primary" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Providers</span>
              <span className="text-2xl font-semibold">{org.providerCount ?? 0}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Patients</span>
              <span className="text-lg font-medium">
                {(org.patientCount ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Patients / Provider</span>
              <span className="text-lg font-medium">
                {patientsPerProvider.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[280px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={org.status === "active" ? "default" : "secondary"}>
                {org.status}
              </Badge>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-base font-medium capitalize">
                {org.category || "edge"}
              </span>
            </div>
            {org.createdAt && (
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Added</span>
                <span className="text-base font-medium">
                  {new Date(org.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
