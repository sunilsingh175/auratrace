/**
 * Global exception handlers.
 */
export function installHandlers(captureFn: (err: Error) => void): void {
  process.on('uncaughtException', (err) => {
    try {
      captureFn(err);
    } catch {
      // Never break the app
    }
    // Re-throw so the process can exit as it normally would
    // (Comment this out if you want to swallow the crash)
    setImmediate(() => {
      throw err;
    });
  });

  process.on('unhandledRejection', (reason) => {
    try {
      const err =
        reason instanceof Error ? reason : new Error(String(reason));
      captureFn(err);
    } catch {
      // Never break
    }
  });
}

export function formatError(err: any): string {
  if (err instanceof Error) {
    return err.stack || err.message || String(err);
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
