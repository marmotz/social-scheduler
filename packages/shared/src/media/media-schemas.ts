import { z } from 'zod';

/** Images only (per the MVP scope — text + images, no video). */
export const allowedMediaMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type AllowedMediaMimeType = (typeof allowedMediaMimeTypes)[number];

/**
 * Direct upload via the tRPC API (base64-encoded body), rather than a pre-signed
 * MinIO URL: images are capped at 8 MiB, well within a single JSON request body,
 * so the added complexity of a two-step pre-signed-URL flow isn't justified yet.
 */
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export const uploadMediaSchema = z.object({
  postItemId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.enum(allowedMediaMimeTypes),
  /** Base64-encoded file content (no `data:` URL prefix). */
  data: z.base64(),
});
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;

export const deleteMediaSchema = z.object({
  mediaId: z.string().min(1),
});
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;
