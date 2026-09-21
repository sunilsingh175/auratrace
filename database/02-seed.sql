-- ==============================================================================
-- AuraTrace Historical Knowledge Base
-- OpenStack Historical Incident Dataset
-- ==============================================================================


-- ==============================================================================
-- SERVICES
-- ==============================================================================

INSERT INTO services (
    id,
    name,
    description,
    environment,
    status
)
VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'nova-compute',
    'OpenStack compute service responsible for managing virtual machine instances.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000002',
    'nova-api',
    'OpenStack compute API service.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000003',
    'neutron-server',
    'OpenStack networking service.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000004',
    'cinder-volume',
    'OpenStack block storage volume service.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000010',
    'payment-api',
    'High-throughput credit card processing and checkout transactions API.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000020',
    'auth-service',
    'User authentication, OAuth2 tokens, and role-based access control.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000030',
    'notification-worker',
    'Async worker sending transactional emails and push notifications.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000040',
    'order-service',
    'Order management and inventory reservation microservice.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000050',
    'inventory-service',
    'Warehouse catalog and stock synchronization service.',
    'staging',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000060',
    'hdfs-datanode',
    'Hadoop Distributed File System DataNode worker node.',
    'production',
    'ACTIVE'
),
(
    '00000000-0000-0000-0000-000000000070',
    'hdfs-namenode',
    'Hadoop Distributed File System Master NameNode coordinator.',
    'production',
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- HISTORICAL FIXES
-- ==============================================================================

INSERT INTO historical_fixes (
    service_id,
    error_type,
    stack_trace,
    root_cause,
    fix_description,
    code_patch
)
VALUES

(
    '00000000-0000-0000-0000-000000000001',
    'libvirtError',

    'libvirtError: Permission denied on qcow2 disk image or backing file',

    'The nova-compute user does not have read/write access permissions to the QEMU/KVM base disk image directory, preventing instance spawning.',

    'Correct ownership and permissions of the Nova instance directory and restart the libvirt service.',

    'chown -R nova:kvm /var/lib/nova/instances
chmod 755 /var/lib/nova/instances
systemctl restart libvirtd'
),

(
    '00000000-0000-0000-0000-000000000002',
    'DBConnectionError',

    'oslo_db.exception.DBConnectionError: (pymysql.err.OperationalError) (2003, "Can''t connect to MySQL server")',

    'The OpenStack database connection pool is exhausted, or the MariaDB/MySQL service has crashed and is unresponsive.',

    'Check database availability, restart MariaDB if necessary, and restart the affected Nova API service.',

    'systemctl restart mariadb
openstack-service restart nova-api'
),

(
    '00000000-0000-0000-0000-000000000003',
    'MessagingTimeout',

    'oslo_messaging.exceptions.MessagingTimeout: Timed out waiting for a reply to message ID',

    'The RabbitMQ message broker is overloaded or partitioned, preventing OpenStack services from communicating through RPC.',

    'Inspect RabbitMQ queues and restart the RabbitMQ service if the broker is unhealthy.',

    'rabbitmqctl list_queues | grep neutron
systemctl restart rabbitmq-server'
),

(
    '00000000-0000-0000-0000-000000000001',
    'ComputeHostNotFound',

    'nova.exception.ComputeHostNotFound: Compute host could not be found.',

    'The nova-compute service on the hypervisor has lost connection to the controller node or the hypervisor clock is out of sync.',

    'Synchronize the hypervisor clock and restart nova-compute.',

    'ntpdate -u pool.ntp.org
systemctl restart nova-compute'
),

(
    '00000000-0000-0000-0000-000000000004',
    'ISCSITargetCreateFailed',

    'cinder.exception.ISCSITargetCreateFailed: Failed to create iscsi target for volume',

    'The targetcli configuration is corrupted or the tgt daemon is not running on the storage node.',

    'Enable and restart the tgt service and verify the Cinder service status.',

    'systemctl enable tgtd
systemctl restart tgtd
cinder service-list'
),

(
    '00000000-0000-0000-0000-000000000010',
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
+    result = db.execute(query)'
),

(
    '00000000-0000-0000-0000-000000000030',
    'redis.exceptions.ConnectionError',

    'redis.exceptions.ConnectionError: Error 111 connecting to redis:6379. Connection refused.',

    'Background stream consumer disconnected during transient network blip without automatic backoff and reconnection handler.',

    'Add exponential backoff reconnection policy on Redis stream subscriber initialization.',

    '--- a/workers/consumer.py
+++ b/workers/consumer.py
@@ -12,2 +12,4 @@
-client = redis.Redis(host="redis-broker")
+client = redis.Redis(host="redis-broker", retry_on_timeout=True, socket_keepalive=True)'
),

(
    '00000000-0000-0000-0000-000000000010',
    'httpx.ReadTimeout',

    'httpx.ReadTimeout: The read operation timed out after 30000ms',

    'Downstream payment processor webhook endpoint experienced high upstream latency, causing HTTP client thread to hang indefinitely.',

    'Configure granular connection and read timeouts with a circuit breaker pattern.',

--- a/gateway/payment.py
+++ b/gateway/payment.py
@@ -45,2 +45,3 @@
-res = httpx.post(WEBHOOK_URL, json=payload)
+timeout = httpx.Timeout(5.0, connect=2.0)
+res = httpx.post(WEBHOOK_URL, json=payload, timeout=timeout)'
);


-- ==============================================================================
-- DEFAULT ADMIN SEED
-- ==============================================================================

INSERT INTO users (
    id,
    name,
    email,
    password_hash,
    password_salt,
    role,
    status
)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'Startup Hub',
    'startuphub695@gmail.com',
    'YPgjuwEsGcLajcM0H/qaA9P1jWUZnVd4Vka2JEyKqcE=',
    'ZSnO/bb1MOUaKsoVW8rtxg==',
    'Admin',
    'Active'
)
ON CONFLICT (email) DO NOTHING;