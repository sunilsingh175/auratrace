import os
import time
import auratrace

def run_test():
    print("Initializing Python AuraTrace SDK...")
    client = auratrace.init(
        api_key=os.getenv("AURATRACE_API_KEY", "at_live_master_auratrace_2026"),
        endpoint=os.getenv("AURATRACE_ENDPOINT", "http://localhost:8000"),
        service_name="python-billing-service",
        environment="production",
    )

    print("Client initialized for service:", client.service_name)

    print("Dispatching test message...")
    auratrace.capture_message("Billing subscription renewed for user_4410", metadata={
        "plan": "enterprise",
        "amount": 299.00,
        "source": "python-sdk-test",
    })

    print("Dispatching test exception...")
    try:
        raise ValueError("StripeWebhookVerificationError: Invalid signature received from payment provider")
    except Exception as e:
        auratrace.capture_exception(e, metadata={
            "webhook_id": "wh_991823",
            "provider": "stripe",
            "status_code": 400,
        })

    auratrace.flush()
    time.sleep(1)
    print("Python SDK test completed successfully!")

if __name__ == "__main__":
    run_test()
