# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
| santiago-lxc | n8n automation (Debian LXC) | 192.168.0.14 |

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
