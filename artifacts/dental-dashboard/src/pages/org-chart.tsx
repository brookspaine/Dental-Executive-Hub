import { Card, CardContent } from "@/components/ui/card";
import { Network } from "lucide-react";

export function OrgChart() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Practice Organization Chart
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Accountability and ownership across the practice — who owns what
        </p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Network className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Org chart coming soon
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll build out roles, seats, and accountabilities here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
