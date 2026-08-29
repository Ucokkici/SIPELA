import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  it('harus terdefinisi (defined)', () => {
    expect(guard).toBeDefined();
  });

  it('harus mengizinkan request jika tidak ada konteks userTenantId (public/unauthenticated)', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('harus mengizinkan request jika userTenantId sama dengan target tenant_id di body', () => {
    const mockReq = {
      user: { tenant_id: 1 },
      body: { tenant_id: 1 },
      headers: {},
    };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
    expect((mockReq as any).tenantId).toBe(BigInt(1));
  });

  it('harus melempar ForbiddenException (403) jika user mencoba mengakses tenant lain (IDOR Prevention)', () => {
    const mockReq = {
      user: { tenant_id: 1 },
      body: { tenant_id: 2 },
      headers: {},
    };
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockReq,
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
