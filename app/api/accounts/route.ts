import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  disconnectUserAccount,
  getConnectedAccountsForUser,
} from "@/lib/accounts";
import { isPlatformId, type PlatformId } from "@/types/platform";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await getConnectedAccountsForUser(userId);

  return NextResponse.json({ accounts });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let provider: PlatformId | undefined;

  try {
    const body = (await req.json()) as { provider?: PlatformId };
    provider = body.provider;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!provider || !isPlatformId(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const disconnected = await disconnectUserAccount(userId, provider);

    if (!disconnected) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 },
    );
  }
}
