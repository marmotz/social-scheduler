import { ConsoleLogger, Injectable } from '@nestjs/common';

const GRAY = '\x1B[0;37m';
const RESET = '\x1B[0m';

@Injectable()
export class AppLogger extends ConsoleLogger {
  static currentRequestId = '';

  protected formatContext(context: string): string {
    let requestContext = AppLogger.currentRequestId ? `(${AppLogger.currentRequestId}) ` : '';
    requestContext = requestContext && this.options.colors ? `${GRAY}${requestContext}${RESET}` : requestContext;

    return requestContext + super.formatContext(context);
  }

  debug() {}
  verbose() {}

  protected getTimestamp(): string {
    return new Date().toISOString();
  }
}
