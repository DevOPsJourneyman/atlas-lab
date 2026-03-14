# Kubernetes — Atlas Lab

## Cluster Overview

| Node | Role | IP | Version |
|---|---|---|---|
| zeus01 | control-plane | 192.168.0.21 | v1.34.4+k3s1 |
| zeus02 | worker | 192.168.0.22 | v1.34.4+k3s1 |
| zeus03 | worker | 192.168.0.23 | v1.34.4+k3s1 |

Installed: 1 March 2026

## Installation

### Control plane (zeus01)

Single command install — k3s handles everything:
```bash
curl -sfL https://get.k3s.io | sh -
```

Fix kubeconfig permissions so kubectl works without sudo:
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
chmod 600 ~/.kube/config
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc
```

### Worker nodes (zeus02, zeus03)

Grab the token from zeus01:
```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

Run on each worker:
```bash
curl -sfL https://get.k3s.io | K3S_URL=https://192.168.0.21:6443 K3S_TOKEN=YOUR_TOKEN sh -
```

## Verify
```bash
kubectl get nodes
```

All three nodes should show `Ready`.# Kubernetes Manifests

YAML manifests for deploying apps to the k3s cluster.

## Structure

- `pods/` — standalone pod definitions (learning/testing)
- `deployments/` — production-style deployments with replicas
- `services/` — NodePort services for LAN access
- `persistentvolumeclaims/` — PVC definitions for stateful apps

## Apps

| App | Deployment | Service | NodePort | Notes |
|---|---|---|---|---|
| nginx | `nginx-deployment.yaml` | `nginx-service.yaml` | 30080 | |
| atlas-dojo | `atlas-dojo-deployment.yaml` | `atlas-dojo-service.yaml` | 30502 | |
| atlas-status | `atlas-status-deployment.yaml` | `atlas-status-service.yaml` | 30504 | Docker socket unavailable in k3s (containerd runtime). See GitHub issue. |
| atlas-nutrition-tracker | `atlas-nutrition-tracker-deployment.yaml` | `atlas-nutrition-tracker-service.yaml` | 30505 | Requires PVC — apply `atlas-nutrition-pvc.yaml` before deployment. replicas: 1 (RWO PVC). Resource limits set. Readiness probe on /. |

## Deploy
```bash
kubectl apply -f ~/kubernetes/deployments/atlas-dojo-deployment.yaml
kubectl apply -f ~/kubernetes/services/atlas-dojo-service.yaml
```

## Access

From any machine on the LAN: `http://192.168.0.21:<nodeport>`

## ConfigMaps

Store non-sensitive configuration:
```bash
kubectl apply -f configmaps/atlas-dojo-config.yaml
```

## Secrets

Store sensitive data (passwords, API keys):
```bash
kubectl apply -f secrets/atlas-dojo-secret.yaml
```

## Namespaces

Deploy to a specific namespace with `-n`:
```bash
kubectl create namespace dev
kubectl apply -f deployments/atlas-dojo-deployment.yaml -n dev
kubectl apply -f services/atlas-dojo-service-dev.yaml -n dev
```

## Useful Commands

| Command | Purpose |
|---------|---------|
| `kubectl get pods -A` | All pods, all namespaces |
| `kubectl describe pod <name>` | Detailed state + events |
| `kubectl logs <pod>` | Container output |
| `kubectl rollout restart deployment/<name>` | Force redeploy |
