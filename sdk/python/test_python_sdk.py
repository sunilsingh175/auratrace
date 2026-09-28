"""
Unit tests for the official AuraTrace Python SDK.
Tests initialization, telemetry queueing, exception sanitization, and transport handling offline.
"""

import os
import pytest
from auratrace.client import AuraTrace, _sanitize_stack_trace, auto_detect_service_name
import auratrace


def test_auto_detect_service_name(monkeypatch):
    monkeypatch.setenv("AURATRACE_SERVICE_NAME", "order-service")
    assert auto_detect_service_name() == "order-service"


def test_sanitize_stack_trace():
    raw_trace = 'Traceback (most recent call last):\n  File "C:\\Users\\dev\\project\\backend\\main.py", line 42, in process\n    raise ValueError("error")'
    sanitized = _sanitize_stack_trace(raw_trace)
    assert "C:\\Users\\dev" not in sanitized
    assert 'File "backend/main.py"' in sanitized


def test_auratrace_init_no_master_key_fallback(monkeypatch):
    monkeypatch.delenv("AURATRACE_API_KEY", raising=False)
    monkeypatch.delenv("AURA_MASTER_API_KEY", raising=False)
    
    client = AuraTrace(api_key="at_test_key_12345", service_name="test-service", install_global_hook=False)
    assert client.api_key == "at_test_key_12345"
    assert client.service_name == "test-service"
    assert client.environment == "production"


def test_capture_message_queuing():
    client = AuraTrace(api_key="at_test_key_12345", service_name="test-service", install_global_hook=False)
    client.capture_message("User authentication succeeded", metadata={"user_id": "usr_100"})
    
    assert not client._queue.empty()
    item = client._queue.get_nowait()
    assert item["level"] == "INFO"
    assert item["message"] == "User authentication succeeded"
    assert item["metadata"]["user_id"] == "usr_100"


def test_capture_exception_queuing():
    client = AuraTrace(api_key="at_test_key_12345", service_name="test-service", install_global_hook=False)
    try:
        raise KeyError("missing_account_id")
    except Exception as exc:
        client.capture_exception(exc, metadata={"transaction_id": "tx_9988"})
        
    assert not client._queue.empty()
    item = client._queue.get_nowait()
    assert item["level"] == "ERROR"
    assert item["error_type"] == "KeyError"
    assert "missing_account_id" in item["message"]
    assert item["metadata"]["transaction_id"] == "tx_9988"


def test_global_module_functions(monkeypatch):
    monkeypatch.setenv("AURATRACE_API_KEY", "at_test_env_key")
    monkeypatch.setenv("AURATRACE_SERVICE_NAME", "global-test-service")
    
    client = auratrace.init(install_global_hook=False)
    assert client.api_key == "at_test_env_key"
    assert client.service_name == "global-test-service"
    
    auratrace.capture_message("Global test log")
    assert not client._queue.empty()
