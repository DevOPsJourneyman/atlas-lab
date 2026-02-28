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

All three nodes should show `Ready`.