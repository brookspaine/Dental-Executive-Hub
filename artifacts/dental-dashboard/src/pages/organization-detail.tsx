import { useRoute, Link } from "wouter";
import { useGetOrganization } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryActionCard } from "@/components/category-action-card";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  MapPin,
  Users as UsersIcon,
  Settings,
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
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const scopeId = `org-${org.id}`;

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
        {org.beltClassification ? (
          <Badge
            className={
              org.beltClassification === "white"
                ? "bg-white text-slate-900 border border-slate-300 hover:bg-white"
                : org.beltClassification === "blue"
                ? "bg-blue-600 text-white border-transparent hover:bg-blue-600"
                : org.beltClassification === "brown"
                ? "bg-amber-800 text-white border-transparent hover:bg-amber-800"
                : "bg-black text-white border-transparent hover:bg-black"
            }
          >
            {`${org.beltClassification.charAt(0).toUpperCase()}${org.beltClassification.slice(1)} Belt`}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No belt classification</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Financials", icon: DollarSign },
          { title: "Location", icon: MapPin },
          { title: "People", icon: UsersIcon },
          { title: "Operations", icon: Settings },
        ].map(({ title, icon: Icon }) => (
          <CategoryActionCard
            key={title}
            title={title}
            icon={Icon}
            scopeId={scopeId}
          />
        ))}
      </div>
    </div>
  );
}
