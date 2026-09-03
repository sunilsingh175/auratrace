-- AuraTrace Knowledge Base: OpenStack Historical Incident Dataset
-- This populates the PostgreSQL database so pgvector has historical context to search.

INSERT INTO incident_reports (service_id, error_type, stack_trace, ai_root_cause, ai_suggested_patch, is_diagnosed)
VALUES 
(
    'nova-compute',
    'libvirtError',
    'libvirtError: Permission denied on qcow2 disk image or backing file',
    'The nova-compute user does not have read/write access permissions to the QEMU/KVM base disk image directory, preventing instance spawning.',
    'chown -R nova:kvm /var/lib/nova/instances && chmod 755 /var/lib/nova/instances && systemctl restart libvirtd',
    TRUE
),
(
    'nova-api',
    'DBConnectionError',
    'oslo_db.exception.DBConnectionError: (pymysql.err.OperationalError) (2003, "Can''t connect to MySQL server")',
    'The OpenStack database connection pool is exhausted, or the MariaDB/MySQL service has crashed and is unresponsive.',
    'systemctl restart mariadb && openstack-service restart nova-api',
    TRUE
),
(
    'neutron-server',
    'MessagingTimeout',
    'oslo_messaging.exceptions.MessagingTimeout: Timed out waiting for a reply to message ID',
    'The RabbitMQ message broker is overloaded or partitioned, preventing OpenStack services from communicating via RPC.',
    'rabbitmqctl list_queues | grep neutron && systemctl restart rabbitmq-server',
    TRUE
),
(
    'nova-compute',
    'ComputeHostNotFound',
    'nova.exception.ComputeHostNotFound: Compute host could not be found.',
    'The nova-compute service on the hypervisor has lost connection to the controller node or the hypervisor clock is out of sync.',
    'ntpdate -u pool.ntp.org && systemctl restart nova-compute',
    TRUE
),
(
    'cinder-volume',
    'ISCSITargetCreateFailed',
    'cinder.exception.ISCSITargetCreateFailed: Failed to create iscsi target for volume',
    'The targetcli configuration is corrupted or the tgt daemon is not running on the storage node.',
    'systemctl enable tgtd && systemctl restart tgtd && cinder service-list',
    TRUE
);