import { Link2Icon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AccountsPage() {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Link2Icon className="size-5 text-primary" />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          LinkedIn and Facebook OAuth connections will be configured in
          Milestone 4 and 5.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          No accounts connected yet
        </div>
      </CardContent>
    </Card>
  );
}
