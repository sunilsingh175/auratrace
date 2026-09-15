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
);