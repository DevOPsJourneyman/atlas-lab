---
name: atlas-lab-topology
description: >
  Complete infrastructure reference for the Atlas Lab homelab — a 3-node
  Proxmox VE cluster running Pantheon AI agents (LXC) plus a freshly-revived
  k3s Kubernetes cluster (VMs), with TrueNAS-style NFS storage. Use this skill
  whenever the user asks about their homelab, cluster nodes, node IPs, deployed
  apps, NodePorts, Docker containers, Kubernetes manifests, deployments,
  services, PVCs, storage, Proxmox, Pantheon agents, n8n, Santiago, VMs, LXC,
  kali, pentesting, Raspberry Pi, or any Atlas Lab operations. Always consult
  this skill before writing manifests, assigning NodePorts, running kubectl
  commands, or accessing any cluster resource. If the user asks "what's the IP
  of X", "what port does Y use", "how do I deploy to the cluster", or "what's
  running on the homelab" — use this skill.
version: 2.0.0
---

# Atlas Lab Infrastructure Reference

## Current Live Topology (as of 2026-07-27)

### Physical Hardware (Proxmox)

| Host | Hardware | RAM | Role |
|------|----------|-----|------|
| atlas01 | Lenovo M920q Tiny, i5-8500T | 32GB | Proxmox node 1 — Pantheon agents + zeus01 |
| atlas02 | Lenovo M920q Tiny, i5-8500T | 32GB | Proxmox node 2 — Infra LXC + zeus02/zeus03 |
| atlas03 | HP Z440, Xeon E5-2690 v4 (14c/28t), RTX 3090 24GB | 135GB DDR4 ECC | Proxmox node 3 — NFS storage + AI inference (physically the former atlas04) |

**Storage pools:**
- atlas01 → `vm_storage01` (lvmthin) — renamed from `vm_storage04` after the atlas04→atlas01 identity swap
- atlas02 → `vm_storage02` (lvmthin) — renamed from `vm_storage05` after the atlas02→atlas05 identity swap
- atlas03 → `Atlaspool` (NFS export source, ZFS raidz1)

### Network Topology

| Device | IP | Notes |
|--------|----|-------|
| atlas01 | 192.168.0.10 | Proxmox node 1 |
| atlas02 | 192.168.0.11 | Proxmox node 2 |
| atlas03 | 192.168.0.12 | Proxmox node 3, NFS server |
| zeus01 | 192.168.0.21 | k3s control-plane (VMID 101, on atlas01) |
| zeus02 | 192.168.0.22 | k3s worker (VMID 102, on atlas02) |
| zeus03 | 192.168.0.23 | k3s worker (VMID 103, on atlas02) |
| atlas-pi01 | 192.168.0.13 | Raspberry Pi 4 4GB — offline (PSU failure) |

### VM Inventory (Proxmox)

| VMID | Name | Node | IP | Spec | Role |
|------|------|------|----|------|------|
| 100 | Astro | atlas03 | 192.168.0.25 | RTX 3090 passthrough | Local LLM inference (llama.cpp, Qwen3.5-27B) |
| 101 | zeus01 | atlas01 | 192.168.0.21 | k3s v1.36.2+k3s1, Ubuntu 22.04.5 | k3s control-plane |
| 102 | zeus02 | atlas02 | 192.168.0.22 | k3s v1.36.2+k3s1, Ubuntu 22.04.5 | k3s worker |
| 103 | zeus03 | atlas02 | 192.168.0.23 | k3s v1.36.2+k3s1, Ubuntu 22.04.5 | k3s worker |

**k3s cluster status (rebuilt 2026-07-27, ~7 min old at last check):** all 3 nodes `Ready`,
containerd runtime. Only system services live so far — `kube-dns`, `metrics-server`, and
`traefik` (LoadBalancer, external IPs .21/.22/.23, ports 80/443 → NodePorts 31808/30245). **No
app workloads have been redeployed to it yet** — the NodePort table under Archive reflects the
*previous* build's app placements, not this rebuild; treat those ports as unconfirmed until
re-verified live.

### LXC Containers (Pantheon agents + infra)

| CTID | Name | Node | IP | Role |
|------|------|------|----|------|
| 201 | Ramon | atlas01 | 192.168.0.40 | Pantheon LIFE agent |
| 203 | Santiago | atlas01 | 192.168.0.42 | Pantheon OPS agent |
| 301 | atlas-mcp | atlas02 | 192.168.0.30 | MCP services (calendar, filesystem, proxmox, research, tasks, memory) |
| 303 | atlas-git | atlas02 | 192.168.0.32 | Forgejo (self-hosted git server) |

CT 202 (Tesla) and CT 204 (nero) retired 2026-07-18. `santiago-lxc` (old CT 200, Docker/n8n)
no longer exists — see Archive.

### Cluster Access

```bash
ssh zeus@192.168.0.21     # kubectl runs from zeus01 (control plane)
kubectl get nodes
```

SSH username is `zeus` (not `rt`) for k3s cluster nodes. LAN access to any k8s app:
`http://192.168.0.21:<nodeport>`.

## Kubernetes Manifest Conventions

- Images: `devopsjourneyman/<app-name>:latest` from Docker Hub
- Service type: **NodePort** (no ingress controller)
- Default replicas: `2` (except stateful apps — use `1` with RWO PVCs)
- Flask apps listen on `containerPort: 5000`
- Stateful apps mount PVC at `/data` for SQLite persistence
- Git remote: `https://github.com/DevOPsJourneyman/atlas-lab.git` (capital OPs)

## Deploying a New App

Manifests live in `~/kubernetes/` on zeus01 — **not** auto-synced from git.
Always copy files to zeus01 before applying:

```bash
scp kubernetes/deployments/<app>-deployment.yaml zeus@192.168.0.21:~/kubernetes/deployments/
```

Apply in this order:
1. ConfigMap (if needed): `kubectl apply -f kubernetes/configmaps/<app>-config.yaml`
2. Secret (if needed): `kubectl apply -f kubernetes/secrets/<app>-secret.yaml`
3. PVC (if stateful): `kubectl apply -f kubernetes/deployments/<app>-pvc.yaml`
4. Deployment: `kubectl apply -f kubernetes/deployments/<app>-deployment.yaml`
5. Service: `kubectl apply -f kubernetes/services/<app>-service.yaml`

Check PVCs before applying stateful deployments: `kubectl get pvc`

## Operational Rules

- Always run `git status` before making any changes to this repo
- Never push directly to main without showing the diff first
- Always check `kubectl get services -A` before assigning a new NodePort

## Useful kubectl Commands

```bash
kubectl get pods -A                          # All pods, all namespaces
kubectl get services -A                      # All services + NodePorts
kubectl get pvc                              # Persistent volume claims
kubectl describe pod <name>                  # Detailed state + events
kubectl logs <pod>                           # Container output
kubectl rollout restart deployment/<name>    # Force redeploy
kubectl apply -f <file>                      # Apply a manifest
kubectl apply -f <file> -n dev               # Apply to dev namespace
```

## Known Issues

- **atlas-status**: Docker socket unavailable in k3s (containerd runtime). Dashboard cannot query running containers via Docker API.

---

## Archive — pre-2026-07 state (for history, not current fact)

This section preserves what the cluster looked like before the atlas04→atlas01 and
atlas02→atlas05 node-identity swaps, and before the 2026-07-27 k3s rebuild. Kept so future
sessions know where the lab came from — **do not treat anything below as current**.

### Old hardware (both atlas01/atlas02 were HP EliteDesk 800 G3 SFF, 32GB, 2x 250GB SSD;
atlas03/TrueNAS was a separate HP EliteDesk 800 G3 SFF, 24GB, 3x 500GB HDD). Both EliteDesks
behind atlas01/atlas02 were replaced by the Lenovo M920q Tiny units listed above; the original
atlas03 EliteDesk was decommissioned 2026-07-20 and its role absorbed by the former atlas04
(Z440/RTX3090), which was itself renamed atlas03.

### Old LXC: santiago-lxc (CT 200)
- 192.168.0.14, Debian 12 (privileged), ran n8n in Docker on atlas01
- File mounts: `/mnt/bot-data/santiago-files` → `/home/node/.n8n-files`, `/mnt/bot-data/logs` → `/home/node/.n8n-files/logs`
- Offset stored in `/mnt/bot-data/santiago-files/santiago.json`
- Trailing spaces in n8n file path fields were a recurring issue
- Every Switch branch had to write updated offset back to `santiago.json` or messages replayed on next cycle
- `getBinaryDataBuffer(0, 'data')` — index 0 for single-item reads
- `fs` module blocked in Code nodes — used `prepareBinaryData` + Write Binary File node instead
- Superseded by the Pantheon Santiago agent (CT 203); this container no longer exists

### Old VM: kali01 (VMID 104, 192.168.0.24)
Pentesting VM, 2vCPU/4GB/60GB, hosted on atlas01. Not part of the 2026-07-27 k3s revival —
does not currently exist. Revive separately if needed.

### Previous NodePort app table (pre-rebuild; unconfirmed on the new cluster)

| App | NodePort | Notes |
|-----|----------|-------|
| nginx | 30080 | |
| atlas-dojo | 30502 | Flask app; uses ConfigMap + Secret |
| atlas-status | 30504 | Docker socket unavailable (k3s uses containerd) |
| atlas-nutrition-tracker | 30505 | Requires PVC; replicas: 1 (RWO SQLite) |

### Previous Docker (host-level, alongside k8s on zeus01)

| App | Host Port | Notes |
|-----|-----------|-------|
| atlas-nutrition-tracker | 5001 | Same app as k8s workload |
| atlas-dojo | 5002 | Same app as k8s workload |
| atlas-status | 5003 | Same app as k8s workload |

### Previous per-app resource profile

**atlas-nutrition-tracker** (k8s)
- `replicas: 1` (RWO PVC — SQLite cannot be safely shared across pods)
- Memory: requests 64Mi / limits 128Mi
- CPU: requests 100m / limits 250m
- Readiness probe: GET `/` on port 5000
- PVC: `atlas-nutrition-tracker-pvc` (1Gi, RWO, local-path)

### Old TrueNAS reference
Earlier docs described a standalone "TrueNAS" NFS host at 192.168.0.12 with share
`Truenas_share`. That role is now served by atlas03's own `Atlaspool` ZFS export (see current
Physical Hardware table) — there is no separate TrueNAS box.

### Old upcoming-work note
- Week 5: GitHub Actions CI/CD pipeline for Flask apps (code push → build Docker image → push to Docker Hub) — status unconfirmed, verify before assuming still pending.
