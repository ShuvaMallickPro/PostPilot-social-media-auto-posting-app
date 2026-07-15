import type { NextRequest } from "next/server";

export function getRequestOrigin(req: NextRequest): string {
  return new URL(req.url).origin;
}

export function buildAppUrl(req: NextRequest, path: string): URL {
  return new URL(path, req.url);
}

export function redirectToAccounts(
  req: NextRequest,
  params: Record<string, string>,
): URL {
  const url = buildAppUrl(req, "/accounts");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}
