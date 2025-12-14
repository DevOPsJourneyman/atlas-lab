 **Note**: For the complete troubleshooting log with all commands and outputs, see [troubleshooting-notes.txt](00-troubleshooting-notes.txt)

Project 0: Unifying the Atlas Cluster with VXLAN
Objective

Make a VM on atlas02 get a DHCP lease from your pfSense VM on atlas01 and successfully ping 8.8.8.8.

Problem

VMs on atlas02 were isolated and could not reach vms on atlas01.  Vms on atlas01 could ping vms on atlas02

Solution

Designed and implemented VXLAN using Proxmox's built-in SDN controller, creating a single L2 domain across both physical nodes.

Architecture

atlas01 – pfSense VM and Proxmox node

atlas02 – isolated VMs

VXLAN network connecting both nodes
(Include a diagram in /assets/architecture.png and link here)

Manual Steps

Configure VXLAN in Proxmox SDN on both nodes

Attach VMs on atlas02 to the VXLAN network

Verify DHCP lease from pfSense

Test connectivity by pinging 8.8.8.8

Proof / Artifacts

Screenshot of SDN Vnet configuration: /assets/sdn-vnet.png

Screenshot of atlas02 VM pinging vm on atlas01: /assets/ping-gateway.png

Screenshot of internet connectivity test: /assets/ping-8.8.8.8.png

/etc/network/interfaces config files

Lessons Learned

check all firewalls; Windows defender blocks everything

VXLAN simplifies multi-node L2 connectivity

Always verify MTU settings on VMs when using overlay networks

Document every step during setup for easier troubleshooting
