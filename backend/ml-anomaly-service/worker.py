import os
import sys
import json
import uuid
import time
import redis

# Make /app importable inside Docker
sys.path.insert(0, "/app")

from backend.shared.logger import get_logger

logger = get_logger("ml-worker")

# =========================================================
# Configuration
# =========================================================

REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

STREAM_NAME = os.getenv(
    "TELEMETRY_STREAM",
    "telemetry_stream"
)

GROUP_NAME = os.getenv(
    "ML_CONSUMER_GROUP",
    "ml-workers"
)

ANOMALY_CHANNEL = os.getenv(
    "ANOMALY_CHANNEL",
    "anomaly_events"
)

CONSUMER_NAME = os.getenv(
    "ML_CONSUMER_NAME",
    os.getenv("HOSTNAME", "ml-worker-1")
)

# =========================================================
# Redis Connection
# =========================================================

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
)

# =========================================================
# Consumer Group
# =========================================================

def create_consumer_group():
    """
    Create the Redis consumer group.

    '$' means the group starts with NEW messages and does
    not replay the old telemetry already present in the stream.
    """

    try:
        redis_client.xgroup_create(
            name=STREAM_NAME,
            groupname=GROUP_NAME,
            id="$",
            mkstream=True,
        )

        logger.info(
            "Created Redis consumer group '%s' for stream '%s'",
            GROUP_NAME,
            STREAM_NAME,
        )

    except redis.exceptions.ResponseError as exc:

        if "BUSYGROUP" in str(exc):

            logger.info(
                "Redis consumer group '%s' already exists.",
                GROUP_NAME,
            )

        else:
            raise


# =========================================================
# Safe Conversion
# =========================================================

def safe_float(value, default=0.0):
    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):

        logger.warning(
            "Invalid anomaly_score '%s'. Using %.4f",
            value,
            default,
        )

        return default


# =========================================================
# Parse Redis Stream Payload
# =========================================================

def parse_payload(data):
    """
    AuraTrace ingestion stores telemetry like:

        payload -> JSON string

    Example:

        {
            "payload": "{\"service_id\":\"demo-service\", ...}"
        }
    """

    raw_payload = data.get("payload")

    if raw_payload is None:

        logger.warning(
            "Redis message does not contain 'payload': %s",
            data,
        )

        return {}

    if isinstance(raw_payload, dict):
        return raw_payload

    try:

        payload = json.loads(raw_payload)

        if not isinstance(payload, dict):

            logger.warning(
                "Parsed Redis payload is not a JSON object."
            )

            return {}

        return payload

    except json.JSONDecodeError as exc:

        logger.error(
            "Failed to decode Redis payload: %s",
            exc,
        )

        return {}


# =========================================================
# Create Anomaly Event
# =========================================================

def publish_anomaly(payload):
    """
    Convert telemetry into an AuraTrace anomaly event.
    """

    service_id = payload.get(
        "service_id",
        "unknown-service"
    )

    error_type = payload.get(
        "error_type",
        "SystemAnomaly"
    )

    stack_trace = payload.get(
        "raw_stack_trace",
        payload.get(
            "stack_trace",
            payload.get(
                "log_message",
                payload.get(
                    "message",
                    ""
                )
            )
        )
    )

    anomaly_score = safe_float(
        payload.get("anomaly_score"),
        0.0,
    )

    incident_id = str(uuid.uuid4())

    incident = {
        "incident_id": incident_id,
        "service_id": service_id,
        "error_type": error_type,
        "stack_trace": stack_trace,
        "reason": (
            "Isolation Forest detected an anomalous "
            "telemetry event"
        ),
        "anomaly_score": anomaly_score,
        "is_diagnosed": False,
    }

    redis_client.publish(
        ANOMALY_CHANNEL,
        json.dumps(incident)
    )

    logger.warning(
        "Anomaly published for %s | score=%.4f | incident_id=%s",
        service_id,
        anomaly_score,
        incident_id,
    )

    return incident


# =========================================================
# Process One Stream Message
# =========================================================

def process_stream_message(message_id, data):

    try:

        logger.debug(
            "Received Redis stream message %s: %s",
            message_id,
            data,
        )

        payload = parse_payload(data)

        if not payload:

            logger.warning(
                "Skipping empty payload for message %s",
                message_id,
            )

            # Invalid payload is acknowledged so it does not
            # repeatedly poison the consumer.
            redis_client.xack(
                STREAM_NAME,
                GROUP_NAME,
                message_id,
            )

            return

        incident = publish_anomaly(payload)

        # ACK only after successful anomaly publishing.
        redis_client.xack(
            STREAM_NAME,
            GROUP_NAME,
            message_id,
        )

        logger.info(
            "Processed telemetry message %s | "
            "service=%s | score=%.4f",
            message_id,
            incident["service_id"],
            incident["anomaly_score"],
        )

    except Exception as exc:

        logger.exception(
            "Failed to process telemetry message %s: %s",
            message_id,
            exc,
        )

        # Do NOT ACK failed messages.
        # They remain pending for recovery.


# =========================================================
# Main Worker
# =========================================================

def run_worker():

    logger.info(
        "Connected to Redis at %s:%s",
        REDIS_HOST,
        REDIS_PORT,
    )

    create_consumer_group()

    logger.info(
        "ML Worker monitoring Redis Stream '%s' "
        "using consumer group '%s' and consumer '%s'...",
        STREAM_NAME,
        GROUP_NAME,
        CONSUMER_NAME,
    )

    while True:

        try:

            messages = redis_client.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={
                    STREAM_NAME: ">"
                },
                count=10,
                block=5000,
            )

            if not messages:
                continue

            for stream_name, entries in messages:

                for message_id, data in entries:

                    process_stream_message(
                        message_id,
                        data,
                    )

        except redis.exceptions.ConnectionError as exc:

            logger.error(
                "Redis connection error: %s",
                exc,
            )

            time.sleep(3)

        except redis.exceptions.TimeoutError as exc:

            logger.error(
                "Redis timeout: %s",
                exc,
            )

            time.sleep(2)

        except Exception as exc:

            logger.exception(
                "Unexpected ML worker error: %s",
                exc,
            )

            time.sleep(3)


# =========================================================
# Entry Point
# =========================================================

if __name__ == "__main__":

    logger.info(
        "Starting AuraTrace ML Anomaly Worker..."
    )

    run_worker()