export function autoInstrumentExpress(app: any, auraTrace: any) {
  if (!app || typeof app.use !== "function") return;

  // Request error middleware
  app.use((err: any, req: any, res: any, next: any) => {
    auraTrace.captureException(err, {
      path: req.path,
      method: req.method,
      query: req.query,
    });
    next(err);
  });
}
