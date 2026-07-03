import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BadRequestException, Injectable } from "@nestjs/common";

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
  ): Promise<{ url: string; filename: string; mimeType: string; size: number }> {
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
    const storageDirectory = kind === "logo" ? ["storage", "logos"] : ["storage", "screenshots"];
    const root = join(process.cwd(), ...storageDirectory);

    await mkdir(root, { recursive: true });
    await writeFile(join(root, filename), file.buffer);

    return {
      url: buildPublicUrl(kind, filename),
      filename,
      mimeType: file.mimetype,
      size: file.size,
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
