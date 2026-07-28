import { JwtService } from '@nestjs/jwt';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../config/app-config.service.js';
import { AuthService } from './auth.service.js';

function createPrismaMock() {
  return {
    client: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  };
}

const config = {
  jwtAccessSecret: 'test-access-secret',
  jwtRefreshSecret: 'test-refresh-secret',
  jwtAccessExpiresIn: '15m',
  jwtRefreshExpiresIn: '7d',
} as unknown as AppConfigService;

describe('AuthService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AuthService(prisma as never, new JwtService(), config);
  });

  describe('register', () => {
    it('creates a user and returns tokens when the email is not taken', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      prisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash: 'hashed',
      });

      const result = await service.register({ email: 'jane@example.com', password: 'password123' });

      expect(result.user).toEqual({ id: 'user-1', email: 'jane@example.com' });
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(prisma.client.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'jane@example.com' }),
      });
    });

    it('rejects with CONFLICT when the email is already registered', async () => {
      prisma.client.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'jane@example.com' });

      await expect(service.register({ email: 'jane@example.com', password: 'password123' })).rejects.toMatchObject({
        code: 'CONFLICT',
      } satisfies Partial<TRPCError>);
    });
  });

  describe('login', () => {
    it('rejects with UNAUTHORIZED when the user does not exist', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'jane@example.com', password: 'password123' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      } satisfies Partial<TRPCError>);
    });

    it('rejects with UNAUTHORIZED when the password does not match', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      prisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash: 'placeholder',
      });
      await service.register({ email: 'jane@example.com', password: 'password123' });
      const passwordHash = (prisma.client.user.create.mock.calls[0]![0] as { data: { passwordHash: string } }).data
        .passwordHash;
      prisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash,
      });

      await expect(service.login({ email: 'jane@example.com', password: 'wrong-password' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('returns tokens when the credentials are valid', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      prisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash: 'placeholder',
      });
      await service.register({ email: 'jane@example.com', password: 'password123' });
      const passwordHash = (prisma.client.user.create.mock.calls[0]![0] as { data: { passwordHash: string } }).data
        .passwordHash;
      prisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash,
      });

      const result = await service.login({ email: 'jane@example.com', password: 'password123' });

      expect(result.user).toEqual({ id: 'user-1', email: 'jane@example.com' });
    });
  });

  describe('refresh / verifyAccessToken', () => {
    it('issues a new token pair from a valid refresh token', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      prisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash: 'hashed',
      });
      const { refreshToken } = await service.register({
        email: 'jane@example.com',
        password: 'password123',
      });

      prisma.client.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'jane@example.com' });
      const result = await service.refresh(refreshToken);

      expect(result.user).toEqual({ id: 'user-1', email: 'jane@example.com' });
    });

    it('rejects an invalid refresh token', async () => {
      await expect(service.refresh('not-a-real-token')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('returns null for verifyAccessToken given an invalid token', async () => {
      await expect(service.verifyAccessToken('not-a-real-token')).resolves.toBeNull();
    });

    it('resolves the public user for verifyAccessToken given a valid access token', async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      prisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'jane@example.com',
        passwordHash: 'hashed',
      });
      const { accessToken } = await service.register({
        email: 'jane@example.com',
        password: 'password123',
      });

      await expect(service.verifyAccessToken(accessToken)).resolves.toEqual({
        id: 'user-1',
        email: 'jane@example.com',
      });
    });
  });
});
