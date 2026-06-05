import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="flex-1">
      <CardContent className="py-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
