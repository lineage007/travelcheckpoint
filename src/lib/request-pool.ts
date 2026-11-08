// One pool per search. At most `limit` tasks run at once; cancel() aborts the
// requests already in flight and stops queued tasks from ever starting.
//
// Why: a region search fans out up to 30 /api/search calls (cities x dates)
// behind a concurrency cap. Before this pool, starting a new search, or leaving
// the page, only dropped the old results: every queued call still went out
// and spent Seats.aero, SerpAPI and model quota for a query nobody was
// looking at any more.

export interface RequestPool {
  /** Aborted when the pool is cancelled. Pass it to fetch(). */
  readonly signal: AbortSignal;
  readonly cancelled: boolean;
  /** Runs `task` when a slot is free. Never throws; a failed task does not block the others. */
  run(task: (signal: AbortSignal) => Promise<void>): Promise<void>;
  /** Aborts in-flight tasks and drops queued ones. Safe to call more than once. */
  cancel(): void;
}

export function createRequestPool(limit: number): RequestPool {
  const controller = new AbortController();
  const max = Math.max(1, Math.floor(limit));
  let inFlight = 0;
  // Each waiter is told whether it was handed a slot (true) or dropped by cancel() (false).
  const waiters: ((granted: boolean) => void)[] = [];

  // A freed slot goes straight to the oldest waiter (FIFO), so the count
  // always equals the number of tasks holding a slot.
  const releaseSlot = () => {
    const next = waiters.shift();
    if (next) next(true);
    else inFlight--;
  };

  return {
    get signal() { return controller.signal; },
    get cancelled() { return controller.signal.aborted; },
    async run(task) {
      if (controller.signal.aborted) return;
      if (inFlight < max) {
        inFlight++;
      } else {
        const granted = await new Promise<boolean>(resolve => waiters.push(resolve));
        if (!granted) return;
        if (controller.signal.aborted) { releaseSlot(); return; }
      }
      try {
        await task(controller.signal);
      } catch {
        // One failed request must not sink the rest of the search.
      } finally {
        releaseSlot();
      }
    },
    cancel() {
      if (controller.signal.aborted) return;
      controller.abort();
      while (waiters.length > 0) waiters.shift()!(false);
    },
  };
}

/** A signal that aborts when `signal` aborts or after `ms`, whichever comes first. */
export function withTimeout(signal: AbortSignal, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout]);
  // Safari before 17.4 has AbortSignal.timeout but not AbortSignal.any.
  const combined = new AbortController();
  const abortWith = (source: AbortSignal) => () => combined.abort(source.reason);
  if (signal.aborted) abortWith(signal)();
  else if (timeout.aborted) abortWith(timeout)();
  signal.addEventListener('abort', abortWith(signal), { once: true });
  timeout.addEventListener('abort', abortWith(timeout), { once: true });
  return combined.signal;
}
