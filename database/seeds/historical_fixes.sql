-- ==============================================================================
-- AuraTrace Knowledge Base Seeds: historical_fixes.sql
-- Verified global diagnostic and fix knowledge base with pgvector embeddings metadata.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- DEFAULT PROJECT SEED
-- ------------------------------------------------------------------------------
INSERT INTO projects (
    id,
    name,
    api_key_hash
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'AuraTrace Production Platform',
    '78d3897d266ee7e8a9f6d4d12543e49be96c561bcf7047f3f1e9411dcb144074'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- VERIFIED GLOBAL HISTORICAL FIXES
-- ------------------------------------------------------------------------------
INSERT INTO historical_fixes (
    project_id,
    is_global,
    error_type,
    stack_trace,
    root_cause,
    fix_description,
    code_patch,
    embedding_model,
    embedding_version,
    source,
    verified_at
)
VALUES

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'libvirtError',
    'libvirtError: Permission denied on qcow2 disk image or backing file',
    'The nova-compute user does not have read/write access permissions to the QEMU/KVM base disk image directory, preventing instance spawning.',
    'Correct ownership and permissions of the Nova instance directory and restart the libvirt service.',
    'chown -R nova:kvm /var/lib/nova/instances
chmod 755 /var/lib/nova/instances
systemctl restart libvirtd',
    'bge-small-en-v1.5',
    '1',
    'openstack_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'DBConnectionError',
    'oslo_db.exception.DBConnectionError: (pymysql.err.OperationalError) (2003, "Can''t connect to MySQL server")',
    'The OpenStack database connection pool is exhausted, or the MariaDB/MySQL service has crashed and is unresponsive.',
    'Check database availability, restart MariaDB if necessary, and restart the affected Nova API service.',
    'systemctl restart mariadb
openstack-service restart nova-api',
    'bge-small-en-v1.5',
    '1',
    'openstack_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'MessagingTimeout',
    'oslo_messaging.exceptions.MessagingTimeout: Timed out waiting for a reply to message ID',
    'The RabbitMQ message broker is overloaded or partitioned, preventing OpenStack services from communicating through RPC.',
    'Inspect RabbitMQ queues and restart the RabbitMQ service if the broker is unhealthy.',
    'rabbitmqctl list_queues | grep neutron
systemctl restart rabbitmq-server',
    'bge-small-en-v1.5',
    '1',
    'openstack_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'ComputeHostNotFound',
    'nova.exception.ComputeHostNotFound: Compute host could not be found.',
    'The nova-compute service on the hypervisor has lost connection to the controller node or the hypervisor clock is out of sync.',
    'Synchronize the hypervisor clock and restart nova-compute.',
    'ntpdate -u pool.ntp.org
systemctl restart nova-compute',
    'bge-small-en-v1.5',
    '1',
    'openstack_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'ISCSITargetCreateFailed',
    'cinder.exception.ISCSITargetCreateFailed: Failed to create iscsi target for volume',
    'The targetcli configuration is corrupted or the tgt daemon is not running on the storage node.',
    'Enable and restart the tgt service and verify the Cinder service status.',
    'systemctl enable tgtd
systemctl restart tgtd
cinder service-list',
    'bge-small-en-v1.5',
    '1',
    'openstack_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'sqlalchemy.exc.TimeoutError',
    'Traceback (most recent call last):
  File "/app/services/checkout.py", line 142, in process_transaction
    db = engine.connect()
sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out',
    'High volume of concurrent checkout requests caused unclosed database connections to leak, rapidly exhausting the SQLAlchemy connection QueuePool.',
    'Wrap database connections inside context managers `with engine.connect() as db:` and increase pool overflow size.',
    '--- a/services/checkout.py
+++ b/services/checkout.py
@@ -140,4 +140,5 @@
-db = engine.connect()
-result = db.execute(query)
+with engine.connect() as db:
+    result = db.execute(query)',
    'bge-small-en-v1.5',
    '1',
    'auratrace_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'redis.exceptions.ConnectionError',
    'redis.exceptions.ConnectionError: Error 111 connecting to redis:6379. Connection refused.',
    'Background stream consumer disconnected during transient network blip without automatic backoff and reconnection handler.',
    'Add exponential backoff reconnection policy on Redis stream subscriber initialization.',
    '--- a/workers/consumer.py
+++ b/workers/consumer.py
@@ -12,2 +12,4 @@
-client = redis.Redis(host="redis-broker")
+client = redis.Redis(host="redis-broker", retry_on_timeout=True, socket_keepalive=True)',
    'bge-small-en-v1.5',
    '1',
    'auratrace_verified',
    CURRENT_TIMESTAMP
),

(
    '00000000-0000-0000-0000-000000000001',
    TRUE,
    'httpx.ReadTimeout',
    'httpx.ReadTimeout: The read operation timed out after 30000ms',
    'Downstream payment processor webhook endpoint experienced high upstream latency, causing HTTP client thread to hang indefinitely.',
    'Configure granular connection and read timeouts with a circuit breaker pattern.',
    '--- a/gateway/payment.py
+++ b/gateway/payment.py
@@ -45,2 +45,3 @@
-res = httpx.post(WEBHOOK_URL, json=payload)
+timeout = httpx.Timeout(5.0, connect=2.0)
+res = httpx.post(WEBHOOK_URL, json=payload, timeout=timeout)',
    'bge-small-en-v1.5',
    '1',
    'auratrace_verified',
    CURRENT_TIMESTAMP
);
