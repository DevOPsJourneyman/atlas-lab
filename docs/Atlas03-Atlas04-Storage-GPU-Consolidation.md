---
tags: [runbook, infra, migration]
type: runbook
status: completed
created: 2026-07-20
completed: 2026-07-20
---

# Atlas03 → Z440 Storage/GPU Consolidation

Consolidate atlas03 (NFS/ZFS storage) and atlas04 (Z440, Xeon + RTX 3090, Astro/VM100) onto one physical box — the Z440 chassis. atlas04's OS/GPU passthrough/VM100 survive untouched; only Atlaspool's 3 SSDs physically move over. atlas04 identity is retired; the surviving box is renamed to atlas03.

## End State

- 3-node cluster: atlas01, atlas02, atlas03
- atlas03 = physically the Z440 chassis (Xeon + RTX 3090), IP 192.168.0.12
- Astro/VM100 unaffected — same disk, same GPU passthrough config, same guest IP (192.168.0.25, independent of host IP)
- Original atlas03 chassis fully decommissioned (after a rollback window)
- atlas04 identity (192.168.0.13) retired from the cluster
- **Out of scope, deferred:** WD60EFAX 6TB HDD (not used here — if added later, give it its own pool, don't mix into Atlaspool, since Atlaspool is all-SSD and a lone SMR HDD vdev would put the whole pool's redundancy at risk). Jellyfin/CT304 rebuild (its rootfs was local, not on Atlaspool — not backed up as part of this migration).

## Hardware Reference

| Item | Model | Notes |
|------|-------|-------|
| Original atlas03 boot/root | Samsung MZVLB256HBHQ-000H1 NVMe, 256GB | Stays with decommissioned chassis, not moved |
| Atlaspool members (×3) | Samsung MZ7KM240HAGR-00005 SATA SSD, 223.6GB each | These physically move to the Z440 |
| atlas04 (Z440) boot drive | Samsung MZ7KM240HAGR-00005, 223.6GB | Same model as Atlaspool members — stays in place, hosts Astro's disk, untouched |
| Z440 SATA ports | 6 onboard (SATA0/1 + sSATA0–3, per HP service guide) | 1 used (own boot) + 3 incoming = 4 used, 2 free |
| Z440 M.2 | None onboard | Irrelevant to this plan — NVMe is not moving |

## Phase 0 — atlas03 (original), while still up

```bash
mkdir -p /Atlaspool/migration-backups
cp /etc/exports /Atlaspool/migration-backups/exports.atlas03.bak
zpool status Atlaspool        # confirm ONLINE, no degraded members, before touching anything
exportfs -ua
systemctl stop nfs-kernel-server
zpool export Atlaspool
shutdown -h now
```

## Phase 1 — from atlas01 (retire the original atlas03's cluster identity)

```bash
ssh root@192.168.0.10 'pvecm delnode atlas03'
```

## Phase 2 — physical

1. Power off atlas04 (Z440) — SATA bays aren't hot-swap
2. **Label the 3 Atlaspool SSDs before pulling them** — they're the same model/capacity as the Z440's own boot drive (see Hardware Reference above), easy to mix up once out of the chassis
3. Pull the 3 Atlaspool SSDs from the old atlas03 chassis, install into the Z440's free SATA bays (plain SATA, no adapter needed)
4. Old atlas03 chassis → set aside, **do not wipe the NVMe yet** (rollback fallback — see "Rollback window" below)
5. Power the Z440 back on — it boots as itself (atlas04, .13, still a cluster member, VM100 config untouched)

## Phase 3 — verify the pool BEFORE touching cluster identity

Fail fast on the actual unknown (did the data survive the move) before the harder-to-reverse identity change.

```bash
zpool import -f Atlaspool     # different machine than the one that created it — force needed (hostid mismatch)
zpool status -v Atlaspool     # confirm healthy, no degraded members
zpool scrub Atlaspool         # verify data integrity after the physical move — can run in background
```

If this fails or shows problems, stop here — the original atlas03 hardware is still intact as a fallback.

## Phase 4 — rename atlas04 → atlas03

Do this from console, not SSH — the IP change below will drop a remote session mid-sequence.

Note: atlas03 (original) is already delnoded (Phase 1), so once atlas04 is delnoded below the cluster is briefly down to 2 voting members (atlas01, atlas02) until the renamed box rejoins. No qdevice — both need to stay up for quorum during this window.

```bash
# on the box itself — grab the config backup FIRST, while /etc/pve (pmxcfs) is still mounted:
cp /etc/pve/qemu-server/100.conf /root/100.conf.bak   # safety net — about to wipe local cluster db

# on the box itself — stop local cluster services before removing from the cluster (standard order):
systemctl stop pve-cluster corosync

# from atlas01 — now safe to delnode, since atlas04's own corosync is already down:
ssh root@192.168.0.10 'pvecm delnode atlas04'

# back on the box itself:
hostnamectl set-hostname atlas03
# update /etc/hosts and vmbr0 static IP -> 192.168.0.12, then:
systemctl restart networking      # <-- SSH session on the old IP drops here
rm /var/lib/pve-cluster/config.db
systemctl restart pve-cluster
pvecm add 192.168.0.10             # rejoins fresh as "atlas03"
mkdir -p /etc/pve/nodes/atlas03/qemu-server
cp /root/100.conf.bak /etc/pve/nodes/atlas03/qemu-server/100.conf
```

Note: VM100/Astro keeps running the whole time — it's a local qemu process, unaffected by corosync/pve-cluster membership changes.

## Phase 5 — NFS (fresh install — this box never ran NFS before)

atlas04's OS was never the storage node; `nfs-kernel-server` likely isn't installed.

```bash
apt install -y nfs-kernel-server
cp /Atlaspool/migration-backups/exports.atlas03.bak /etc/exports   # review/edit paths before applying
exportfs -ra
systemctl enable --now nfs-kernel-server
```

## Phase 6 — verify

```bash
qm start 100                              # if not already running
qm guest exec 100 -- nvidia-smi           # GPU passthrough untouched, should just work
ssh root@192.168.0.10 'pvecm status'      # expect atlas01, atlas02, atlas03 only
ssh root@192.168.0.10 'df -h | grep Atlaspool'
ssh root@192.168.0.11 'df -h | grep Atlaspool'
```

## Rollback window

Don't wipe the original atlas03's NVMe or scrap that chassis until the new atlas03 has run stable for a few days. It's the only fallback if pool import, GPU passthrough, or the cluster rejoin goes wrong.

## Post-completion finding (2026-07-26) — storage.cfg was missed

Discovered 6 days later, the hard way: VM100 was stopped (unrelated reason) and then **could not
start**, failing with `storage 'local-lvm' is not available on node 'atlas03'`.

Root cause: `/etc/pve/storage.cfg`'s `local-lvm` entry (`thinpool data`, `vgname pve` — the correct,
default-named local thin pool that's physically on this box) still had `nodes atlas04` from before
the Phase 4 rename. Since Proxmox storage entries are scoped by the `nodes` line, and the box is now
named `atlas03`, this entry was invisible on it — even though the underlying LVM thin pool and
`vm-100-disk-0` were fully intact on disk the whole time (verified via `pvs`/`vgs`/`lvs`, not a data
issue). Confusingly, a *different*, newly-added node also happens to be named `atlas04` (a new M920q,
192.168.0.16) — so `atlas04`-scoped entries didn't look obviously wrong at a glance.

Fixed by changing that one entry's `nodes atlas04` → `nodes atlas03` (backed up first to
`/root/storage.cfg.bak-2026-07-26` on the box). No other `storage.cfg` entries were affected — this
node's `vm_storage04` entry legitimately belongs to the real atlas04 M920q, not this box.

**Lesson for the next node identity change (atlas02 retirement → atlas05 taking over, completed
2026-07-26, see [[docs/Proxmox-Node-Identity-Swap-Runbook]]):** Phase 4's rename
steps change hostname, IP, and cluster membership, but nothing there touches `storage.cfg`. Any
locally-scoped storage entry (`nodes <old-name>`) defined *on* a box being renamed will silently go
dark under the new name and only surface when something tries to start on that storage — which can
be days later. **Add a step to Phase 4: grep `/etc/pve/storage.cfg` for the old node name and update
any `nodes` line that refers to the box itself.**

## Post-migration follow-ups (not blocking, do once stable)

- Audit for hardcoded `192.168.0.13` / `atlas04` references in other automation (proxmox-mcp node targeting, Santiago's infra skills, n8n workflows). Astro's own guest IP (192.168.0.25) is untouched by this migration and needs no changes — only host/API-level references to .13 matter.
- Confirm Ramon's and Santiago's live `config.yaml` (`pct exec <vmid> -- cat /opt/<agent>/config.yaml`) don't reference `.13` anywhere — not verified during planning (proxmox MCP wasn't connected to the planning session yet).
- Update [[Wiki/Network/IP-Map]] and CLAUDE.md to reflect the 3-node cluster and atlas03's new hardware.
- Expect a "REMOTE HOST IDENTIFICATION HAS CHANGED" SSH warning for 192.168.0.12 afterward — different physical hardware now answers that IP/hostname. Clear the old atlas03 entry from `known_hosts` on Kronos and anywhere else that connects to it.
- `mcp-proxmox` (CT301/atlas-mcp, `http://192.168.0.30:3003/mcp`) was added to the Kronos CC session's MCP config on 2026-07-20 — use it for the above once available (takes effect on next session start).

## Related

[[Wiki/Network/IP-Map]] | [[Wiki/Infra/atlas-mcp]] | [[Wiki/Runbooks/TrueNAS-to-PVE-Migration]]
