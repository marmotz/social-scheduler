import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { DateTime } from 'luxon';
import type { AppRequest } from '../request/app-request.interface.js';

const SENSITIVE_FIELD_PATTERN = /password|token|secret|key|authorization|bearer|credential/i;

@Injectable()
export class AppLoggerService {
  private readonly logger = new Logger('API');

  private readonly sensitiveHeaders = ['authorization', 'cookie', 'x-auth-token'];

  log(level: 'log' | 'error', message: string) {
    this.logger[level](message);
  }

  /**
   * Hooks the response stream to log the full request/response exchange once it closes.
   * Works on plain Express req/res, so it covers routes outside Nest's controller
   * pipeline (e.g. tRPC, mounted via `app.use` and never seen by Nest interceptors).
   */
  logHttpExchange(request: AppRequest, response: Response): void {
    const { clientIp, method, url } = request;
    const userAgent = request.get('user-agent') ?? '';
    const chunks: Buffer[] = [];

    const originalWrite = response.write.bind(response);
    response.write = ((chunk: unknown, ...args: unknown[]) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      return (originalWrite as (...fnArgs: unknown[]) => boolean)(chunk, ...args);
    }) as typeof response.write;

    const originalEnd = response.end.bind(response);
    response.end = ((chunk: unknown, ...args: unknown[]) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
      return (originalEnd as (...fnArgs: unknown[]) => Response)(chunk, ...args);
    }) as typeof response.end;

    response.on('close', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const responseTimestamp = DateTime.now();

      const log = this.formatLogLine({
        method,
        url,
        status: statusCode,
        clientIp,
        userAgent,
        duration: responseTimestamp.diff(request.timestamp).milliseconds,
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        sessionId: request.sessionId,
        requestId: request.requestId,
      });
      const requestBody = this.formatRequestBody(request);

      const rawResponse = Buffer.concat(chunks).toString('utf8') || 'null';
      let responseData: unknown;
      try {
        responseData = this.sanitizeData(JSON.parse(rawResponse));
      } catch {
        responseData = rawResponse;
      }

      const responseBody = JSON.stringify({ timestamp: responseTimestamp.toISO(), responseData }, undefined, 2);

      const logFn: 'log' | 'error' = statusCode >= 400 ? 'error' : 'log';
      this.log(logFn, log);

      if (statusCode >= 400) {
        this.log(logFn, requestBody);
        this.log(logFn, responseBody);
      }
    });
  }

  sanitizeData<T>(data: T): T {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj: unknown) => {
      if (!obj || typeof obj !== 'object') {
        return;
      }

      Object.keys(obj as Record<string, unknown>).forEach((key) => {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === 'object' && value !== null) {
          sanitizeObject(value);
        } else if (SENSITIVE_FIELD_PATTERN.test(key)) {
          (obj as Record<string, unknown>)[key] = '[REDACTED]';
        }
      });
    };

    sanitizeObject(sanitized);

    return sanitized;
  }

  sanitizeHeaders(headers: unknown): Record<string, unknown> {
    if (!headers) {
      return {};
    }

    const sanitizedHeaders: Record<string, unknown> = { ...(headers as Record<string, unknown>) };

    Object.keys(sanitizedHeaders).forEach((key) => {
      if (this.sensitiveHeaders.includes(key.toLowerCase())) {
        sanitizedHeaders[key] = '[SECRET]';
      }
    });

    return sanitizedHeaders;
  }

  private isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }

    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    if (typeof value === 'object' && !(value instanceof Date) && Object.keys(value).length === 0) {
      return true;
    }

    return false;
  }

  private filterEmpty(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    const filtered: Record<string, unknown> = {};

    Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
      if (this.isEmptyValue(value)) {
        return;
      }

      if (typeof value === 'object' && !(value instanceof Date)) {
        const nested = this.filterEmpty(value);
        if (this.isEmptyValue(nested)) {
          return;
        }
        filtered[key] = nested;
      } else {
        filtered[key] = value;
      }
    });

    return filtered;
  }

  formatRequestBody(request: AppRequest): string {
    const user = request.user
      ? {
          id: request.user.id,
          email: request.user.email,
        }
      : null;

    const requestBodyObject = {
      headers: this.sanitizeHeaders(request.headers),
      params: request.params,
      query: request.query,
      user,
      sessionId: request.sessionId,
      body: this.sanitizeData(request.body),
    };

    const filtered = this.filterEmpty(requestBodyObject);

    return JSON.stringify(filtered, undefined, 2);
  }

  formatLogLine(params: {
    method: string;
    url: string;
    status: number;
    clientIp: string | null;
    userAgent: string;
    duration: number;
    contentLength?: number;
    sessionId?: string;
    requestId?: string;
  }): string {
    const { method, url, status, clientIp, userAgent, duration, contentLength, sessionId, requestId } = params;

    const formattedContentLength = this.formatContentLength(contentLength);

    return `[${sessionId ?? 'none'} > ${requestId ?? 'unknown'}] ${method} ${url} ${status} ${formattedContentLength} - ${clientIp ?? 'unknown'} ${userAgent} - ${duration}ms`;
  }

  private formatContentLength(contentLength: number | undefined): string {
    if (!contentLength || contentLength <= 0) return '0o';

    const units = ['o', 'ko', 'Mo', 'Go', 'To'];
    let size = contentLength;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formattedSize = size % 1 === 0 ? size.toString() : size.toFixed(1);
    return `${formattedSize}${units[unitIndex]}`;
  }
}
