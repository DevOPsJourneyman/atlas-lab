Atlas Homelab

🎯 Project Overview
This repository documents the build and configuration of a production-like homelab environment, including clustering, software-defined networking, automated backups, and comprehensive monitoring. The lab serves as a testing ground for DevOps practices and infrastructure skills.

🏗️ Architecture
Network Topology

Network: 192.168.0.0/24
Gateway: pfSense VM (192.168.0.1)
Compute Cluster: 2-node Proxmox cluster
Storage: Dedicated TrueNAS SCALE appliance
Monitoring: Prometheus + Grafana stack

Hardware Infrastructure
Device Role Specs IP Address
Atlas01 Proxmox Node 1HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD 192.168.0.10
Atlas02 Proxmox Node 2HP EliteDesk 800 G3 SFF 32GB RAM, 2x 250GB SSD 192.168.0.11
TrueNAS Storage NodeHP EliteDesk 800 G3 SFF 24GB RAM, 3x 500GB HDD + NVMe boot 192.168.0.12
EliteBook 850 G5 Admin Workstation Ubuntu 24.04 Desktop DHCP
EliteBook 840 G7 Dev/Test Server Ubuntu Server 24.04 TBD

Virtual Machines
VM Name OS Purpose Host IP
pfSense pfSense 2.7+ Firewall/Router Atlas01 192.168.0.1
Cronus01 Windows Server 2022 Active Directory (future) Atlas01 TBD
Hestia01 Tiny11 Windows testing Atlas01 TBD
Zeus01 Ubuntu Server 24.04 Application server Atlas02 TBD
Taurus01 Ubuntu 25.04 Development/testing Atlas02 TBD
Kali Kali Linux Security testing Atlas02 TBD

🛠️ Technology Stack
Infrastructure

Hypervisor: Proxmox VE 9.1.1 (clustered)
Storage: TrueNAS SCALE with ZFS
Networking: pfSense, VLANs (future)
Backup: Proxmox Backup Server (integrated)

Monitoring & Observability (In Progress)

Metrics: Prometheus
Visualization: Grafana
Exporters: node_exporter, windows_exporter
Alerting: Alertmanager → Discord

Future Additions

Configuration Management: Ansible
Container Orchestration: Docker Swarm or K3s
CI/CD: GitLab CE or Jenkins
Log Aggregation: ELK Stack or Loki