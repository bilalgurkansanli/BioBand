import { appendCrash, buildCrashRecord, type CrashRecord, type CrashSource } from './crashLog';

/**
 * Where crashes go besides the on-device log.
 *
 * Nothing is wired to this yet, on purpose: a remote reporter needs an account
 * and a DSN, and shipping a half-configured one that silently drops everything
 * is worse than shipping none. To add Sentry later:
 *
 *   npx expo install @sentry/react-native
 *
 * then, once in `App.tsx` before `installGlobalErrorHandlers()`:
 *
 *   Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN });
 *   setRemoteReporter((_record, error) => Sentry.captureException(error));
 *
 * Everything below already funnels every crash through one place, so that is
 * the only change needed.
 */
export type RemoteReporter = (record: CrashRecord, error: unknown) => void;

let remoteReporter: RemoteReporter | null = null;

export function setRemoteReporter(reporter: RemoteReporter | null): void {
  remoteReporter = reporter;
}

/**
 * The single funnel every crash passes through.
 *
 * Fire-and-forget by design — callers are already on a failure path and must
 * not be made to await diagnostics.
 */
export function reportCrash(
  error: unknown,
  source: CrashSource,
  componentStack?: string,
): CrashRecord {
  const record = buildCrashRecord(error, source, componentStack);

  // Keep it in the terminal too. During development this is usually the first
  // place anyone looks.
  console.error(`[bioband:${source}]`, record.name, record.message, error);

  void appendCrash(record);

  try {
    remoteReporter?.(record, error);
  } catch (reporterError) {
    console.warn('[errorReporter] remote reporter threw', reporterError);
  }

  return record;
}

type GlobalErrorUtils = {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

let installed = false;

/**
 * Captures errors that never reach a React error boundary.
 *
 * A boundary only sees throws from rendering and lifecycle. Anything from a
 * timer, an event handler or a native callback goes straight to the platform
 * handler instead, and without this it would vanish with the process.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) {
    return;
  }
  installed = true;

  const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler?.();
    errorUtils.setGlobalHandler((error, isFatal) => {
      reportCrash(error, 'uncaught');
      // Hand back to React Native so the red box in development and the usual
      // fatal handling in production both still happen.
      previous?.(error, isFatal);
    });
  }

  installPromiseRejectionCapture();
}

/**
 * Unhandled promise rejections, in release builds only.
 *
 * React Native installs its own tracker in development that prints a warning
 * with a usable stack; replacing that would make debugging worse. In release
 * there is no tracker at all, so a `void somePromise()` that rejects is
 * currently invisible.
 */
function installPromiseRejectionCapture(): void {
  if (__DEV__) {
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracking = require('promise/setimmediate/rejection-tracking') as {
      enable: (options: {
        allRejections: boolean;
        onUnhandled: (id: number, error: unknown) => void;
        onHandled: () => void;
      }) => void;
    };
    tracking.enable({
      allRejections: true,
      onUnhandled: (_id, error) => reportCrash(error, 'promise'),
      onHandled: () => undefined,
    });
  } catch (error) {
    // Bundled promise internals are not a public API — if they move, the app
    // simply keeps the boundary and the global handler.
    console.warn('[errorReporter] promise rejection capture unavailable', error);
  }
}
