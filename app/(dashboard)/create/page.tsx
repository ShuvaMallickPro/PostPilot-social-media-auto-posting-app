import { PenSquareIcon } from "lucide-react";

import { PostEditor } from "@/components/dashboard/post-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreatePostPage() {
  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <PenSquareIcon className="size-5 text-primary" />
          Create Post
        </CardTitle>
        <CardDescription>
          Write once, attach an optional image, then publish to your connected
          platforms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PostEditor />
      </CardContent>
    </Card>
  );
}
