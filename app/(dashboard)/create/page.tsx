import { PenSquareIcon } from "lucide-react";

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
          The post editor will be built in a later milestone. Use this route to
          verify navigation and layout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          Post editor coming soon
        </div>
      </CardContent>
    </Card>
  );
}
