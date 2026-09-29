/**
 * AuraTrace Node.js SDK Automatic Exception & Rejection Hooks
 */

export interface HookableClient {
  captureException(error: Error | any, metadata?: Record<string, any>, severity?: string): Promise<void>;
  flush(): Promise<void>;
}

let activeClient: HookableClient | null = null;
let handlersInstalled = false;

const uncaughtExceptionHandler = (error: Error) => {
  if (activeClient) {
    void activeClient.captureException(error, {
      unhandled: true,
      hook: "uncaughtException",
      error_name: error?.name || "Error",
    }, "critical").then(() => {
      return activeClient?.flush();
    });
  }
};

const unhandledRejectionHandler = (reason: any) => {
  if (activeClient) {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    void activeClient.captureException(err, {
      unhandled: true,
      hook: "unhandledRejection",
      reason_type: typeof reason,
    }, "critical").then(() => {
      return activeClient?.flush();
    });
  }
};

export function installGlobalHooks(client: HookableClient): void {
  activeClient = client;
  if (!handlersInstalled) {
    process.on("uncaughtException", uncaughtExceptionHandler);
    process.on("unhandledRejection", unhandledRejectionHandler);
    handlersInstalled = true;
  }
}

export function uninstallGlobalHooks(): void {
  if (handlersInstalled) {
    process.removeListener("uncaughtException", uncaughtExceptionHandler);
    process.removeListener("unhandledRejection", unhandledRejectionHandler);
    handlersInstalled = false;
    activeClient = null;
  }
}
