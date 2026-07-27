---
tags: [runbook, infra, migration]
type: runbook
status: template
created: 2026-07-26
---

# Proxmox node identity swap — reusable runbook

Generic procedure for retiring a decommissioned node's hostname/IP and handing it to another
already-clustered box (its guests, storage, and hardware stay put — only cluster identity
changes). First run: atlas04 → atlas01 (2026-07-26, completed, six real problems found and
fixed along the way — all folded into the steps below). Next: atlas02 → atlas05.

Fill in for your instance:

| Variable | atlas04→atlas01 (done) | atlas02→atlas05 (next) |
|---|---|---|
| `$RETIRED` / `$RETIRED_IP` | atlas01 / 192.168.0.10 | atlas02 / 192.168.0.11 |
| `$SURVIVOR` (current name of the box taking over) | atlas04 / 192.168.0.16 | atlas05 / 192.168.0.17 |
| `$VMIDS` (guests on survivor) | 201, 203 | 301, 303 |
| `$STORAGE_NEW` (survivor's storage.cfg entry) | vm_storage04 | vm_storage05 |
| `$STORAGE_DEAD` (orphaned entry to remove) | vm_storage01 | vm_storage02 |
| `$JOIN_IP` (cluster member to rejoin through) | 192.168.0.12 (atlas03) | 192.168.0.12 (atlas03) |

## Context / precondition

The retired node (`$RETIRED`) must already be: drained of guests (moved to `$SURVIVOR`),
`pvecm delnode`'d out of the cluster, data drives wiped, and powered off. This is *not* a
physical hardware swap — `$SURVIVOR`'s own hardware, storage, and guests stay exactly where
they are. Only its cluster identity (hostname, IP, corosync membership) changes.

**Also verify shell access to `$SURVIVOR` itself before starting Phase 2 — don't assume it.**
Everything from Phase 2b onward (hostnamectl, `/etc/hosts`, corosync file surgery, reboot)
needs a working shell on `$SURVIVOR`, not just Proxmox API/cluster-status reads. The first run's
survivor (atlas04) already had SSH/MCP admin access configured, so this precondition held
silently and never got written down — check `proxmox_node_list`'s `preferredTransport` /
`capabilities` (`host_shell`) for `$SURVIVOR` explicitly; `"api_only"` with no `host_shell` means
no shell path exists yet and you must establish one (console, temp password, or bootstrap) before
touching Phase 2.

## End State

- `$SURVIVOR` is renamed to `$RETIRED` (hostname + IP), guests unaffected data-wise
- Guests (`$VMIDS`) keep their disks/config content, running again after a restart
- `$STORAGE_NEW`'s `nodes` line points at `$RETIRED` (the new name), not the old survivor name
- The dead `$STORAGE_DEAD` entry (belonged to the now-wiped original `$RETIRED` hardware) is removed
- Every SSH/network trace of the *original* `$RETIRED` hardware is gone — not just dangling
- No leftover `/etc/pve/nodes/<old-survivor-name>` directory afterward

## Phase 0 — pre-flight + old `$RETIRED` trail cleanup (do this first, no rollback risk)

The retired hardware's SSH key, `known_hosts` entries, and any SDN zone membership are **not**
rollback aids for this swap — that box is already off with wiped drives. Clear this cruft
before starting the risky work, not after.

**Confirm `$RETIRED` is actually offline before doing anything else.** Don't assume it — a
prior run found the box `delnode`'d from the cluster's point of view but still powered on and
answering on `$RETIRED_IP` (stale local corosync/pmxcfs state, `Cannot initialize CMAP
service`). Assigning `$RETIRED_IP` to `$SURVIVOR` while the old box is still live on that IP
causes a network conflict. If it's still up: verify zero guests (`pct list`/`qm list` empty),
capture its own outbound SSH pubkey fingerprint for the prune step below, then shut it down and
re-confirm no ping response before proceeding.

```bash
ping -c2 -W2 $RETIRED_IP            # expect: no reply — confirm it's truly off
ssh root@$JOIN_IP 'pvecm status'    # expect: quorate, current node count

# back up before editing either
ssh root@$JOIN_IP 'cp -a /etc/pve/storage.cfg /root/storage.cfg.bak-$(date +%F)'
ssh root@$JOIN_IP 'cp -a /etc/pve/priv/authorized_keys /root/authorized_keys.bak-$(date +%F)'
```

**Prune the retired node's own dead SSH key** — find it by fingerprint (don't guess), it's the
one that used to belong to `$RETIRED`'s own outbound root SSH:
```bash
ssh root@$JOIN_IP 'cat /etc/pve/priv/authorized_keys'
# cross-reference against a fingerprint captured from the retired box before it was wiped
```

**Clear stale host-key trust for `$RETIRED_IP` on every machine that ever connected to it** —
not just your admin workstation. Miss one and it throws "REMOTE HOST IDENTIFICATION HAS
CHANGED" the moment new hardware answers that IP (hit this on atlas03 last time — only
cleared Kronos originally):
```bash
# on Kronos AND every remaining cluster node (e.g. atlas03):
ssh-keygen -R $RETIRED_IP
ssh-keygen -R $RETIRED
```

**Remove any SDN zone referencing dead node names** (check first, don't assume):
```bash
ssh root@$JOIN_IP 'cat /etc/pve/sdn/zones.cfg /etc/pve/sdn/vnets.cfg 2>&1'
# if it lists only already-retired node names and no guest uses it, remove both files
```

**Audit for hardcoded references to the retired IP/hostname:**
```bash
grep -rn "$RETIRED_IP\b" ~/gitupdates/ 2>/dev/null | grep -v "\.git/"
```

## Phase 1 — leave the cluster as `$SURVIVOR`

```bash
# on $SURVIVOR itself:
systemctl stop pve-cluster corosync

# from $JOIN_IP:
ssh root@$JOIN_IP 'pvecm delnode $SURVIVOR'
```

Cluster drops by one vote during this window. Confirm the remaining members can still hold
quorum without `$SURVIVOR` before doing this (no qdevice in this cluster).

## Phase 2 — rename on `$SURVIVOR` (console or direct SSH, not through the cluster)

**2a. Back up the guest configs first — before touching anything else.** This is the one truly
non-negotiable ordering dependency in the whole runbook:
```bash
for id in $VMIDS; do cp -a /etc/pve/lxc/$id.conf /root/$id.conf.bak; done
```

**2b. Change identity — hostname, `/etc/hosts`, and network IP together, in one batch.**
`/etc/hosts` MUST map the new hostname to the new IP before `pve-cluster` will even start —
`pmxcfs` crash-loops with `Unable to resolve node name '$RETIRED' to a non-loopback IP
address` if this is skipped (hit this last time; don't leave it as an afterthought):
```bash
hostnamectl set-hostname $RETIRED

cat /etc/hosts   # check current content before editing
sed -i "s/<old-IP> <old-name>.local <old-name>/$RETIRED_IP $RETIRED.local $RETIRED/" /etc/hosts

sed -i "s/address <old-IP>\/24/address $RETIRED_IP\/24/" /etc/network/interfaces
```

**2c. Wipe every piece of local cluster state, not just `config.db`.** `pmxcfs` auto-restores
from its own backup snapshot if one exists, silently bringing back stale corosync config;
`/etc/corosync/corosync.conf` and `authkey` are separate plain files outside `config.db` and
will block `pvecm add` with "already exists" if left in place — this combination caused the
most trouble in the first run:
```bash
systemctl stop pve-cluster
rm -f /var/lib/pve-cluster/config.db
mv /var/lib/pve-cluster/backup/*.sql.gz /root/ 2>/dev/null   # clear the auto-restore source
mkdir -p /root/corosync-backup-$(date +%F)
mv /etc/corosync/corosync.conf /etc/corosync/authkey /root/corosync-backup-$(date +%F)/ 2>/dev/null
```

**2d. Apply the identity change.** A reboot is simplest but **stops every guest** — unlike a
sequence of individual `systemctl restart` calls, which can in principle keep guests running
throughout (LXC/VM processes don't depend on corosync/pve-cluster membership). Budget for
guest downtime if you reboot:
```bash
reboot
```

**2e. Once back up, confirm `pve-cluster` started clean before doing anything else:**
```bash
systemctl status pve-cluster --no-pager   # expect: active (running), no crash-loop
cat /etc/pve/corosync.conf 2>&1           # expect: No such file or directory — if it exists, repeat 2c
```

**2f. Re-establish SSH trust in both directions.** The box's own `~/.ssh/authorized_keys` is
normally symlinked to `/etc/pve/priv/authorized_keys`, which goes dark whenever `pve-cluster`
is down (this broke the harness's own access last time), and a hostname/IP change means both
sides need to re-accept each other's host keys:
```bash
# on $SURVIVOR:
ssh-keyscan -H $JOIN_IP >> ~/.ssh/known_hosts
# ensure $JOIN_IP's own pubkey is in this box's authorized_keys (needed for pvecm's internal ssh copy-id step)

# on $JOIN_IP:
ssh-keygen -R $RETIRED_IP   # clear the stale key it had cached for this IP under the old identity
ssh-keyscan -H $RETIRED_IP >> ~/.ssh/known_hosts
# ensure this box's own pubkey is in $JOIN_IP's authorized_keys too
```

**2g. Rejoin:**
```bash
pvecm add $JOIN_IP --use_ssh
# --use_ssh is required — plain `pvecm add` defaults to a password/API-based join and hangs
# on "EOF while reading password" even with working SSH key trust.
```

**2h. Check for and resolve the VMID/config collision before restoring anything.** `pvecm
delnode` does **not** delete the departing node's guest configs, and the cluster-wide
`/etc/pve/.vmlist` still claims these VMIDs belong to the *old* survivor name. Trying to `cp`
your Phase 2a backups straight into the new node dir fails with a confusing "File exists"
error for a file that doesn't appear to exist anywhere — the collision is at the VMID level,
not the file-path level:
```bash
find /etc/pve/nodes/ -name "*.conf" | grep -E "$(echo $VMIDS | tr ' ' '|')"
# if this finds configs under /etc/pve/nodes/<old-survivor-name>/lxc/, MOVE them into place —
# don't just restore from your Phase 2a backup and ignore the collision:
mkdir -p /etc/pve/nodes/$RETIRED/lxc
for id in $VMIDS; do mv /etc/pve/nodes/<old-survivor-name>/lxc/$id.conf /etc/pve/nodes/$RETIRED/lxc/$id.conf; done
```

If the old directory doesn't have them for some reason, fall back to your Phase 2a backups:
```bash
for id in $VMIDS; do cp /root/$id.conf.bak /etc/pve/nodes/$RETIRED/lxc/$id.conf; done
```

**2i. Remove the now-empty old node directory:**
```bash
find /etc/pve/nodes/<old-survivor-name>/ -type f
# expect only auto-generated metadata (pve-ssl.key/pem, lrm_status, ssh_known_hosts, empty
# lxc/openvz/priv/qemu-server dirs) — no other guest configs — before removing:
rm -rf /etc/pve/nodes/<old-survivor-name>
```

## Phase 3 — fix storage.cfg

Config lines are tab-indented, so `^...$`-anchored range-deletes silently run to EOF if the
end pattern never matches — this wiped an entire `storage.cfg` once already. Confirm
uniqueness first, and prefer line-number deletion over pattern ranges:
```bash
grep -n "nodes <old-survivor-name>" /etc/pve/storage.cfg   # expect exactly 1 hit
sed -i "s/nodes <old-survivor-name>/nodes $RETIRED/" /etc/pve/storage.cfg

grep -n "$STORAGE_DEAD\|vgname" /etc/pve/storage.cfg   # find the dead entry's exact line range
sed -n 'X,Yp' /etc/pve/storage.cfg   # confirm the exact boundary before deleting anything
sed -i 'X,Yd' /etc/pve/storage.cfg   # delete by LINE NUMBER, not by pattern range
```

**Also rename `$STORAGE_NEW`'s storage ID itself to match the new hostname number** (e.g.
`vm_storage05` → `vm_storage02`), not just its `nodes` line — the underlying `vgname`/`thinpool`
stay untouched, only the storage.cfg section header and every guest's `rootfs:`/`mp:` line
change. The ID is a label, not tied to physical storage, but it's embedded literally in each
guest's config so it must be updated everywhere it's referenced:
```bash
sed -i "s/lvmthin: $STORAGE_NEW/lvmthin: <new-storage-id>/" /etc/pve/storage.cfg
sed -i "s/rootfs: $STORAGE_NEW:/rootfs: <new-storage-id>:/" /etc/pve/nodes/$RETIRED/lxc/*.conf
```
If this is a retroactive fix for an *earlier* swap's survivor storage and its guests are
currently running, stop those guests first, edit both files, then start them back up — confirm
`pvesm status` shows the new ID `active` (not `disabled`) with the expected used-space total
before considering it done.

## Phase 4 — start guests and verify

```bash
for id in $VMIDS; do ssh root@$RETIRED_IP "pct start $id"; done

ssh root@$JOIN_IP 'pvecm status'                                      # expect: quorate, correct node count/names
ssh root@$RETIRED_IP 'hostname; pveversion; pct list; pvesm status'   # expect: $RETIRED, guests running, $STORAGE_NEW active
# exec into each guest to confirm IP, mounts, and services match pre-swap state
```

## Rollback

Nothing here is destructive to guest *data* — disks stay on `$SURVIVOR`'s own storage the
whole time. If anything in Phases 1-3 goes wrong, the guests' disks and your Phase 2a config
backups are untouched; worst case is retrying the rejoin/storage-fix steps, or restoring
`storage.cfg`/`authorized_keys` from the Phase 0 backups. The risk in this whole procedure is
entirely in cluster/storage *metadata*, never in guest data.

## Instance log

| Swap | Date | Notes |
|---|---|---|
| atlas04 → atlas01 | 2026-07-26 | Completed. All the caveats above came from this run. |
| atlas02 → atlas05 | 2026-07-26 | Completed. Old atlas02 hardware confirmed offline before Phase 2 (new precondition). atlas05 had no SSH/MCP shell access configured — bootstrapped manually via console. Storage IDs `vm_storage04`/`vm_storage05` renamed to `vm_storage01`/`vm_storage02` to match node numbers (not just the `nodes` line) — this expanded scope beyond the original Phase 3, folded into the steps above for next time. |

## Related

[[Wiki/Network/IP-Map]] | [[docs/Atlas03-Atlas04-Storage-GPU-Consolidation]]
