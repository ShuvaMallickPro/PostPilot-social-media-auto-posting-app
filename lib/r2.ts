import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 60;

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "");

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicUrl
  ) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
}

let cachedClient: S3Client | null = null;

function getR2Client(config: R2Config): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return cachedClient;
}

/** Strip path segments and unsafe characters from a user-supplied filename. */
export function sanitizeUploadFilename(filename: string): string {
  const baseName = filename.split(/[/\\]/).pop()?.trim() ?? "";
  const cleaned = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "file";
  }

  return cleaned.slice(0, 120);
}

export function buildUploadObjectKey(userId: string, filename: string): string {
  const safeName = sanitizeUploadFilename(filename);
  return `uploads/${userId}/${Date.now()}-${safeName}`;
}

export function buildPublicObjectUrl(publicBaseUrl: string, key: string): string {
  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

export async function getPresignedUploadUrl(params: {
  key: string;
  contentType: string;
  config: R2Config;
}): Promise<string> {
  const client = getR2Client(params.config);
  const command = new PutObjectCommand({
    Bucket: params.config.bucketName,
    Key: params.key,
    ContentType: params.contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRES_IN_SECONDS,
  });
}
