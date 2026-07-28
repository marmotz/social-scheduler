import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AppRequest } from '../request/app-request.interface.js';

@Injectable()
export class IpMiddleware implements NestMiddleware {
  use(request: AppRequest, _response: Response, next: NextFunction) {
    request.clientIp = this.getClientIp(request);

    next();
  }

  private getClientIp(request: Request): string | null {
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // Cloudflare
      'x-forwarded',
      'forwarded-for',
      'forwarded',
    ];

    for (const header of headers) {
      const value = request.headers[header];

      if (value) {
        // X-Forwarded-For can contain multiple IPs separated by commas
        const ip = Array.isArray(value) ? value[0] : value.split(',')[0];
        const cleanIp = ip.trim();

        // Validate that it's a valid IP
        if (this.isValidIp(cleanIp)) {
          return cleanIp;
        }
      }
    }

    // Fallback to direct connection IP
    return request.socket?.remoteAddress ?? request.ip ?? null;
  }

  private isValidIp(ip: string): boolean {
    // Simple regex for IPv4 and IPv6
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}
