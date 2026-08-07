import { HistoryIcon } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { PostHistoryList } from "@/components/dashboard/post-history-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPostsForUser, toHistoryPosts } from "@/lib/posts";

export default async function HistoryPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const posts = toHistoryPosts(await listPostsForUser(userId));

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <HistoryIcon className="size-5 text-primary" />
          Post History
        </CardTitle>
        <CardDescription>
          Drafts and publish results for your posts, including per-platform
          status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostHistoryList posts={posts} />
      </CardContent>
    </Card>
  );
}
