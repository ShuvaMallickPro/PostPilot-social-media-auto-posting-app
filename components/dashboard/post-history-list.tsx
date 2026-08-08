"use client";

import {
  AlertCircleIcon,
  EyeIcon,
  HistoryIcon,
  ImageIcon,
  Loader2Icon,
  SendIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HISTORY_CONTENT_PREVIEW_LENGTH,
  isPostPlatformStatus,
  isPostStatus,
  POST_PLATFORM_STATUS,
  POST_PLATFORM_STATUS_LABELS,
  POST_STATUS,
  POST_STATUS_LABELS,
} from "@/lib/constants/posts";
import { PLATFORM_DEFINITIONS } from "@/lib/constants/platforms";
import { cn } from "@/lib/utils";
import type { HistoryPost, HistoryPlatformRow } from "@/types/history";
import { isPlatformId } from "@/types/platform";

type PostHistoryListProps = {
  posts: HistoryPost[];
};

type PublishApiResponse = {
  success?: boolean;
  error?: string;
  post?: HistoryPost;
};

function formatPostDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function previewContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= HISTORY_CONTENT_PREVIEW_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, HISTORY_CONTENT_PREVIEW_LENGTH).trimEnd()}…`;
}

function postStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === POST_STATUS.published) return "default";
  if (status === POST_STATUS.failed) return "destructive";
  if (status === POST_STATUS.publishing) return "secondary";
  return "outline";
}

function platformStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === POST_PLATFORM_STATUS.published) return "default";
  if (status === POST_PLATFORM_STATUS.failed) return "destructive";
  return "outline";
}

function postStatusLabel(status: string): string {
  if (isPostStatus(status)) return POST_STATUS_LABELS[status];
  return status;
}

function platformStatusLabel(status: string): string {
  if (isPostPlatformStatus(status)) return POST_PLATFORM_STATUS_LABELS[status];
  return status;
}

function platformDisplayName(platform: string): string {
  if (isPlatformId(platform)) return PLATFORM_DEFINITIONS[platform].name;
  return platform;
}

function platformShortLabel(platform: string): string {
  if (platform === "linkedin") return "in";
  if (platform === "twitter") return "𝕏";
  if (platform === "facebook") return "fb";
  return platform.slice(0, 2);
}

function canPublishPost(post: HistoryPost): boolean {
  return post.platforms.some(
    (row) =>
      row.status === POST_PLATFORM_STATUS.pending ||
      row.status === POST_PLATFORM_STATUS.failed,
  );
}

function PlatformStatusChip({ row }: { row: HistoryPlatformRow }) {
  const title =
    row.status === POST_PLATFORM_STATUS.failed && row.error
      ? row.error
      : `${platformDisplayName(row.platform)}: ${platformStatusLabel(row.status)}`;

  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs text-foreground"
    >
      <span className="flex size-5 items-center justify-center rounded-md border border-border bg-background text-[10px] font-bold uppercase">
        {platformShortLabel(row.platform)}
      </span>
      <span className="hidden sm:inline">
        {platformDisplayName(row.platform)}
      </span>
      <Badge variant={platformStatusBadgeVariant(row.status)}>
        {platformStatusLabel(row.status)}
      </Badge>
    </span>
  );
}

function FailedErrors({ platforms }: { platforms: HistoryPlatformRow[] }) {
  const failed = platforms.filter(
    (row) => row.status === POST_PLATFORM_STATUS.failed && row.error,
  );

  if (failed.length === 0) return null;

  const needsReconnect = failed.some((row) =>
    (row.error ?? "").toLowerCase().includes("reconnect"),
  );

  return (
    <div className="space-y-2">
      <div className="space-y-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {failed.map((row) => (
          <p key={row.id} className="flex gap-2">
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <span className="font-medium">
                {platformDisplayName(row.platform)}:
              </span>{" "}
              {row.error}
            </span>
          </p>
        ))}
      </div>
      {needsReconnect ? (
        <p className="text-xs text-muted-foreground">
          Fix:{" "}
          <Link
            href="/accounts"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Accounts → Disconnect Twitter / X → Connect again
          </Link>
          , then click Retry publish.
        </p>
      ) : null}
    </div>
  );
}

export function PostHistoryList({ posts }: PostHistoryListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<HistoryPost | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const handlePublish = async (post: HistoryPost) => {
    setPublishingId(post.id);

    try {
      const response = await fetch(`/api/posts/${post.id}/publish`, {
        method: "POST",
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as PublishApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish post");
      }

      if (data.success) {
        toast.success("Published to your connected platforms.");
      } else {
        const firstError = data.post?.platforms.find(
          (row) => row.status === POST_PLATFORM_STATUS.failed && row.error,
        )?.error;
        toast.error(
          firstError ?? "Publish finished with errors. Check status.",
        );
      }

      if (selected?.id === post.id && data.post) {
        setSelected(data.post);
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post.",
      );
    } finally {
      setPublishingId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <HistoryIcon className="mx-auto size-8 text-muted-foreground/70" />
        <p className="mt-3 text-sm font-medium text-foreground">No posts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a post on the Create page — it will show up here with status.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {posts.map((post) => {
          const showPublish = canPublishPost(post);
          const isPublishing = publishingId === post.id;

          return (
            <li
              key={post.id}
              className={cn(
                "rounded-xl border border-border/80 bg-card/60 p-4 shadow-xs",
                post.status === POST_STATUS.failed && "border-destructive/40",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={postStatusBadgeVariant(post.status)}>
                      {postStatusLabel(post.status)}
                    </Badge>
                    <time
                      dateTime={post.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {formatPostDate(post.createdAt)}
                    </time>
                    {post.imageUrl ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="size-3.5" />
                        Image
                      </span>
                    ) : null}
                  </div>

                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {previewContent(post.content)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {post.platforms.map((row) => (
                      <PlatformStatusChip key={row.id} row={row} />
                    ))}
                  </div>

                  <FailedErrors platforms={post.platforms} />
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 self-start">
                  {showPublish ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPublishing || publishingId !== null}
                      onClick={() => void handlePublish(post)}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Publishing…
                        </>
                      ) : (
                        <>
                          <SendIcon className="size-4" />
                          {post.status === POST_STATUS.failed
                            ? "Retry publish"
                            : "Publish"}
                        </>
                      )}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(post)}
                  >
                    <EyeIcon className="size-4" />
                    View
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  Post detail
                  <Badge variant={postStatusBadgeVariant(selected.status)}>
                    {postStatusLabel(selected.status)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Created {formatPostDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {selected.content}
                </p>

                {selected.imageUrl ? (
                  <img
                    src={selected.imageUrl}
                    alt="Attached post media"
                    className="max-h-64 w-full rounded-lg border border-border object-cover"
                  />
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Platforms
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.platforms.map((row) => (
                      <PlatformStatusChip key={row.id} row={row} />
                    ))}
                  </div>
                  <FailedErrors platforms={selected.platforms} />
                </div>

                {canPublishPost(selected) ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={publishingId !== null}
                    onClick={() => void handlePublish(selected)}
                  >
                    {publishingId === selected.id ? (
                      <>
                        <Loader2Icon className="animate-spin" />
                        Publishing…
                      </>
                    ) : (
                      <>
                        <SendIcon />
                        {selected.status === POST_STATUS.failed
                          ? "Retry publish"
                          : "Publish to networks"}
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
