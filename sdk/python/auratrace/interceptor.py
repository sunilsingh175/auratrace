"""
AuraTrace Middleware Interceptors for FastAPI / Starlette / Flask
"""

import time
import traceback
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .client import AuraTrace


class AuraTraceMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette middleware that times requests, captures latency metrics,
    and reports unhandled 500 exceptions directly to AuraTrace.
    """

    def __init__(self, app, client: AuraTrace):
        super().__init__(app)
        self.client = client

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            response = await call_next(request)
            latency_ms = (time.perf_counter() - start_time) * 1000.0

            level = "ERROR" if response.status_code >= 500 else "WARN" if response.status_code >= 400 else "INFO"
            self.client.log(
                level=level,
                message=f"{method} {path} - {response.status_code}",
                latency_ms=latency_ms,
                metadata={
                    "status_code": response.status_code,
                    "method": method,
                    "path": path,
                },
            )
            return response

        except Exception as exc:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            self.client.critical(
                message=f"Unhandled Exception in {method} {path}: {str(exc)}",
                error_type=exc.__class__.__name__,
                stack_trace=tb_str,
                latency_ms=latency_ms,
                path=path,
                method=method,
            )
            raise exc from None
