import { describe, expect, it, vi } from 'vitest';
import { EncryptionService } from '../crypto/encryption.service.js';
import { createSocialAccountEncryptionExtension } from './social-account-encryption.extension.js';

function createEncryption() {
  return new EncryptionService({ encryptionKey: 'a'.repeat(64) } as never);
}

async function runAllOperations(encryption: EncryptionService, args: Record<string, unknown>, queryResult: unknown) {
  const extension = createSocialAccountEncryptionExtension(encryption);
  const query = extension.query!.socialAccount!.$allOperations! as (input: {
    args: Record<string, unknown>;
    query: (args: Record<string, unknown>) => Promise<unknown>;
  }) => Promise<unknown>;

  const queryFn = vi.fn(async (forwardedArgs: Record<string, unknown>) => {
    // Simulates the DB round-trip: the "stored" value is whatever was passed in `data`.
    if (queryResult !== undefined) {
      return queryResult;
    }
    return forwardedArgs;
  });

  const result = await query({ args, query: queryFn });
  return { result, forwardedArgs: queryFn.mock.calls[0]?.[0] };
}

describe('createSocialAccountEncryptionExtension', () => {
  it('encrypts accessToken/refreshToken in `data` before writing', async () => {
    const encryption = createEncryption();

    const { forwardedArgs } = await runAllOperations(
      encryption,
      { data: { handle: 'jane', accessToken: 'plain-access', refreshToken: 'plain-refresh' } },
      undefined
    );

    const data = (forwardedArgs as { data: Record<string, unknown> }).data;
    expect(data.accessToken).not.toBe('plain-access');
    expect(data.refreshToken).not.toBe('plain-refresh');
    expect(encryption.decrypt(data.accessToken as string)).toBe('plain-access');
  });

  it('decrypts accessToken/refreshToken on a single-record read result', async () => {
    const encryption = createEncryption();
    const stored = {
      id: '1',
      accessToken: encryption.encrypt('stored-access'),
      refreshToken: encryption.encrypt('stored-refresh'),
    };

    const { result } = await runAllOperations(encryption, { where: { id: '1' } }, stored);

    expect((result as typeof stored).accessToken).toBe('stored-access');
    expect((result as typeof stored).refreshToken).toBe('stored-refresh');
  });

  it('decrypts accessToken/refreshToken for every item in a list result', async () => {
    const encryption = createEncryption();
    const stored = [
      { id: '1', accessToken: encryption.encrypt('a1'), refreshToken: null },
      { id: '2', accessToken: encryption.encrypt('a2'), refreshToken: encryption.encrypt('r2') },
    ];

    const { result } = await runAllOperations(encryption, {}, stored);

    const list = result as typeof stored;
    expect(list[0]!.accessToken).toBe('a1');
    expect(list[1]!.refreshToken).toBe('r2');
  });

  it('encrypts nested create/update payloads for upsert', async () => {
    const encryption = createEncryption();

    const { forwardedArgs } = await runAllOperations(
      encryption,
      {
        create: { handle: 'jane', accessToken: 'created-access' },
        update: { accessToken: 'updated-access' },
      },
      undefined
    );

    const args = forwardedArgs as { create: Record<string, unknown>; update: Record<string, unknown> };
    expect(encryption.decrypt(args.create.accessToken as string)).toBe('created-access');
    expect(encryption.decrypt(args.update.accessToken as string)).toBe('updated-access');
  });
});
