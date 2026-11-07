import { describe, it, expect } from 'vitest';
import { createRequestPool, withTimeout } from './request-pool';

/** A task that records when it starts and resolves only when released (or aborted). */
function gatedTasks() {
  const started: number[] = [];
  const aborted: number[] = [];
  const releases: (() => void)[] = [];
  let running = 0;
  let maxRunning = 0;
  const task = (id: number) => (signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    started.push(id);
    running++;
    maxRunning = Math.max(maxRunning, running);
    const done = () => { running--; resolve(); };
    releases.push(done);
    signal.addEventListener('abort', () => { aborted.push(id); running--; reject(new DOMException('aborted', 'AbortError')); }, { once: true });
  });
  return { started, aborted, releases, task, max: () => maxRunning };
}

const tick = () => new Promise(r => setTimeout(r, 0));

describe('createRequestPool', () => {
  it('never runs more than the limit at once and runs every task', async () => {
    const pool = createRequestPool(3);
    const g = gatedTasks();
    const all = Array.from({ length: 10 }, (_, i) => pool.run(g.task(i)));
    await tick();
    expect(g.started).toHaveLength(3);
    while (g.started.length < 10 || g.releases.length > 0) {
      g.releases.shift()?.();
      await tick();
    }
    await Promise.all(all);
    expect(g.started).toHaveLength(10);
    expect(g.max()).toBe(3);
  });

  it('a superseded search stops at the requests already in flight', async () => {
    // The search page's shape: 10 cities x 3 dates = 30 calls, 12 at a time.
    const pool = createRequestPool(12);
    const g = gatedTasks();
    const all = Array.from({ length: 30 }, (_, i) => pool.run(g.task(i)));
    await tick();
    expect(g.started).toHaveLength(12);

    pool.cancel(); // the user typed a new query
    await Promise.all(all);
    expect(g.aborted).toHaveLength(12); // in-flight fetches are aborted
    expect(g.started).toHaveLength(12); // the 18 queued calls never go out
    expect(pool.cancelled).toBe(true);
  });

  it('does nothing for tasks submitted after cancel', async () => {
    const pool = createRequestPool(2);
    pool.cancel();
    pool.cancel(); // idempotent
    let ran = false;
    await pool.run(async () => { ran = true; });
    expect(ran).toBe(false);
  });

  it('a failing task does not block or reject the others', async () => {
    const pool = createRequestPool(1);
    const order: string[] = [];
    await Promise.all([
      pool.run(async () => { order.push('a'); throw new Error('provider down'); }),
      pool.run(async () => { order.push('b'); }),
    ]);
    expect(order).toEqual(['a', 'b']);
  });

  it('gives a freed slot to the oldest queued task first', async () => {
    const pool = createRequestPool(1);
    const g = gatedTasks();
    const all = [1, 2, 3].map(id => pool.run(g.task(id)));
    await tick();
    expect(g.started).toEqual([1]);
    g.releases.shift()!();
    await tick();
    expect(g.started).toEqual([1, 2]);
    g.releases.shift()!();
    await tick();
    expect(g.started).toEqual([1, 2, 3]);
    g.releases.shift()!();
    await Promise.all(all);
    expect(g.max()).toBe(1);
  });
});

describe('withTimeout', () => {
  it('aborts when the parent aborts', () => {
    const parent = new AbortController();
    const s = withTimeout(parent.signal, 60_000);
    expect(s.aborted).toBe(false);
    parent.abort();
    expect(s.aborted).toBe(true);
  });

  it('aborts after the timeout', async () => {
    const s = withTimeout(new AbortController().signal, 10);
    await new Promise(r => setTimeout(r, 40));
    expect(s.aborted).toBe(true);
  });

  it('works without AbortSignal.any (Safari before 17.4)', async () => {
    const original = AbortSignal.any;
    Object.defineProperty(AbortSignal, 'any', { value: undefined, configurable: true, writable: true });
    try {
      const parent = new AbortController();
      const viaParent = withTimeout(parent.signal, 60_000);
      parent.abort();
      expect(viaParent.aborted).toBe(true);

      const viaTimeout = withTimeout(new AbortController().signal, 10);
      await new Promise(r => setTimeout(r, 40));
      expect(viaTimeout.aborted).toBe(true);
      expect((viaTimeout.reason as DOMException).name).toBe('TimeoutError');
    } finally {
      Object.defineProperty(AbortSignal, 'any', { value: original, configurable: true, writable: true });
    }
  });
});
