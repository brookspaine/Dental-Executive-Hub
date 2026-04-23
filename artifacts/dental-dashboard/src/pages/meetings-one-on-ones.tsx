import { Card, CardContent } from "@/components/ui/card";

export function MeetingsOneOnOnes() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">1-on-1s</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track your recurring 1-on-1 meetings with each direct report.
        </p>
      </div>
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
