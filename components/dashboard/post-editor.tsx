"use client";

import { ImagePlusIcon, Loader2Icon, SendIcon, XIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  POST_CONTENT_MAX_LENGTH,
} from "@/lib/constants/posts";
import {
  PLATFORM_DEFINITIONS,
  PLATFORM_ORDER,
} from "@/lib/constants/platforms";
import { cn } from "@/lib/utils";
import type { PlatformId } from "@/types/platform";

type UploadApiResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

type PublishApiResponse = {
  error?: string;
};

const AVAILABLE_PLATFORMS = PLATFORM_ORDER.filter(
  (id) => PLATFORM_DEFINITIONS[id].available,
);

function isAllowedImageType(type: string): boolean {
  return (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(type);
}

async function uploadImageToR2(file: File): Promise<string> {
  const signResponse = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      fileType: file.type,
    }),
  });

  const signData = (await signResponse.json()) as UploadApiResponse;

  if (!signResponse.ok || !signData.uploadUrl || !signData.publicUrl) {
    throw new Error(signData.error ?? "Failed to prepare image upload");
  }

  const putResponse = await fetch(signData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error("Failed to upload image to storage");
  }

  return signData.publicUrl;
}

export function PostEditor() {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] =
    useState<PlatformId[]>(AVAILABLE_PLATFORMS);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePublicUrl, setImagePublicUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const characterCount = content.length;
  const isOverLimit = characterCount > POST_CONTENT_MAX_LENGTH;
  const canPublish =
    content.trim().length > 0 &&
    !isOverLimit &&
    selectedPlatforms.length > 0 &&
    !isUploading &&
    !isPublishing;

  const clearImage = () => {
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setImagePublicUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file) return;

    if (!isAllowedImageType(file.type)) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(localPreview);
    setImagePublicUrl(null);
    setIsUploading(true);

    try {
      const publicUrl = await uploadImageToR2(file);
      setImagePublicUrl(publicUrl);
      toast.success("Image uploaded successfully.");
    } catch (error) {
      console.error(error);
      clearImage();
      toast.error(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleImageFile(event.target.files?.[0]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleImageFile(event.dataTransfer.files?.[0]);
  };

  const togglePlatform = (platformId: PlatformId) => {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId],
    );
  };

  const handlePublish = async () => {
    if (!canPublish) return;

    if (isUploading || (imagePreviewUrl && !imagePublicUrl)) {
      toast.error("Wait for the image upload to finish.");
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imagePublicUrl,
          platforms: selectedPlatforms,
        }),
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as PublishApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 404
              ? "Posts API is not ready yet (Step 18)."
              : "Failed to publish post."),
        );
      }

      toast.success("Post saved successfully.");
      setContent("");
      clearImage();
      setSelectedPlatforms(AVAILABLE_PLATFORMS);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to publish post.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            Post content
          </label>
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              isOverLimit && "font-medium text-destructive",
            )}
          >
            {characterCount} / {POST_CONTENT_MAX_LENGTH}
          </span>
        </div>
        <Textarea
          id={inputId}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your post once — publish to connected platforms."
          className="min-h-40 resize-y"
          disabled={isPublishing}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Image (optional)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_UPLOAD_MIME_TYPES.join(",")}
          className="sr-only"
          onChange={onFileInputChange}
          disabled={isUploading || isPublishing}
        />

        {imagePreviewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
            <img
              src={imagePreviewUrl}
              alt="Selected upload preview"
              className="max-h-80 w-full object-contain"
            />

            <div className="absolute top-3 right-3 flex gap-2">
              {isUploading && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Uploading…
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={clearImage}
                disabled={isUploading || isPublishing}
                aria-label="Remove image"
              >
                <XIcon />
              </Button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center transition-colors",
              isDragging && "border-primary bg-primary/5",
              (isUploading || isPublishing) && "pointer-events-none opacity-60",
            )}
          >
            <ImagePlusIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drop an image here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Publish to</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_PLATFORMS.map((platformId) => {
            const platform = PLATFORM_DEFINITIONS[platformId];
            const selected = selectedPlatforms.includes(platformId);

            return (
              <Button
                key={platformId}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => togglePlatform(platformId)}
                disabled={isPublishing}
              >
                {platform.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          onClick={() => void handlePublish()}
          disabled={!canPublish}
        >
          {isPublishing ? (
            <>
              <Loader2Icon className="animate-spin" />
              Publishing…
            </>
          ) : (
            <>
              <SendIcon />
              Publish Now
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
