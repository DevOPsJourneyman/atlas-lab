# Atlas Homelab

## Project Overview
Two old HP desktops, a NAS box, and a lot of troubleshooting later.
This is Atlas Lab. A home Kubernetes cluster built from scratch on Proxmox, 
backed by TrueNAS storage, and used as my hands-on platform for learning 
DevOps properly. No cloud credits, no managed services. Just real 
infrastructure I built, broke, and fixed myself.

## What I built & learned

I have set up a proxmox cluster using old desktops. The cluster is home to a variety of VMs which allow me to practice managing them.  I've also set up another desktop with Truenas Scale so that I can back up the VMs and practice disaster recovery.  Intial set up had a complex networking solution with OPNsense providing firewall services. I have removed that and assigned IPs to all VMs on local LAN.  This allowed me to SSH/RDP directly into the VMs. 

I have decided to reset the VMs to provide a clean slate for k3s phase. The focus will be creating a Kubernetes cluster with 3 nodes across the proxmox cluster. 

##  🏗️ Architecture
[![](https://mermaid.ink/img/pako:eNqNk91umzAUx1_FOtcEYRtIwsWkfqhb1bWKlqiRNnrhBjexADtyjNY1yRv0Ym-wV-wj7AAhFVUrFSHkvzm__znHH1tYmExCAksr1isyO081wedSO2m1dGQw-EK-mVL-MBXO_EqhFqRVZEfm6kKRYQp3LfYaWYO7ubIy25Hpb-UWK2Rnk8F3pXPkIjIx1pGvainulTtEHG1a2eQ-cYXYBBThl3_PfzuJDnTMfBqP_MCnwXvgzFby5mRaZ21HfYZ9nIz1k7E-SI9g--3cBz42fHMxJadikVfrXVfqp6JYG9V1V9dye02btp9k1Tac8w05M9pZU5BJIbTs1cVe63rrEqJLLgrVuFzhgOAmVI99PHyDsyPOuiLYoYi5sTlucH8TGPvQgHcGvG_QX1jGGwPw8CSqDBKHK-ZBKW0pagnb2jwFt5KlTCHBYSZsnkKq98ishf5pTNlh1lTLFSQPotigqtaZcPJcCTzj5XHWSp1Je2Yq7SChI96YQLKFR5Qx9VlMR2MaDfmYjXjkwR-c5oE_ppxHPMRfYRSEew-emryBH4cRjQMWxDwc4uuBzJQz9rq9Xs0t2_8HHIoBOA)]





## Hardware Infrastructure
| Device | Role | IP | Specs
|--------|------|----|----------|
| Atlas01 | Proxmox Node 1 | 192.168.0.10 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| Atlas02 | Proxmox Node 2 | 192.168.0.11 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| TrueNAS | Storage Node | 192.168.0.12 | HP EliteDesk 800 G3 SFF 24GB RAM, 3x 500GB HDD + NVMe boot|
| TBD     | Admin Workstation | DHCP - 192.168.0.x/24 | HP EliteBook 850 G5 32 GB RAM |
| TBD     | Dev/Test Server Ubuntu 24 | DHCP - 192.168.0.x/24 | HP EliteBook 840 G7 32 GB RAM |


## Virtual Machines
| VMID | Name | OS | Role | Host | IP |
|------|------|----|------|------|----|
| 100 | *(reserved)* | — | OPNSense (future) | — | — |
| 101 | zeus01 | Ubuntu Server 24.04 | k3s control plane | atlas01 | 192.168.0.21 |
| 102 | zeus02 | Ubuntu Server 24.04 | k3s worker 1 | atlas02 | 192.168.0.22 |
| 103 | zeus03 | Ubuntu Server 24.04 | k3s worker 2 | atlas02 | 192.168.0.23 |
| 104 | kali01 | Kali Linux | Pentesting | atlas01 | 192.168.0.24 |


## 🛠️ Technology Stack
### Infrastructure

Hypervisor: Proxmox VE 9.1.1 (clustered)

Backup:  TrueNAS SCALE with ZFS


### Network Topology

| Network | 192.168.0.0/24 |
|---------|----------------|
| Gateway | Home Router (192.168.0.1) |

