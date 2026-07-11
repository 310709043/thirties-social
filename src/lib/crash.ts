// crash.ts — JS crash reporting without a third-party service.
//
// Fatal JS errors are recorded to the analytics collection ('app_error'
// events, queryable from the admin console). A crash may kill the app before
// the Firestore write lands, so every report is ALSO queued in AsyncStorage
// and flushed on the next launch — the report survives either way.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics';

const QUEUE_KEY = 'crash_queue';
const MAX_QUEUED = 10;

interface CrashReport {
  message: string;
  stack: string;
  fatal: boolean;
  source: 'global' | 'boundary';
  at: number;
}

async function enqueue(report: CrashReport): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: CrashReport[] = raw ? JSON.parse(raw) : [];
    queue.push(report);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {}
}

export function reportCrash(error: unknown, fatal: boolean, source: CrashReport['source']): void {
  const e = error as Error | undefined;
  const report: CrashReport = {
    message: String(e?.message ?? error).slice(0, 300),
    stack: String(e?.stack ?? '').slice(0, 1200),
    fatal,
    source,
    at: Date.now(),
  };
  // Queue first (synchronous enough to usually win the race with a fatal
  // teardown), then attempt the immediate send.
  enqueue(report).then(async () => {
    await analytics.appError(report.message, report.stack, report.fatal, report.source);
    // Sent — drop it from the queue so the next launch doesn't resend.
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: CrashReport[] = raw ? JSON.parse(raw) : [];
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter(r => r.at !== report.at)));
    } catch {}
  }).catch(() => {});
}

/** Send any reports whose immediate write never landed (the app died first). */
export async function flushCrashQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const queue: CrashReport[] = JSON.parse(raw);
    if (!queue.length) return;
    await AsyncStorage.removeItem(QUEUE_KEY);
    for (const r of queue) {
      await analytics.appError(r.message, r.stack, r.fatal, r.source);
    }
  } catch {}
}

/** Install the global fatal-error hook. Call once, as early as possible. */
export function installCrashHandler(): void {
  const ErrorUtils = (globalThis as any).ErrorUtils;
  if (!ErrorUtils?.setGlobalHandler) return;
  const prev = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    reportCrash(error, !!isFatal, 'global');
    prev?.(error, isFatal);
  });
}
