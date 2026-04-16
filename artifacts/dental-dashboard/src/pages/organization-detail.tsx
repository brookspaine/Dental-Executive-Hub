import { useRoute, Link } from "wouter";
import { useGetOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TodoList } from "@/components/todo-list";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  MapPin,
  Users as UsersIcon,
  Activity,
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
        <Card className="min-h-[320px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <TodoList
              storageKey={`org-todos-${org.id}-financials`}
              placeholder="Add a financial to-do…"
            />
          </CardContent>
        </Card>

        <Card className="min-h-[320px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <TodoList
              storageKey={`org-todos-${org.id}-location`}
              placeholder="Add a location to-do…"
            />
          </CardContent>
        </Card>

        <Card className="min-h-[320px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5 text-primary" />
              People
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <TodoList
              storageKey={`org-todos-${org.id}-people`}
              placeholder="Add a people to-do…"
            />
          </CardContent>
        </Card>

        <Card className="min-h-[320px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <TodoList
              storageKey={`org-todos-${org.id}-operations`}
              placeholder="Add an operations to-do…"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
