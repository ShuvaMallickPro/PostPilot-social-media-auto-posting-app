import { Suspense } from "react";
import { Link2Icon } from "lucide-react";

import { AccountsFeedback } from "@/components/dashboard/accounts-feedback";
import { PlatformCard } from "@/components/dashboard/platform-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getConnectedAccountsForUser,
  getPlatformDefinitions,
} from "@/lib/accounts";
import { auth } from "@clerk/nextjs/server";

export default async function AccountsPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const [accounts, platforms] = await Promise.all([
    getConnectedAccountsForUser(userId),
    Promise.resolve(getPlatformDefinitions()),
  ]);

  const connectedCount = accounts.filter((account) => account.connected).length;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <AccountsFeedback />
      </Suspense>

      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Connected Accounts
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Link your social platforms once, then publish from a single dashboard.
          Tokens are stored securely and scoped to your Clerk user.
        </p>
      </section>

      <Card className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)] backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2Icon className="size-4 text-primary" />
            Connection status
          </CardTitle>
          <CardDescription>
            {connectedCount} of {platforms.length} platforms connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            LinkedIn and Twitter / X are live. Facebook Page OAuth ships in a
            later milestone.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {platforms.map((platform) => {
          const account = accounts.find(
            (item) => item.provider === platform.id,
          );

          if (!account) return null;

          return (
            <PlatformCard
              key={platform.id}
              platform={platform}
              account={account}
            />
          );
        })}
      </div>
    </div>
  );
}
