import type { EventualContext } from '../storage';

export class SandboxBudgetError extends Error {
  constructor() {
    super('The sandbox RPC budget is exceeded.');
    this.name = 'SandboxBudgetError';
  }
}
type Budget = { used: number; reserved: number; limit: number };
const state = Symbol('eventual invocation budget');
type BudgetContext = EventualContext & {[state]?: Budget};
const contexts = new WeakMap<object, EventualContext>();

/**
 * One counter covers lazy storage collections, parallel calls, and copied contexts.
 * 10 calls per request is EmDash's Cloudflare sandbox limit up to 1.4. Since 1.5 it is 30, and the
 * Node sandbox sets none: read-only routes may ask for 30, where an older Cloudflare host fails the
 * request with its own error instead of this budget's.
 */
export function withInvocationBudget(ctx: EventualContext, limit = 10): EventualContext {
  if ((ctx as BudgetContext)[state]) return ctx;
  const cached = contexts.get(ctx);
  if (cached) return cached;
  const budget = { used: 0, reserved: 0, limit };
  // Enumerable symbols survive object spread and are excluded from serialized output.
  const wrapped: BudgetContext = { ...ctx, [state]: budget };
  const facade = (target: object): object => {
    const proxy = new Proxy(target, { get(target, key) {
      const value = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (budget.used + budget.reserved >= budget.limit) throw new SandboxBudgetError();
        budget.used++;
        return Reflect.apply(value, target, args);
      };
    }});
    return proxy;
  };
  for (const [name, api] of Object.entries(ctx))
    if (!['site','plugin','storage'].includes(name) && api && typeof api === 'object') (wrapped as any)[name] = facade(api);
  if (ctx.storage) wrapped.storage = new Proxy(ctx.storage, { get(target, key) {
    const collection = Reflect.get(target, key, target);
    return collection && typeof collection === 'object' ? facade(collection) : collection;
  }});
  contexts.set(ctx, wrapped);
  return wrapped;
}

/** Reserve final writes before starting reads; exhaustion must precede mutation. */
export function reserveRpcCalls(ctx: EventualContext, count: number): () => void {
  const budget = (ctx as BudgetContext)[state];
  if (!budget) return () => {};
  if (budget.used + budget.reserved + count > budget.limit) throw new SandboxBudgetError();
  budget.reserved += count;
  let released = false;
  return () => { if (!released) { budget.reserved -= count; released = true; } };
}
export function remainingRpcCalls(ctx: EventualContext): number {
  const budget = (ctx as BudgetContext)[state];
  return budget ? budget.limit - budget.used - budget.reserved : 10;
}
