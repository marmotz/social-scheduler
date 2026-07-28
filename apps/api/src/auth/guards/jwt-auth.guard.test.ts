import { Controller, Get, type INestApplication, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppConfigService } from '../../config/app-config.service.js';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const ACCESS_TOKEN_SECRET = 'dev-access-secret';

@Controller()
class ProtectedTestController {
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected() {
    return { ok: true };
  }
}

describe('JwtAuthGuard', () => {
  let app: INestApplication;
  let baseUrl: string;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
      controllers: [ProtectedTestController],
      providers: [
        JwtStrategy,
        {
          provide: AppConfigService,
          useValue: { jwtAccessSecret: ACCESS_TOKEN_SECRET } satisfies Partial<AppConfigService>,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
    baseUrl = await app.getUrl();
    jwt = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects requests without a bearer token', async () => {
    const res = await fetch(`${baseUrl}/protected`);
    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.status).toBe(401);
  });

  it('allows requests with a valid access token', async () => {
    const token = jwt.sign({ sub: 'user-1', email: 'jane@example.com' }, { secret: ACCESS_TOKEN_SECRET });

    const res = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
