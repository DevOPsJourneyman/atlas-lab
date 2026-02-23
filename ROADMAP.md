# Atlas Lab — Roadmap

Planned infrastructure and DevOps projects for this home lab environment.
Updated as projects are completed.

## In Progress
- Network simplification and VM access (SSH/RDP) ✅
- Repository structure and documentation cleanup

## Planned
- Docker: Containerised applications on zeus01 (Week 2-3)
- project: atlas-api — REST API exposing meal plan and nutrition data
- project: connect atlas-api to atlas-status dashboard
- project: atlas-dojo port to standalone Flask app when Python skills sharpen 
- Kubernetes: K3s cluster deployment (Week 5-6)
- CI/CD: GitHub Actions pipelines (Week 6)
- Ansible: Automated VM configuration management (Week 7)
- Terraform: Azure infrastructure as code (Week 8)
- Monitoring: Prometheus + Grafana stack (Week 9)
- Capstone: Full-stack DevOps portfolio project (Week 10-12)


## Completed
- Proxmox VE 9 two-node cluster build
- TrueNAS SCALE storage integration
- Network migration from VXLAN SDN to simplified bridge (vmbr0)
- VM provisioning: Ubuntu Server, Ubuntu Desktop, Windows Server 2022, Windows 11, Kali

## Decommissioned
- OPNSense firewall VM (powered off — planned reintroduction with proper network segmentation)
- VXLAN SDN configuration (replaced with direct bridge networking)
