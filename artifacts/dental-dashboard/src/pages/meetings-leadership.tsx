import { Card, CardContent } from "@/components/ui/card";

export function MeetingsLeadership() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Leadership Team</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Notes and agendas for your weekly leadership team meeting.
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
