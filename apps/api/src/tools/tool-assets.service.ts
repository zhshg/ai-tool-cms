import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

@Injectable()
export class ToolAssetsService {
  async uploadAsset(
    file: UploadedImageFile | undefined,
    kind: "logo" | "screenshot",
  ): Promise<UploadedAssetResponse> {
    if (!file) {
      throw new BadRequestException("Image file is required.");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Only PNG, JPG, WEBP, SVG, and ICO images are supported.");
    }

    if (!file.size || file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Image must be smaller than 5 MB.");
    }

    const extension = extensionFromMimeType(file.mimetype, file.originalname);
    const filename = `${createHash("sha256")
      .update(file.buffer)
      .digest("hex")
      .slice(0, 24)}.${extension}`;
    const root = await resolveWritableAssetDirectory(kind);

    try {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, filename), file.buffer);
    } catch (error) {
      throw new InternalServerErrorException(buildStorageWriteErrorMessage(kind, root, error));
    }

    const url = buildPublicUrl(kind, filename);
    const thumbnailUrl = buildPublicUrl(kind, filename);

    return {
      url,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      storageKey: filename,
      kind,
      cdnReady: true,
      cacheControl: "public, max-age=86400, stale-while-revalidate=604800",
      optimized: file.mimetype === "image/webp",
      thumbnailUrl,
      variants:
        kind === "screenshot"
          ? [
              {
                type: "original",
                url,
                width: null,
                height: null,
                compressed: file.mimetype === "image/webp",
              },
              {
                type: "thumbnail",
                url: thumbnailUrl,
                width: null,
                height: null,
                compressed: file.mimetype === "image/webp",
              },
            ]
          : undefined,
    };
  }
}

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

function extensionFromMimeType(mimeType: string, originalname: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("svg")) return "svg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("icon")) return "ico";

  const fallback = originalname.split(".").pop()?.toLowerCase();
  if (fallback) {
    return fallback.replace(/[^a-z0-9]/g, "") || "img";
  }

  return "img";
}

function buildPublicUrl(kind: "logo" | "screenshot", filename: string) {
  const appUrl = (process.env.APP_URL ?? "http://localhost").replace(/\/$/, "");
  if (kind === "logo") {
    return `${appUrl}/logos/${filename}`;
  }

  return `${appUrl}/screenshots/${filename}`;
}

async function resolveWritableAssetDirectory(kind: "logo" | "screenshot"): Promise<string> {
  const configuredRoot = process.env.STORAGE_UPLOAD_DIR?.trim();
  const baseDirectory = configuredRoot || join(process.cwd(), "storage");
  const targetDirectory = join(baseDirectory, kind === "logo" ? "logos" : "screenshots");
  const writableCheckTarget = configuredRoot || baseDirectory;

  try {
    await mkdir(baseDirectory, { recursive: true });
    await access(writableCheckTarget, fsConstants.W_OK);
  } catch (error) {
    throw new InternalServerErrorException(
      buildStorageWriteErrorMessage(kind, targetDirectory, error),
    );
  }

  return targetDirectory;
}

function buildStorageWriteErrorMessage(
  kind: "logo" | "screenshot",
  directory: string,
  error: unknown,
) {
  const errorCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (errorCode === "EACCES" || errorCode === "EPERM" || errorCode === "EROFS") {
    return `Upload storage is not writable for ${kind} assets. Please verify write permission on ${directory}.`;
  }

  return `Unable to store ${kind} asset in ${directory}.`;
}

type UploadedAssetResponse = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  kind: "logo" | "screenshot";
  cdnReady: boolean;
  cacheControl: string;
  optimized: boolean;
  thumbnailUrl?: string;
  variants?: Array<{
    type: "original" | "thumbnail";
    url: string;
    width: number | null;
    height: number | null;
    compressed: boolean;
  }>;
};
