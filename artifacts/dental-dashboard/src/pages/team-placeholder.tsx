import { Card, CardContent } from "@/components/ui/card";

type Props = {
  title: string;
  description: string;
};

export function TeamPlaceholder({ title, description }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
