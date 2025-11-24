Objective: Make a VM on atlas02 get a DHCP lease from your pfSense VM ( on atlas01) and successfuly ping 8.8.8.8
Title: Project 0: Unifying the Atlas Cluster with VXLAN
Problem: VMs on atlas02 were isolated and could not reach the pfSense gateway on atlas01
Solution: Design and implement VXLAN using Proxmox's built-in SDN controller, creating a single L2 domain across both physical nodes.
Artifacts: Include your /etc/network/interfaces config, screenshots of your SDN Vnet, and the proof ( a screenshot of your atlas02 Ubuntu VM pinging the pfSense gateway and internet. 

Architecture
Manual Steps
Automation Artifact
Lessons learned 
