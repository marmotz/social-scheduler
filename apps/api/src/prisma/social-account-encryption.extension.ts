import type { EncryptionService } from '../crypto/encryption.service.js';

const TOKEN_FIELDS = ['accessToken', 'refreshToken'] as const;

function encryptTokenFields(
  data: Record<string, unknown> | undefined,
  encryption: EncryptionService
): Record<string, unknown> | undefined {
  if (!data) {
    return data;
  }

  const result = { ...data };
  for (const field of TOKEN_FIELDS) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = encryption.encrypt(value);
    }
  }
  return result;
}

function decryptRecord<T>(record: T, encryption: EncryptionService): T {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const result = record as Record<string, unknown>;
  for (const field of TOKEN_FIELDS) {
    const value = result[field];
    if (typeof value === 'string') {
      result[field] = encryption.decrypt(value);
    }
  }
  return record;
}

function decryptQueryResult<T>(result: T, encryption: EncryptionService): T {
  if (Array.isArray(result)) {
    for (const item of result) {
      decryptRecord(item, encryption);
    }
    return result;
  }
  return decryptRecord(result, encryption);
}

/**
 * Prisma client extension that transparently encrypts `accessToken`/`refreshToken`
 * before they are written to the `SocialAccount` table, and decrypts them on every
 * read — so no call site ever has to remember to do it manually.
 */
export function createSocialAccountEncryptionExtension(encryption: EncryptionService) {
  return {
    name: 'social-account-token-encryption',
    query: {
      socialAccount: {
        async $allOperations({ args, query }: { args: unknown; query: (args: unknown) => Promise<unknown> }) {
          const writableArgs = args as {
            data?: Record<string, unknown>;
            create?: Record<string, unknown>;
            update?: Record<string, unknown>;
          };

          if (writableArgs.data) {
            writableArgs.data = encryptTokenFields(writableArgs.data, encryption);
          }
          if (writableArgs.create) {
            writableArgs.create = encryptTokenFields(writableArgs.create, encryption);
          }
          if (writableArgs.update) {
            writableArgs.update = encryptTokenFields(writableArgs.update, encryption);
          }

          const result = await query(args);
          return decryptQueryResult(result, encryption);
        },
      },
    },
  };
}
