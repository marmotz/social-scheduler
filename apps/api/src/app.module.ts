import { type MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppLoggerInterceptor } from './shared/app-logger/app-logger.interceptor.js';
import { AppLoggerService } from './shared/app-logger/app-logger.service.js';
import { IpMiddleware } from './shared/middlewares/ip.middleware.js';
import { RequestIdMiddleware } from './shared/middlewares/request-id.middleware.js';
import { SessionMiddleware } from './shared/middlewares/session.middleware.js';

@Module({
  imports: [AppConfigModule, PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    AppLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AppLoggerInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IpMiddleware, RequestIdMiddleware, SessionMiddleware).forRoutes('*');
  }
}
