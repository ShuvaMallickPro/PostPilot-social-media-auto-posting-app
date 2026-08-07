import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { publishPostForUser } from "@/lib/posts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json({ error: "Post id is required" }, { status: 400 });
  }

  try {
    const result = await publishPostForUser(userId, id.trim());

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: result.allSucceeded,
      post: result.post,
    });
  } catch (error) {
    console.error("Failed to publish post:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 },
    );
  }
}
