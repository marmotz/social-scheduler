import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput, PublicUser, RegisterInput } from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const BCRYPT_SALT_ROUNDS = 10;

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService
  ) {}

  async register(input: RegisterInput): Promise<AuthTokens> {
    const existing = await this.prisma.client.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
    const user = await this.prisma.client.user.create({
      data: { email: input.email, passwordHash },
    });

    return this.issueTokens(user);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyToken(refreshToken, this.config.jwtRefreshSecret);
    if (!payload) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid refresh token' });
    }

    return this.issueTokens(user);
  }

  async verifyAccessToken(accessToken: string): Promise<PublicUser | null> {
    const payload = await this.verifyToken(accessToken, this.config.jwtAccessSecret);
    if (!payload) {
      return null;
    }
    return { id: payload.sub, email: payload.email };
  }

  private async verifyToken(token: string, secret: string): Promise<AccessTokenPayload | null> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, { secret });
    } catch {
      return null;
    }
  }

  private issueTokens(user: { id: string; email: string }): AuthTokens {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessExpiresIn,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.jwtRefreshSecret,
      expiresIn: this.config.jwtRefreshExpiresIn,
    });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
  }
}
