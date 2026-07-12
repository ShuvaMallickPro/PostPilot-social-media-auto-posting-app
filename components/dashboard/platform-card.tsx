"use client";

import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  Link2OffIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConnectedAccount, PlatformDefinition } from "@/types/platform";

type PlatformCardProps = {
  platform: PlatformDefinition;
  account: ConnectedAccount;
};

function PlatformIcon({
  platformId,
}: {
  platformId: PlatformDefinition["id"];
}) {
  const label = platformId === "linkedin" ? "in" : "fb";

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-sm font-bold uppercase tracking-tight text-foreground">
      {label}
    </div>
  );
}

export function PlatformCard({ platform, account }: PlatformCardProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    window.location.href = platform.connectPath;
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: platform.id }),
      });

      if (!response.ok) {
        throw new Error("Disconnect failed");
      }

      setDialogOpen(false);
      toast.success(`${platform.name} disconnected successfully.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to disconnect ${platform.name}.`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <PlatformIcon platformId={platform.id} />
              <div className="space-y-1">
                <CardTitle className="text-lg">{platform.name}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </div>
            </div>

            <Badge
              variant={account.connected ? "default" : "outline"}
              className={
                account.connected
                  ? "bg-primary/15 text-primary hover:bg-primary/15"
                  : undefined
              }
            >
              {account.connected ? (
                <>
                  <CheckCircle2Icon />
                  Connected
                </>
              ) : platform.comingSoon ? (
                "Coming soon"
              ) : (
                "Not connected"
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {account.connected ? (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {account.accountLabel ?? `${platform.name} account`}
              </p>
              {account.connectedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Connected{" "}
                  {new Date(account.connectedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {platform.comingSoon
                ? "Facebook connection arrives in Milestone 5."
                : "Connect your account to enable publishing from PostPilot."}
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {account.connected ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDialogOpen(true)}
            >
              <Link2OffIcon />
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={!platform.available}>
              <ExternalLinkIcon />
              Connect {platform.name}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={!isDisconnecting}>
          <DialogHeader>
            <DialogTitle>Disconnect {platform.name}?</DialogTitle>
            <DialogDescription>
              You will no longer be able to publish posts to {platform.name}{" "}
              until you reconnect your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
