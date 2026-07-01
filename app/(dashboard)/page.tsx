import { currentUser } from "@clerk/nextjs/server";
import { ArrowUpRightIcon, Link2Icon, PenSquareIcon, SendIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          Milestone 3 complete
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Welcome back, {firstName}
        </h2>
        <p className="max-w-2xl text-base text-muted-foreground">
          Write once, publish everywhere. Connect your social accounts and start
          scheduling posts to LinkedIn and Facebook from one dashboard.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button render={<Link href="/create" />} nativeButton={false}>
            <PenSquareIcon />
            Create your first post
          </Button>
          <Button
            variant="outline"
            render={<Link href="/accounts" />}
            nativeButton={false}
          >
            <Link2Icon />
            Connect accounts
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardDescription>Posts drafted</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Drafts waiting to be published.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Successfully sent to all platforms.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardDescription>Connected accounts</CardDescription>
            <CardTitle className="text-3xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              LinkedIn and Facebook connections.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SendIcon className="size-5 text-primary" />
              Quick actions
            </CardTitle>
            <CardDescription>
              Common workflows to get started quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant="outline"
              className="justify-between"
              render={<Link href="/create" />}
              nativeButton={false}
            >
              Compose a new post
              <ArrowUpRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              render={<Link href="/history" />}
              nativeButton={false}
            >
              Review post history
              <ArrowUpRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              render={<Link href="/accounts" />}
              nativeButton={false}
            >
              Manage connected accounts
              <ArrowUpRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">What&apos;s next?</CardTitle>
            <CardDescription>
              Milestone 4 adds LinkedIn OAuth. Milestone 5 adds Facebook Pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Connect LinkedIn from the Accounts page.</p>
            <p>2. Create your first post in Create Post.</p>
            <p>3. Publish to connected platforms when publishing ships.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
