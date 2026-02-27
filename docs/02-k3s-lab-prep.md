# 02 — K3s Lab Preparation

**Date:** 2026-02-27
**Purpose:** Decommission legacy VMs, migrate and reprovision infrastructure 
for a 3-node k3s cluster spanning both Proxmox nodes.

---

## Target Architecture

| VMID | Name   | Node    | IP             | vCPU | RAM | Role              |
|------|--------|---------|----------------|------|-----|-------------------|
| 101  | zeus01 | atlas01 | 192.168.0.21   | 4    | 8GB | k3s control plane |
| 102  | zeus02 | atlas02 | 192.168.0.22   | 2    | 4GB | k3s worker 1      |
| 103  | zeus03 | atlas02 | 192.168.0.23   | 2    | 4GB | k3s worker 2      |
| 104  | kali01 | atlas01 | 192.168.0.24   | 2    | 4GB | pentesting        |

---

## Step 1 — Stop TrueNAS Backup Tasks
Stopped all scheduled backup jobs before decommissioning VMs to avoid 
backing up infrastructure marked for deletion.

---

## Step 2 — Decommission Legacy VMs
Deleted VMs with no roadmap purpose from atlas01 and atlas02.
```bash
# atlas01
qm destroy 100  # pfSense
qm destroy 101  # cronus01
qm destroy 102  # hestia01

# atlas02
qm destroy 105  # taurus01
```

---

## Step 3 — Reassign VMIDs (atlas02)
Cloned zeus01 and kali01 to clean VMIDs before migration.
```bash
qm clone 104 101 --name zeus01 --full
qm destroy 104

qm clone 103 104 --name kali01 --full
qm destroy 103
```

---

## Step 4 — Migrate VMs to atlas01
Migrated zeus01 and kali01 from atlas02 to atlas01.
```bash
qm migrate 101 atlas01 --targetstorage vm_storage01
qm migrate 104 atlas01 --targetstorage vm_storage01
```

---

## Step 5 — Provision zeus02 and zeus03 (atlas02)
Created two new Ubuntu Server 24 worker nodes on atlas02.
```bash
qm create 102 --name zeus02 --memory 4096 --cores 2 --net0 virtio,bridge=vmbr0
qm set 102 --scsi0 vm_storage02:20

qm create 103 --name zeus03 --memory 4096 --cores 2 --net0 virtio,bridge=vmbr0
qm set 103 --scsi0 vm_storage02:20
```

Installed Ubuntu Server 24 (minimized) on both via ISO.

---

## Step 6 — Set Static IPs
Configured static IPs via netplan on all VMs.

`/etc/netplan/50-cloud-init.yaml`:
```yaml
network:
  version: 2
  ethernets:
    ens18:
      dhcp4: no
      addresses:
        - 192.168.0.XX/24
      routes:
        - to: default
          via: 192.168.0.1
      nameservers:
        addresses: [1.1.1.1]
```
```bash
sudo netplan apply
```

---

## Step 7 — Resize zeus01
Extended zeus01 to 4 vCPU / 8GB RAM for control plane workload.
LVM volume extended after migration:
```bash
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv
```

---

## Step 8 — Verify
```bash
# Confirmed on each VM
nproc
free -h
df -h /

# SSH from workstation confirmed
ssh zeus@192.168.0.21
ssh zeus@192.168.0.22
ssh zeus@192.168.0.23
ssh zeus@192.168.0.24
```

---

## Step 9 — TrueNAS Cleanup
Deleted all old backup files from TrueNAS share:
```bash
rm -rf /mnt/pve/Truenas_share/dump/*
```

New daily backups to be configured for VMIDs 101-104 post-stabilisation.

---

## Issues Encountered

| Issue | Cause | Fix |
|---|---|---|
| SSH permission denied to zeus03 | Kali still on 192.168.0.23, IP conflict | Updated Kali to .24, zeus03 to .23 |
| Disk showing 19G after migration | LVM not auto-extended | lvextend + resize2fs |
| `local-lvm` storage not found | atlas01 uses `vm_storage01` | Used correct storage name |