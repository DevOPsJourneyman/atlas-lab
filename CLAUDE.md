# CLAUDE.md

# Shared Context (Read at Session Start)
- **CONTEXT.md** — `/mnt/bot-data/shared/CONTEXT.md` — cross-session intelligence from all CC instances and Claude.ai
- **PANTHEON.md** — `/mnt/bot-data/shared/PANTHEON.md` — canonical agent roster, IPs, shared dir map
- **WORLD.md** — `/mnt/bot-data/shared/WORLD.md` — new info feed from Mundo

Read these at the start of any session where Pantheon state or agent context is relevant.
At session end, append a `## YYYY-MM-DD — [Topic] (Claude Code / laptop)` entry to CONTEXT.md for any decisions or changes that atlas02 CC or agents should know about.

## Sessions Tool
Session export script: `/mnt/bot-data/shared/tools/export-sessions.py`
Usage: `python3 /mnt/bot-data/shared/tools/export-sessions.py --last 5`
Command file: copy `/mnt/bot-data/shared/tools/sessions-command.md` → `~/.claude/commands/sessions.md`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules
- IMPORTANT: Always run `git status` before making any changes
- IMPORTANT: Never push directly to main without showing me the diff first
- Always check `kubectl get services -A` before assigning a new NodePort


## Repository Purpose

This is a **homelab infrastructure-as-code repository** for Atlas Lab — a 3-node k3s Kubernetes cluster running on Proxmox VE, backed by TrueNAS SCALE storage. The repo contains Kubernetes manifests, configuration docs, and operational runbooks. There is no application source code here — apps are built and pushed to Docker Hub (`devopsjourneyman/`) separately.

## Cluster Access

All kubectl commands run from **zeus01** (control plane, 192.168.0.21):
```bash
ssh zeus@192.168.0.21
kubectl get nodes
```

## Deploying to the Cluster

Apply manifests in this order when deploying a new app:
1. ConfigMap (if needed): `kubectl apply -f kubernetes/configmaps/<app>-config.yaml`
2. Secret (if needed): `kubectl apply -f kubernetes/secrets/<app>-secret.yaml`
3. PVC (if stateful): `kubectl apply -f kubernetes/deployments/<app>-pvc.yaml`
4. Deployment: `kubectl apply -f kubernetes/deployments/<app>-deployment.yaml`
5. Service: `kubectl apply -f kubernetes/services/<app>-service.yaml`

Access any app from LAN: `http://192.168.0.21:<nodeport>`

## Kubernetes Manifest Conventions

- All apps use `image: devopsjourneyman/<app-name>:latest` from Docker Hub
- Services use **NodePort** type for LAN access (no ingress controller)
- Deployments default to `replicas: 2`
- Apps listen on `containerPort: 5000` (Flask apps)
- Stateful apps mount a PVC at `/data` for SQLite persistence

## Deployed Apps

| App | NodePort | Notes |
|-----|----------|-------|
| nginx | 30080 | |
| atlas-dojo | 30502 | Flask app; uses ConfigMap + Secret |
| atlas-status | 30504 | Docker socket unavailable (k3s uses containerd) |
| atlas-nutrition-tracker | 30505 | Requires PVC applied first |

## Infrastructure

| Node | Role | IP |
|------|------|----|
| zeus01 | k3s control-plane | 192.168.0.21 |
| zeus02 | k3s worker | 192.168.0.22 |
| zeus03 | k3s worker | 192.168.0.23 |
| atlas01 | Proxmox node 1 | 192.168.0.10 |
| atlas02 | Proxmox node 2 | 192.168.0.11 |
| TrueNAS | Storage/backup | 192.168.0.12 |
| atlas-pi01 | Raspberry Pi 4 | 192.168.0.13 |
| Santiago (agent) | Hermes agent — life logging | 192.168.0.40 |
| Kirk (agent) | Hermes agent — pioneer/tester | 192.168.0.41 |
| Ramon (agent) | Hermes agent — briefing | 192.168.0.42 |
| Tesla (agent) | Hermes agent — infra | 192.168.0.43 |

## Useful kubectl Commands

```bash
kubectl get pods -A                          # All pods, all namespaces
kubectl describe pod <name>                  # Detailed state + events
kubectl logs <pod>                           # Container output
kubectl rollout restart deployment/<name>    # Force redeploy
kubectl apply -f <file>                      # Apply a manifest
kubectl apply -f <file> -n dev               # Apply to dev namespace
```

## Known Issues

- **atlas-status**: Docker socket is unavailable in k3s (containerd runtime). Dashboard cannot query running containers via Docker API.

## Next Up
- Week 5: GitHub Actions CI/CD pipeline for Flask apps
- Pipeline: code push → build Docker image → push to Docker Hub
