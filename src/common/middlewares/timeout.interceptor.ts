import { AppRequest } from '@/common/types';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly ssePaths: string[] = ['/sse']; // Danh sách SSE paths

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<AppRequest>();
    const timeoutValue = this.getTimeout(request);

    if (this.isSseRequest(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException();
        }
        return throwError(() => err);
      }),
    );
  }
  getTimeout(req: AppRequest) {
    const timeoutValue = +(req.headers['x-timeout'] ?? req.query?.timeout ?? 0);
    if (isNaN(timeoutValue) || timeoutValue <= 0) {
      return 15 * 1000;
    }
    return timeoutValue;
  }

  private isSseRequest(req: AppRequest): boolean {
    return (
      req.headers.accept === 'text/event-stream' ||
      this.ssePaths.some((path) => req.originalUrl.endsWith(path))
    );
  }
}
