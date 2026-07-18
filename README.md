# Atlas Homelab

## ⚠️ Security Note

This repository documents a personal homelab learning project. Infrastructure details
(IPs, ports, configurations) have been generalized for security. Do not attempt to
access these systems — they are private infrastructure.

For educational and portfolio purposes only.

---

## Project Overview

Two old HP desktops, a storage node, and a lot of troubleshooting later.
This is Atlas Lab — a home infrastructure platform built from scratch on Proxmox,
backed by ZFS storage, used as a hands-on learning platform for DevOps.

No cloud credits, no managed services. Real infrastructure built, broken, and fixed.

## What I Built

Started with a Proxmox cluster running VMs. Added ZFS-backed storage for
disaster recovery practice. Moved through OPNsense (removed — too complex), k3s
(3-node cluster, decommissioned during cleanup), and into the current phase:
an AI agent platform called the Pantheon, using Hermes as the agent runtime.

The Pantheon is the current focus — two active AI agents with distinct roles (LIFE, OPS),
running as unprivileged LXC containers with shared context over NFS and a centralized MCP layer for
cross-agent knowledge. Tesla (INTEL) and nero (EXECUTION) retired 2026-07-18, work absorbed by Santiago.

## Hardware Infrastructure

| Device | Role | Specs |
|--------|------|-------|
| atlas01 | Proxmox Node 1 | HP EliteDesk 800 G3 SFF, 32GB RAM, 2x 250GB SSD |
| atlas02 | Proxmox Node 2 | HP EliteDesk 800 G3 SFF, 32GB RAM, 2x 250GB SSD |
| atlas03 | Proxmox Node 3 + NFS Storage | HP EliteDesk 800 G3 SFF, 24GB RAM, 3x 500GB HDD + NVMe boot |
| atlas04 | Proxmox Node 4 — AI Inference | HP Z440, Xeon E5-2690 v4 (14c/28t), 128GB DDR4 ECC, RTX 3090 24GB |
| kronos | Admin Workstation | HP EliteBook 850 G5, 32GB RAM, Ubuntu LTS |
| atlas-pi01 | Raspberry Pi 4 | 4GB RAM, 32GB SD — offline (PSU failure) |

## Virtual Machines & Containers

### VMs (100s)

| VMID | Name | OS | Role | Host |
|------|------|----|------|------|
| 100 | Astro | Ubuntu LTS | Local LLM inference (RTX 3090 passthrough) | atlas04 |

**Note:** Previous k3s cluster (zeus01-03) and security testing VM (kali01) were
decommissioned during infrastructure cleanup. k3s is planned for revival.

### Pantheon Agents (200s)

| CTID | Name | OS | Role | Host |
|------|------|----|------|------|
| 201 | Ramon | Debian 12 | LIFE — habits, body, water, daily briefings, VP domains | atlas01 |
| 202 | Tesla | Debian 12 | ⚰️ INTEL — retired 2026-07-18, archive at `/Atlaspool/bot-data/shared/agent-graveyard/` | atlas01 |
| 203 | Santiago | Debian 12 | OPS — infra health, DevOps, INTEL domain, SearXNG | atlas01 |
| 204 | nero | Debian 12 | ⚰️ EXECUTION — test build, retired 2026-07-18, archive at `/Atlaspool/bot-data/shared/agent-graveyard/` | atlas02 |

### Infrastructure Containers (300s)

| CTID | Name | OS | Role | Host |
|------|------|----|------|------|
| 301 | atlas-mcp | Debian 12 | MCP services (6 servers: calendar, filesystem, proxmox, research, tasks, memory) | atlas02 |
| 303 | atlas-git | Debian 12 | Forgejo (self-hosted git server) | atlas02 |
| 304 | jellyfish | Debian 12 | Jellyfin media server | atlas03 |

## Technology Stack

**Infrastructure:** Proxmox VE (4-node cluster) · NFS storage (ZFS backend)

**AI Platform:** Hermes agent runtime · Vector database for memory · MCP (Model Context Protocol)

**Local Inference:** llama.cpp (CUDA, Docker) · RTX 3090 · Qwen3.5-27B · GPU passthrough (VFIO)

**Automation:** Ansible · systemd · NFS for shared agent context

**Network:** Private LAN · Home router gateway

## Pantheon — AI Agent Platform

Two active agents running as Hermes-powered LXC containers, each with a defined role and personality.
Tesla (INTEL) and nero (EXECUTION) retired 2026-07-18 — SOUL.md and eulogies archived in agent-graveyard/.

### atlas-mcp — The Shared MCP Layer

`atlas-mcp` (CTID 301) runs six MCP servers:
- **calendar** — CalDAV integration for event management
- **filesystem** — File operations on shared storage
- **proxmox** — Proxmox control and monitoring
- **research** — Web search and information gathering
- **tasks** — Task management and tracking
- **memory** — Vector-based persistent memory system

Agents connect via per-agent configuration files in their Hermes home directories.

### Verification

| Task | Command |
|------|---------|
| MCP service status | `ssh root@<atlas-mcp> systemctl status mcp-*.service` |
| Vector DB health | `curl -s http://localhost:<port>/health` (from atlas-mcp) |
| Agent configs | `ansible agents -i ansible/inventory.ini -m command -a "ls -la ~/.hermes/" --become` |

## Local LLM Inference — atlas04

The newest node: an HP Z440 workstation upgraded specifically for local AI inference
(CPU E5-1603 v3 → E5-2690 v4, GPU GT 740 → RTX 3090 24GB), joined to the cluster as
the fourth Proxmox node. The GPU is passed through whole (VFIO) to a single VM —
the Proxmox host runs no NVIDIA driver at all, so kernel updates can never break
the inference stack.

**Astro** (VM 100, 24 vCPU, 64GB RAM) serves the LLM via Docker:

- `llama.cpp` server (CUDA) running **Qwen3.5-27B** (Unsloth dynamic Q4 quant, fully
  GPU-offloaded, flash attention, 64K context) — OpenAI-compatible API
  consumed by the Pantheon agents as a local model provider
- `restart=unless-stopped` + VM `onboot` + QEMU guest agent: the whole stack
  recovers unattended from a cold node boot in under two minutes — verified

Why a VM instead of an LXC container: passthrough to a VM keeps the host clean and
decouples guest driver updates from the PVE kernel; a container would need the full
NVIDIA stack on the host and version-matched libraries inside, and breaks on kernel
upgrades. The ~1–3% virtualization overhead is noise for GPU-bound inference.

## Ansible Playbooks

| Playbook | Purpose |
|----------|---------|
| `atlas-mcp.yml` | Provision atlas-mcp LXC, bind-mount NFS paths |
| `install_node.yml` | Install Node.js on atlas-mcp |
| `deploy_memory_mcp.yml` | Deploy memory MCP app + systemd service |
| `setup_foundation.yml` | Install Node + Python tooling on atlas-mcp |
| `check_env.yml` | Audit Node/Python versions on atlas-mcp |

Run order for a fresh deploy:
```bash
ansible-playbook -i ansible/inventory.ini ansible/atlas-mcp.yml -e proxmox_token_secret=SECRET
ansible-playbook -i ansible/inventory.ini ansible/install_node.yml
ansible-playbook -i ansible/inventory.ini ansible/deploy_memory_mcp.yml
```

## DevOps Roadmap

- ✅ Weeks 1–3: Proxmox setup, NFS storage, networking
- ❌ Weeks 4–5: k3s cluster — decommissioned (cleanup), planned revival
- ✅ Week 6: Pantheon agent platform (Hermes, LXC) — 4 agents live
- ✅ Week 7: Ansible — infrastructure as code (atlas-mcp provisioning)
- 🔲 Week 8: Terraform (planned)
- 🔲 Week 9: Monitoring — Prometheus + Grafana (planned)
- 🔲 Week 10+: k3s revival (in progress)

---

*Last updated: 2026-07-18*
