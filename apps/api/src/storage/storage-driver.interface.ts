/**
 * Backend-only contract for object storage (MinIO by default), kept out of
 * `packages/shared` since the frontend never talks to it directly — uploads
 * go through the `media` tRPC router. A future driver (local disk, real S3 in
 * the pro version) implements this same interface so `media`/`posts` only
 * ever depend on its public API, even though they inject the concrete
 * `MinioStorageDriver` class directly (matching how `networks/*` adapters are
 * injected elsewhere in this codebase — no DI token indirection).
 */
export interface StorageDriver {
  upload(key: string, data: Buffer, mimeType: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}
