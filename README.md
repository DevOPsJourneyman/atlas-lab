# Atlas Homelab

##   Project Overview
This repository documents the build and configuration of a production-like homelab environment, including clustering, software-defined networking, automated backups, and comprehensive monitoring. The lab serves as a testing ground for DevOps practices and infrastructure skills.

## What I built & learned

I have set up a proxmox cluster using old desktops. The cluster is home to a variety of VMs which allow me to practice managing them.  I've also set up another desktop with Truenas Scale so that I can back up the VMs and practice disaster recovery. 

##  🏗️ Architecture
![Atlas Lab Architecture](diagrams/homelab-architecture.png)

## Network Topology
Network: 192.168.0.0/24
Gateway: pfSense VM (192.168.0.1)
Compute Cluster: 2-node Proxmox cluster
Storage: Dedicated TrueNAS SCALE appliance
Monitoring: Prometheus + Grafana stack

## Hardware Infrastructure
| Device | Role | IP | Specs
|--------|------|----|----------|
| Atlas01 | Proxmox Node 1 | 192.168.0.10 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| Atlas02 | Proxmox Node 2 | 192.168.0.11 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| TrueNAS | Storage Node | 192.168.0.12 | HP EliteDesk 800 G3 SFF 24GB RAM, 3x 500GB HDD + NVMe boot|
| TBD     | Admin Workstation | DHCP - 192.180.0.x/24 | HP EliteBook 850 G5 32 GB RAM |
| TBD     | Dev/Test Server Ubuntu 24 | DHCP - 192.180.0.x/24 | HP EliteBook 840 G7 32 GB RAM |


## Virtual Machines
VM Name OS Purpose Host IP
pfSense pfSense 2.7+ Firewall/Router Atlas01 192.168.0.1
Cronus01 Windows Server 2022 Active Directory (future) Atlas01 TBD
Hestia01 Tiny11 Windows testing Atlas01 TBD
Zeus01 Ubuntu Server 24.04 Application server Atlas02 TBD
Taurus01 Ubuntu 25.04 Development/testing Atlas02 TBD
Kali Kali Linux Security testing Atlas02 TBD

## 🛠️ Technology Stack
Infrastructure

Hypervisor: Proxmox VE 9.1.1 (clustered)
Storage: TrueNAS SCALE with ZFS
Networking: pfSense, VLANs (future)
Backup: Proxmox Backup Server (integrated)


