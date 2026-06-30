import { HistoryIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HistoryPage() {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <HistoryIcon className="size-5 text-primary" />
          Post History
        </CardTitle>
        <CardDescription>
          Published and failed posts will appear here once publishing is
          implemented.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          No posts yet
        </div>
      </CardContent>
    </Card>
  );
}
