import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  tenantId?: string;
  userId?: string;
}

export const als = new AsyncLocalStorage<RequestContext>();
