import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({})],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
