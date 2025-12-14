Install Truenas Scale 
Download iso; created a usb bootable; Install on target device;  Configure device
    Used desktop over laptop due to LAN connection

Create a NFS share on Proxmox cluster
Create NFS share on Truenas;  Add new share on Proxmox; Datacenter > Storage > Add > NFS ; 
    Configure Truenas to allow access to both nodes; maproot user and maproot group needed assigning + node IP addresses

Back up a single VM
Select a vm to back up;  Used terminal to create the back; Back up completed and available  under truenas_sahre(atlas01) storage

Restore back up
Locate the backup, select restore;  await completion
Did not delete the original vm; restored as a copy;  Started vm to test it works; all good. 

Set up backup for all VMs
Create back up session in datacenter> backup ;  configure settings and select all vms;  
Initial backup is every 30 minutes; keep the last 7 backups. 
Also have backup proxmox cluster configs - located in 
oot@atlas01:~# # Create a timestamped archive
tar czvf /mnt/pve/truenas_share/pve-config-backup-$(hostname)-$(date +%F).tgz /etc/pve
root@atlas01:~# ls -lh /mnt/pve/truenas_share/

All vms backed up as expected. No issues to troubleshoot.