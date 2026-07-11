# Atlas Homelab

## Project Overview
Two old HP desktops, a NAS box, and a lot of troubleshooting later.
This is Atlas Lab — a home infrastructure platform built from scratch on Proxmox,
backed by TrueNAS storage, used as a hands-on learning platform for DevOps.
No cloud credits, no managed services. Real infrastructure built, broken, and fixed.

## What I built

Started with a Proxmox cluster running VMs. Added TrueNAS for ZFS-backed storage and
disaster recovery practice. Moved through OPNsense (removed — too complex), k3s
(3-node cluster across the two Proxmox nodes), and into the current phase: an AI agent
platform called the Pantheon, using Hermes as the agent runtime.

The Pantheon is the current focus — four AI agents with distinct roles, running as
unprivileged LXC containers, with shared context over NFS and a centralized MCP memory
brain for cross-agent knowledge.

## Hardware Infrastructure

| Device | Role | IP | Specs |
|--------|------|----|-------|
| atlas01 | Proxmox Node 1 | 192.168.0.10 | HP EliteDesk 800 G3 SFF, 32GB RAM, 2x 250GB SSD |
| atlas02 | Proxmox Node 2 | 192.168.0.11 | HP EliteDesk 800 G3 SFF, 32GB RAM, 2x 250GB SSD |
| atlas04 | Proxmox Node 4 — AI inference | 192.168.0.13 | HP Z440, Xeon E5-2690 v4 (14c/28t), 128GB DDR4 ECC, RTX 3090 24GB |
| TrueNAS | Storage Node | 192.168.0.12 | HP EliteDesk 800 G3 SFF, 24GB RAM, 3x 500GB HDD + NVMe boot |
| kronos | Admin Workstation | 192.168.0.141 | HP EliteBook 850 G5, 32GB RAM |
| atlas-pi01 | Raspberry Pi 4 | — | 4GB RAM, 32GB SD — offline (PSU failure) |

## Virtual Machines & Containers

### VMs (100s)
| VMID | Name | OS | Role | Host | IP |
|------|------|----|------|------|----|
| 100 | Astro | Ubuntu 26.04 | Local LLM inference (RTX 3090 passthrough) | atlas04 | 192.168.0.25 |
| 101 | zeus01 | Ubuntu 24.04 | k3s control plane | atlas01 | 192.168.0.21 |
| 102 | zeus02 | Ubuntu 24.04 | k3s worker 1 | atlas02 | 192.168.0.22 |
| 103 | zeus03 | Ubuntu 24.04 | k3s worker 2 | atlas02 | 192.168.0.23 |
| 104 | kali01 | Kali Linux | Security testing | atlas01 | 192.168.0.24 |

### Pantheon Agents (200s)
| CTID | Name | OS | Role | Host | IP |
|------|------|----|------|------|----|
| 201 | Santiago | Debian 12 | Life OS — habits, food, sleep logging | atlas01 | 192.168.0.40 |
| 202 | Kirk | Debian 12 | Pioneer — supervisor, tester, coordination | atlas01 | 192.168.0.41 |
| 203 | Ramon | Debian 12 | Briefing agent — morning brief, weekly report | atlas01 | 192.168.0.42 |
| 204 | Tesla | Debian 12 | Infra health monitoring + container builder | atlas02 | 192.168.0.43 |

### Infrastructure Containers (300s)
| CTID | Name | OS | Role | Host | IP |
|------|------|----|------|------|----|
| 301 | atlas-mcp | Debian 12 | MCP services: Qdrant + memory brain | atlas01 | 192.168.0.30 |

## Technology Stack

**Infrastructure:** Proxmox VE (clustered) · TrueNAS SCALE (ZFS) · k3s (3-node)

**AI Platform:** Hermes agent runtime · Qdrant vector DB · MCP (Model Context Protocol)

**Local Inference:** llama.cpp (CUDA, Docker) · RTX 3090 · Qwen3.5-27B · GPU passthrough (VFIO)

**Automation:** Ansible · systemd · NFS for shared agent context

**Network:** 192.168.0.0/24 · Home router gateway (192.168.0.1)

## Pantheon — AI Agent Platform

Four agents running as Hermes-powered LXC containers, each with a defined role and personality.
All agents share context over NFS (`/mnt/bot-data/shared/`) and can write to the centralized
memory brain via MCP.

### atlas-mcp — The Shared Brain

`atlas-mcp` (CTID 301, 192.168.0.30) runs:
- **Qdrant** on port 6333 — vector database for persistent agent memory
- **mcp-brain** on port 3000 — Node.js MCP bridge (SSE) connecting agents to Qdrant

Agents connect via `mcp_servers.json`:
```json
{
  "mcpServers": {
    "atlas-memory": {
      "url": "http://192.168.0.30:3000/sse"
    }
  }
}
```

Config deployed at `/home/zeus/.hermes/mcp_servers.json` (owner: `zeus:hermes`, mode `0664`).

### Verification

| Task | Command |
|------|---------|
| Brain health | `curl -s http://192.168.0.30:3000/health` |
| Brain service | `ssh root@192.168.0.30 systemctl status mcp-brain` |
| Qdrant status | `curl -s http://192.168.0.30:6333/health` |
| Agent configs | `ansible agents -i ansible/inventory.ini -m command -a "ls -la /home/zeus/.hermes/mcp_servers.json" --become` |

## Local LLM Inference — atlas04

The newest node: an HP Z440 workstation upgraded specifically for local AI inference
(CPU E5-1603 v3 → E5-2690 v4, GPU GT 740 → RTX 3090 24GB), joined to the cluster as
the fourth Proxmox node. The GPU is passed through whole (VFIO) to a single VM —
the Proxmox host runs no NVIDIA driver at all, so kernel updates can never break
the inference stack.

**Astro** (VM 100, 24 vCPU host-type, 64GB RAM) serves the LLM via Docker:

- `llama.cpp` server (CUDA) running **Qwen3.5-27B** (Unsloth dynamic Q4 quant, fully
  GPU-offloaded, flash attention, 64K context, ~39 tok/s) — OpenAI-compatible API
  on `:8080`, consumed by the Pantheon agents as a local model provider
- `restart=unless-stopped` + VM `onboot` + QEMU guest agent: the whole stack
  recovers unattended from a cold node boot in under two minutes — verified

Why a VM instead of an LXC container: passthrough to a VM keeps the host clean and
decouples guest driver updates from the PVE kernel; a container would need the full
NVIDIA stack on the host and version-matched libraries inside, and breaks on kernel
upgrades. The ~1–3% virtualization overhead is noise for GPU-bound inference.

## Ansible Playbooks

| Playbook | Purpose |
|----------|---------|
| `atlas-mcp.yml` | Provision atlas-mcp LXC on atlas01, bind-mount NFS paths |
| `install_node.yml` | Install Node.js 20.x on atlas-mcp |
| `deploy_memory_mcp.yml` | Deploy mcp-brain app + systemd service to atlas-mcp |
| `setup_foundation.yml` | Install Node + Python tooling on atlas-mcp |
| `check_env.yml` | Audit Node/Python versions on atlas-mcp |

Run order for a fresh deploy:
```bash
ansible-playbook -i ansible/inventory.ini ansible/atlas-mcp.yml -e proxmox_token_secret=SECRET
ansible-playbook -i ansible/inventory.ini ansible/install_node.yml
ansible-playbook -i ansible/inventory.ini ansible/deploy_memory_mcp.yml
```

## DevOps Roadmap

- Weeks 1–3: Proxmox setup, TrueNAS, networking
- Weeks 4–5: k3s cluster, app deployments
- Week 6: Pantheon agent platform (Hermes, LXC)
- Week 7: Ansible — infrastructure as code (atlas-mcp provisioning)
- Week 8: Terraform (planned)
- Week 9: Monitoring — Prometheus + Grafana (planned)
