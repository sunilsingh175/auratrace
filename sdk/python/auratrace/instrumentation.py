"""
Framework auto-instrumentation for FastAPI, Flask, and ASGI apps.
"""
def auto_instrument(app=None):
    """Auto-instruments FastAPI or Flask web applications."""
    if app is None:
        return
    # Check for FastAPI / Starlette middleware support
    if hasattr(app, "add_middleware"):
        try:
            from starlette.middleware.base import BaseHTTPMiddleware
            class AuraTraceMiddleware(BaseHTTPMiddleware):
                async def dispatch(self, request, call_next):
                    try:
                        return await call_next(request)
                    except Exception as exc:
                        import auratrace
                        auratrace.capture_exception(exc)
                        raise
            app.add_middleware(AuraTraceMiddleware)
        except Exception:
            pass
