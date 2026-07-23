import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  buildPublicObjectUrl,
  buildUploadObjectKey,
  getPresignedUploadUrl,
  getR2Config,
} from "@/lib/r2";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type UploadRequestBody = {
  filename?: string;
  fileType?: string;
};

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getR2Config();

  if (!config) {
    return NextResponse.json(
      { error: "R2 storage is not configured" },
      { status: 503 },
    );
  }

  let body: UploadRequestBody;

  try {
    body = (await req.json()) as UploadRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const filename = body.filename?.trim();
  const fileType = body.fileType?.trim().toLowerCase();

  if (!filename || !fileType) {
    return NextResponse.json(
      { error: "filename and fileType are required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_IMAGE_TYPES.has(fileType)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Allowed: image/jpeg, image/png, image/webp, image/gif",
      },
      { status: 400 },
    );
  }

  const key = buildUploadObjectKey(userId, filename);

  try {
    const uploadUrl = await getPresignedUploadUrl({
      key,
      contentType: fileType,
      config,
    });

    const publicUrl = buildPublicObjectUrl(config.publicUrl, key);

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 60,
    });
  } catch (error) {
    console.error("Failed to create R2 presigned upload URL:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
