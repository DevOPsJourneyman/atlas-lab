##02-monitoring-stack.md: The Professional DraftCopy and paste this structure into your new documentation file.

#Project 02: Centralized Observability Stack (Prometheus & Grafana)##1. Project Goal & Value Proposition**Objective:** Establish a robust, scalable monitoring and alerting solution to gain deep visibility into the performance, health, and capacity of the entire Atlas Homelab infrastructure.

**Value:** Transitioning from reactive problem-solving to proactive capacity planning and maintenance. The implementation provides a quantifiable baseline for measuring resource utilization and ensures immediate notification of critical failures.

**Stack Components:**

* **Prometheus:** Time-series database and metric collection.
* **Node Exporter / Windows Exporter:** Agents deployed to gather system-level metrics.
* **Grafana:** Visualization and dashboarding.
* **Alertmanager:** Alert routing and notification management (Discord).

##2. Phase I: Foundation Deployment###Architecture OverviewThe core stack is containerized on a dedicated VM (`prometheus01`) to ensure isolation and portability. This central hub is responsible for scraping metrics from all other hosts and VMs.

* **VM Specs (prometheus01):** Ubuntu 24.04, 2 vCPU, 4GB RAM, 20GB Disk.
* **IP Address:** `192.168.0.20`
* **Deployment Method:** Docker Compose, managing the lifecycles of Prometheus, Grafana, and Alertmanager.

###Key Configuration: `docker-compose.yml`* *Note: This section will contain the committed Docker Compose configuration (e.g., volumes, networks, and service definitions).*

###Initial Validation1. Verified service health by accessing the **Grafana UI** (`http://192.168.0.20:3000`).
2. Configured **Prometheus as the default data source** within Grafana.
3. Executed a test query (`up{job="prometheus"}`) to confirm end-to-end data flow.

##3. Phase II: Proxmox Host Monitoring###ChallengeMonitor the underlying hardware and kernel performance of the two critical Proxmox hypervisors, `Atlas01` and `Atlas02`.

###Solution: Node Exporter ImplementationThe Prometheus `node_exporter` was installed and configured as a `systemd` service on both hosts.

**Installation (Scripting Focus):**
A standardized Bash script was used to ensure the installation, configuration, and service startup were identical on both nodes, promoting infrastructure-as-code principles.

* *Note: Link to the `scripts/install-node-exporter.sh`.*

###Prometheus Target ConfigurationThe `prometheus.yml` scrape configuration was updated to include the two hypervisor targets. This ensures robust metrics collection even if a target is temporarily down.

| Target | Job Name | Address |
| --- | --- | --- |
| `Atlas01` | `proxmox_hosts` | `192.168.0.10:9100` |
| `Atlas02` | `proxmox_hosts` | `192.168.0.11:9100` |

###**[Further sections will detail Dashboard Creation, VM Monitoring, TrueNAS integration, and Alerting logic.]**---

##Your Consolidated PlanYour original plan is essentially a step-by-step implementation guide. To keep you focused, here is a concise, high-level plan that consolidates your 6 phases into 4 logical sprints, focusing on the most critical dependencies:

###**Monitoring Stack: 4-Sprint Implementation Plan**| Sprint | Focus Area | Key Deliverable | Time Estimate | Dependencies |
| --- | --- | --- | --- | --- |
| **1. Foundation** | Core stack and internal metrics. | Working Dockerized **Prometheus** and **Grafana** accessible on `prometheus01`. | 2-3 hours | None |
| **2. Compute & Storage** | Deploying exporters to all critical infrastructure. | All Proxmox hosts (`Atlas01`, `Atlas02`), all VMs, and **TrueNAS** scraped successfully; verified in Prometheus UI. | 4-6 hours | Sprint 1 Complete. |
| **3. Visualization** | Creating actionable operational views. | Single **Grafana Dashboard** providing a consolidated view (CPU, RAM, Disk I/O) across all monitored resources. | 2 hours | Sprint 2 Complete. |
| **4. Observability** | Implementing failure notification. | **Alertmanager** integrated with Prometheus rules; test alert successfully routed to Discord webhook. | 1.5-2 hours | Sprint 3 Complete. |

**Total Estimated Time:** 9.5 - 12 hours.

This provides a clear roadmap. Start with **Sprint 1** (Foundation), as everything else depends on it. Good luck!