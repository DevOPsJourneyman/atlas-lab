# Atlas Lab — VM Inventory

Last updated: 2026-02-27

## Proxmox Nodes

| Node | IP | RAM | Storage |
|---|---|---|---|
| atlas01 | 192.168.0.10 | 32GB | vm_storage01 (lvmthin) |
| atlas02 | 192.168.0.11 | 32GB | vm_storage02 (lvmthin) |

## Virtual Machines

| VMID | Name | Node | IP | vCPU | RAM | Disk | Role |
|---|---|---|---|---|---|---|---|
| 101 | zeus01 | atlas01 | 192.168.0.21 | 4 | 8GB | 40GB | k3s control plane |
| 102 | zeus02 | atlas02 | 192.168.0.22 | 2 | 4GB | 20GB | k3s worker 1 |
| 103 | zeus03 | atlas02 | 192.168.0.23 | 2 | 4GB | 20GB | k3s worker 2 |
| 104 | kali01 | atlas01 | 192.168.0.24 | 2 | 4GB | 60GB | pentesting |

## Reserved
| VMID | Purpose |
|---|---|
| 100 | OPNSense (future) |