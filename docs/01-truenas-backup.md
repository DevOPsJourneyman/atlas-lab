Project: Proxmox Backup Infrastructure with TrueNAS Scale
1. Project Overview
Objective: Deploy a robust, networked storage solution to handle automated backups for a Proxmox VE Cluster. Solution: Implemented TrueNAS Scale as a dedicated NFS storage backend, configured automated VM snapshot schedules, and established a disaster recovery workflow.

2. Infrastructure Setup
TrueNAS Scale Installation
Hardware Selection: Deployed on a Desktop PC to utilize a stable, hardwired LAN connection (preferred over laptop Wi-Fi/adapters for storage throughput reliability).

Installation:

Flashed ISO to bootable USB media.

Installed TrueNAS Scale on target boot drive.

Configured static IP and initial network settings via console.

NFS Configuration (The "Bridge")
To allow the Proxmox cluster to write backups to TrueNAS, I configured a Network File System (NFS) share.

1. TrueNAS Configuration:

Created a new Dataset for backup storage.

Configured NFS Service.

Permissions Strategy: Set Maproot User and Maproot Group to ensure Proxmox has root-level write access to the specific share.

Security: Whitelisted the IP addresses of the Proxmox nodes to restrict access.

2. Proxmox Configuration:

Navigate to: Datacenter > Storage > Add > NFS.

Mapped the TrueNAS IP and the export path.

Enabled Content types: VZDump Backup File and ISO Image.

3. Testing & Validation
Single VM Backup Test
Before automating, I validated the write path by manually triggering a backup.

Action: Selected atlas01 VM and executed "Backup Now".

Result: Compression and transfer completed successfully. Verified the file presence in the target storage: /mnt/pve/truenas_share/.

Disaster Recovery Test (Restore)
A backup is only useful if it can be restored.

Locate the backup archive in Proxmox Storage.

Select Restore.

Configuration: Restored as a new VM ID (copy) rather than overwriting the live VM to ensure non-destructive testing.

Verification: Booted the restored VM successfully. Network and services came up without issues.

4. Automation Strategy
VM Backup Schedule
configured a recurring backup job to ensure data persistence.

Location: Datacenter > Backup > Add.

Scope: Select All VMs.

Schedule: Every 30 minutes (High frequency for testing environment).

Retention Policy: Keep Last 7. This ensures a rollout window while managing storage capacity.

Proxmox Host Configuration Backup
In addition to VM data, the Proxmox host configuration (/etc/pve) is critical. I utilized a shell script to archive the cluster configurations directly to the NFS share.

Command execution:

Bash

root@atlas01:~# # Create a timestamped archive of the PVE configuration
root@atlas01:~# tar czvf /mnt/pve/truenas_share/pve-config-backup-$(hostname)-$(date +%F).tgz /etc/pve

# Verify file creation
root@atlas01:~# ls -lh /mnt/pve/truenas_share/
5. Conclusion
All virtual machines are currently backing up according to the retention policy. The restore process has been validated, and the host configuration is being archived externally. No troubleshooting was required during deployment; the NFS permission mapping was the critical configuration step.