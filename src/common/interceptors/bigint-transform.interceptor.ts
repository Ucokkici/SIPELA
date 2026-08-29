import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor untuk mentransformasi seluruh nilai BigInt dan Decimal menjadi Number/String
 * secara rekursif agar respon JSON selalu valid dan bersih.
 */
@Injectable()
export class BigIntTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'bigint') {
      const num = Number(value);
      return Number.isSafeInteger(num) ? num : value.toString();
    }

    // Tangani Decimal dari Prisma
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof value.toNumber === 'function'
    ) {
      return value.toNumber();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item));
    }

    if (typeof value === 'object' && !(value instanceof Date)) {
      const transformedObj: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        transformedObj[key] = this.transform(value[key]);
      }
      return transformedObj;
    }

    return value;
  }
}
