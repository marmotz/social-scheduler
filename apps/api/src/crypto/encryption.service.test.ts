import { describe, expect, it } from 'vitest';
import type { AppConfigService } from '../config/app-config.service.js';
import { EncryptionService } from './encryption.service.js';

function createService(encryptionKey = 'a'.repeat(64)) {
  return new EncryptionService({ encryptionKey } as unknown as AppConfigService);
}

describe('EncryptionService', () => {
  it('decrypts back to the original plain text', () => {
    const service = createService();

    const cipherText = service.encrypt('super-secret-oauth-token');

    expect(service.decrypt(cipherText)).toBe('super-secret-oauth-token');
  });

  it('produces a different cipher text on each call (random IV)', () => {
    const service = createService();

    const first = service.encrypt('same-token');
    const second = service.encrypt('same-token');

    expect(first).not.toBe(second);
  });

  it('throws when the cipher text was tampered with', () => {
    const service = createService();
    const cipherText = service.encrypt('super-secret-oauth-token');
    const tampered = `${cipherText.slice(0, -4)}abcd`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('cannot decrypt a value encrypted with a different key', () => {
    const cipherText = createService('a'.repeat(64)).encrypt('super-secret-oauth-token');
    const otherService = createService('b'.repeat(64));

    expect(() => otherService.decrypt(cipherText)).toThrow();
  });
});
