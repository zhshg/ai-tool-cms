import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { computeEtag } from "@ai-tool-cms/public-api";

@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<{ headers: { "if-none-match"?: string } }>();

    return next.handle().pipe(
      map((body) => {
        if (body == null) return body;

        const etag = computeEtag(body);
        response.setHeader("ETag", etag);
        response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");

        if (request.headers["if-none-match"] === etag) {
          response.status(304);
          return undefined;
        }

        return body;
      }),
    );
  }
}

@Injectable()
export class NotFoundIfNullInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        if (body === null || body === undefined) {
          throw new NotFoundException();
        }
        return body;
      }),
    );
  }
}
