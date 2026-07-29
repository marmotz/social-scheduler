import type { NestMiddleware } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import type { NextFunction, Request, Response } from 'express';
import 'reflect-metadata';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { AppConfigService } from './config/app-config.service.js';
import { AppLoggerExceptionFilter } from './shared/app-logger/app-logger.exception-filter.js';
import { AppLoggerService } from './shared/app-logger/app-logger.service.js';
import { IpMiddleware } from './shared/middlewares/ip.middleware.js';
import { RequestIdMiddleware } from './shared/middlewares/request-id.middleware.js';
import { SessionMiddleware } from './shared/middlewares/session.middleware.js';
import type { AppRequest } from './shared/request/app-request.interface.js';
import { SocialAccountsService } from './social-accounts/social-accounts.service.js';
import { createContextFactory } from './trpc/context.js';
import { createAppRouter } from './trpc/trpc.router.js';

const logger = new Logger('Bootstrap');

function runMiddlewares(middlewares: NestMiddleware[], req: AppRequest, res: Response, done: NextFunction) {
  let index = 0;
  const next = () => {
    const middleware = middlewares[index++];
    if (!middleware) {
      done();
      return;
    }
    middleware.use(req, res, next);
  };
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(AppConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: config.webUrl, credentials: true });
  app.useGlobalFilters(new AppLoggerExceptionFilter(app.get(AppLoggerService)));

  const authService = app.get(AuthService);
  const socialAccountsService = app.get(SocialAccountsService);
  const appLoggerService = app.get(AppLoggerService);

  // /trpc is mounted as raw Express middleware (see below), so it never goes through
  // Nest's controller pipeline: the global middlewares registered via AppModule's
  // MiddlewareConsumer, and the AppLoggerInterceptor, don't apply to it. Run the same
  // request-context middlewares here so /trpc logs carry the client IP, request id and
  // session id, and get logged, just like every other route.
  const trpcMiddlewares: NestMiddleware[] = [
    new IpMiddleware(),
    new RequestIdMiddleware(),
    new SessionMiddleware(config),
  ];
  app.use('/trpc', (req: Request, res: Response, next: NextFunction) => {
    const request = req as AppRequest;
    runMiddlewares(trpcMiddlewares, request, res, () => {
      appLoggerService.logHttpExchange(request, res);
      next();
    });
  });
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: createAppRouter(authService, config, socialAccountsService),
      createContext: createContextFactory(authService),
    })
  );

  await app.listen(config.port);

  logger.log(`Backend is running on: http://localhost:${config.port}`);
}

bootstrap()
  .then()
  .catch((err) => logger.error(err));
