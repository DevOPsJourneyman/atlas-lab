# Atlas Homelab

##   Project Overview
This repository documents the build and configuration of a production-like homelab environment, including clustering, software-defined networking, automated backups, and comprehensive monitoring. The lab serves as a testing ground for DevOps practices and infrastructure skills.

## What I built & learned

I have set up a proxmox cluster using old desktops. The cluster is home to a variety of VMs which allow me to practice managing them.  I've also set up another desktop with Truenas Scale so that I can back up the VMs and practice disaster recovery.  Intial set up had a complex networking solution with OPNsense providing firewall services. I have removed that and assigned IPs to all VMs on local LAN.  This allowed me to SSH/RDP directly into the VMs. 

##  🏗️ Architecture
[![](https://mermaid.ink/img/pako:eNptkt9v2jAQx_-Vk582KaliJyFNHiYV0gLbOqHBVqkJDy4xxGpiI2O3dCT_-0xCqTTmB8v343P3vZMPaCULhhK0ruTrqqRKwyLNBdhzczhMhWZKMN224LpfYPhpImsGP6Wx7j7pgd9NIfrcG8Muq3ngihUNjLLFzP3OxXMfDGEmbfUx39AnrmH-yvWqXPax_h4d8WamZC338MPKaiDN1jRZU5dZYSXc6IruPHyq53kwHsJ8ni7_wfcf_O1_eHLB2_6drw-k_RS_77GHm7tspKQwO3fO1AtTHob3uQX0LiAeIcsLlDTjbMJ2mlM3ZbtnLbfvwhdcvAHGJ-T2A_EbmGTfaMXBbs3sLxOCZpo9MnNewa8nI7Q56wguibD5mi2oURfMSROQ0ELIQRvFC2Q3Ve2Yg2qmanq00eEI5UiXrGY5SuyzYGtqKp2jXLSW21LxKGWNEq2MJZU0m_Jcx2wLqlnK6UbR-uxVTBRMjaTVgZLQJ10RlBzQHiUkHFzh2I_9KIrJwA8c9IYSHHtXIfFwRMLII0EUha2D_nRdbSDwfW9AfBzE1xG-9h3ECq6luu-_dfe727_UVty-?type=png)](https://mermaid.live/edit#pako:eNptkt9v2jAQx_-Vk582KaliJyFNHiYV0gLbOqHBVqkJDy4xxGpiI2O3dCT_-0xCqTTmB8v343P3vZMPaCULhhK0ruTrqqRKwyLNBdhzczhMhWZKMN224LpfYPhpImsGP6Wx7j7pgd9NIfrcG8Muq3ngihUNjLLFzP3OxXMfDGEmbfUx39AnrmH-yvWqXPax_h4d8WamZC338MPKaiDN1jRZU5dZYSXc6IruPHyq53kwHsJ8ni7_wfcf_O1_eHLB2_6drw-k_RS_77GHm7tspKQwO3fO1AtTHob3uQX0LiAeIcsLlDTjbMJ2mlM3ZbtnLbfvwhdcvAHGJ-T2A_EbmGTfaMXBbs3sLxOCZpo9MnNewa8nI7Q56wguibD5mi2oURfMSROQ0ELIQRvFC2Q3Ve2Yg2qmanq00eEI5UiXrGY5SuyzYGtqKp2jXLSW21LxKGWNEq2MJZU0m_Jcx2wLqlnK6UbR-uxVTBRMjaTVgZLQJ10RlBzQHiUkHFzh2I_9KIrJwA8c9IYSHHtXIfFwRMLII0EUha2D_nRdbSDwfW9AfBzE1xG-9h3ECq6luu-_dfe727_UVty-)





## Hardware Infrastructure
| Device | Role | IP | Specs
|--------|------|----|----------|
| Atlas01 | Proxmox Node 1 | 192.168.0.10 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| Atlas02 | Proxmox Node 2 | 192.168.0.11 |HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD |
| TrueNAS | Storage Node | 192.168.0.12 | HP EliteDesk 800 G3 SFF 24GB RAM, 3x 500GB HDD + NVMe boot|
| TBD     | Admin Workstation | DHCP - 192.168.0.x/24 | HP EliteBook 850 G5 32 GB RAM |
| TBD     | Dev/Test Server Ubuntu 24 | DHCP - 192.168.0.x/24 | HP EliteBook 840 G7 32 GB RAM |


## Virtual Machines
|VM | Name | OS | Purpose | Host | IP 
|-------|-------|------|-------|-------|--------|
| VM101 | Cronus01 | Windows Server 2022 | Active Directory (future) | Atlas01 | 192.168.0.21|
| VM102 | Hestia01 | Tiny11 | Windows testing | Atlas01 | 192.168.0.22
| VM103 | Kali | Kali Linux | Security testing | Atlas02 | 192.168.0.23 |
| VM104 | Zeus01 | Ubuntu Server 24.04 | Application server | Atlas02 | 192.168.0.24 |
| VM105 | Taurus01 | Ubuntu 25.04 | Development/testing | Atlas02 | 192.168.0.25 |


## 🛠️ Technology Stack
### Infrastructure

Hypervisor: Proxmox VE 9.1.1 (clustered)

Backup:  TrueNAS SCALE with ZFS


### Network Topology

| Network | 192.168.0.0/24 |
|---------|----------------|
| Gateway | Home Router (192.168.0.1) |

