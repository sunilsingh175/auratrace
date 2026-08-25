"""
AuraTrace Shared Logging Module
Provides standardized structured JSON and colorized console logging.
"""

import sys
import os
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": getattr(record, "service", os.getenv("SERVICE_NAME", "auratrace-backend")),
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include custom extra metadata if present
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_obj.update(record.extra_data)

        return json.dumps(log_obj)


def get_logger(service_name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Initializes and returns a standardized logger instance.
    """
    logger = logging.getLogger(service_name)
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(level)

    # Avoid duplicate handlers if already initialized
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)

        # Use JSON formatting in production/containers, readable format if specified
        if os.getenv("LOG_FORMAT", "json").lower() == "json":
            handler.setFormatter(JSONFormatter())
        else:
            handler.setFormatter(
                logging.Formatter(
                    "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S"
                )
            )

        logger.addHandler(handler)

    return logger
