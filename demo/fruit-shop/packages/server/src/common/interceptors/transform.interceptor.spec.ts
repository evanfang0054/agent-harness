import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor, SKIP_TRANSFORM_KEY } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let reflector: jest.Mocked<Reflector>;
  let interceptor: TransformInterceptor<any>;
  const ctx: any = { getHandler: () => ({}) };

  const callWith = (data: any) => interceptor.intercept(ctx, { handle: () => of(data) } as any);

  it('should wrap response when no SKIP_TRANSFORM', (done) => {
    reflector = { get: jest.fn().mockReturnValue(undefined) } as any;
    interceptor = new TransformInterceptor(reflector);
    callWith({ a: 1 }).subscribe((r: any) => {
      expect(r).toEqual({ code: 0, data: { a: 1 }, message: 'success' });
      done();
    });
  });

  it('should pass through when SKIP_TRANSFORM', (done) => {
    reflector = { get: jest.fn().mockReturnValue(true) } as any;
    interceptor = new TransformInterceptor(reflector);
    callWith({ raw: 1 }).subscribe((r: any) => {
      expect(r).toEqual({ raw: 1 });
      done();
    });
  });

  it('should wrap when reflector is undefined (optional)', (done) => {
    interceptor = new TransformInterceptor(undefined as any);
    callWith({ a: 1 }).subscribe((r: any) => {
      expect(r).toEqual({ code: 0, data: { a: 1 }, message: 'success' });
      done();
    });
  });
});
