import { Catch, type ExceptionFilter, type ArgumentsHost, HttpException } from '@nestjs/common';
import { ZodError } from 'zod';
import { PlatformError } from '../legacy/platform/store.ts';
@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status =
      error instanceof PlatformError
        ? error.status
        : error instanceof ZodError
          ? 400
          : error instanceof HttpException
            ? error.getStatus()
            : 500;
    const message =
      error instanceof ZodError
        ? error.issues.map((i) => i.message).join('; ')
        : error instanceof Error && status < 500
          ? error.message
          : 'Error interno del servidor';
    if (status === 500) console.error(error);
    response
      .status(status)
      .json({ message, ...(error instanceof PlatformError ? { fields: error.fields } : {}) });
  }
}
