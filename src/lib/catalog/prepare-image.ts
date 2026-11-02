/**
 * Browser-side: downscale a photo before upload so the bucket never stores
 * huge raw camera files. Long edge capped at 2000px, re-encoded as WebP
 * (falls back to JPEG). Returns the original dimensions if it fails.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_EDGE = 2000;

export async function prepareImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg"; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  const webp = await toBlob("image/webp", 0.86);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", width, height };
  const jpg = await toBlob("image/jpeg", 0.86);
  if (!jpg) throw new Error("encode failed");
  return { blob: jpg, ext: "jpg", width, height };
}
