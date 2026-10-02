> **ARQUIVADO / HISTÓRICO.** Esta spec mistura decisões que foram substituídas. Para gameplay use [`2026-10-02-hybrid-live-kite-combat-design.md`](../../specs/2026-10-02-hybrid-live-kite-combat-design.md); para persistência/economia use [`2026-10-02-persistence-economy-design.md`](../../specs/2026-10-02-persistence-economy-design.md).

# Live Assisted Kite Combat — Design

> **SUPERSEDED EM PARTE EM 02/10/2026.** As seções de controle por comandos, seleção de alvo e `LiveCombatDirector` foram substituídas por [`2026-10-02-hybrid-live-kite-combat-design.md`](../../specs/2026-10-02-hybrid-live-kite-combat-design.md). As seções de economia por valor, identidade, persistência, avatar, ledger e marketplace continuam como referência de design.

Date: 2026-10-01
Status: partially superseded by 2026-10-02 hybrid combat architecture

## Goal

Transform the current TikTok kite game into a persistent live-controlled combat game that keeps the existing 40-kite stability, RopePhysics, contact/abrasion model and TikTok connection, while replacing scripted movement with physically plausible control.

The player controls their kite from TikTok chat during combat. Gifts grant temporary equipment/powers, contribute value toward higher tiers, and always trigger a physical combat maneuver rather than direct damage.

## Core principles

1. The flight path is produced by wind, orientation, velocity, spool length, slack and tension.
2. Chat controls the kite; gifts improve the temporary loadout and trigger physical maneuvers.
3. A gift never directly subtracts HP from another player.
4. Line damage only exists after geometric line contact and the abrasion model resolves wear.
5. Live assistance may create opportunities for combat, but never teleport a kite or invent a cut.
6. Persistent identity is keyed by TikTok userId, never by mutable @username.
7. Physics at 60 Hz never reads from SQLite or downloads avatars.
8. Existing proven mechanics remain unless explicitly migrated behind tests.

## Existing components to preserve

- TikTokEventNormalizer and current reconnect flow
- GiftCatalog and observed gift metadata
- LiveInputBuffer
- RopePhysics / XPBD line simulation
- LineContactManager / LineBroadPhase
- LineAbrasionModel and physical cut pipeline
- arena persistence/replay mechanisms during migration
## Gift economy: value-first resolution

Gift effects are resolved by total TikTok coin value, not primarily by gift name.

For a completed gift sequence:

`totalValue = unitCoinValue * repeatCount`

Examples:
- 1 Rose at 1 coin => value 1
- 3 Roses => value 3
- 10 Roses => value 10 and resolves at the same combat tier as any 10-coin gift
- 30 Roses => value 30 and resolves at the same combat tier as any 30-coin gift
- one 30-coin gift => value 30, identical combat entitlement to 30 Roses

Gift name/icon remains important for celebration and UI, but the combat entitlement comes from total value.

The resolver must consume the sequence once after repeatEnd/idempotency checks. It must never award both thirty 1-coin rewards and an additional 30-coin reward for the same value.

### Tier resolution

The gift table becomes a configurable value ladder rather than a hard-coded name ladder. The highest unlocked tier at or below totalValue determines the temporary equipment package. Total value can also determine duration within that tier.
### Duration and promotion semantics

A sequence is valued once. Reward value must not be duplicated while promoting tiers.

If totalValue remains below the next tier, additional value extends the current tier duration according to its configured rate.

When totalValue reaches a higher threshold, the temporary loadout is promoted to that tier. Its duration is calculated from the full totalValue using that tier's duration rule; the player does not also receive duplicated lower-tier time for the same coins.

Example behavior:
- value 1 => base cerol tier for its configured duration
- value 3 => same tier with proportionally more duration
- value 10 => promote to the configured 10-coin tier
- value 30 => promote to the configured 30-coin tier

The exact tier table is admin-configurable and can be changed without changing physics code.

### Every gift triggers physical action

Every resolved gift package grants its temporary loadout and schedules one combat maneuver.

The default maneuver is RETAO. RETAO is not direct damage and not a scripted X/Y path. It is a physical control sequence: release line -> orient/desbicar -> acquire useful heading -> pull hard -> let RopePhysics and kite dynamics produce the pass.

During the pass, the kite may cross several lines. Only lines that geometrically contact can receive abrasion. The gift affects friction/material/tension parameters; the contact model determines damage.

Higher tiers may later select other approved physical maneuvers, but all maneuvers must use the same control interface and never write opponent HP directly.
## Live chat control

The player can control the currently active kite from TikTok chat while combat continues.

Approved command families:
- puxar / puxa: reel in line and increase tension
- soltar / descarregar / dar linha: release line and reduce tension
- desbicar / despicar: apply angular intent; no direct Y translation
- tenteio: short pull-release control pattern
- skin / pipa / linha / loadout commands: change owned cosmetic/equipment selections when allowed

LiveInputBuffer remains the anti-spike boundary. It queues commands, rate-limits them and converts them into PlayerIntent/SpoolController input.

ChatControls must stop directly mutating kite x/y/vx/vy for normal maneuvers. It emits intent only.

A player command affects only that player's kite. Generic comments may still contribute low-power audience energy, but they cannot override explicit control commands.

## Flight and spool physics

The runtime state contains position, velocity, orientation, angular velocity, released line length, line slack and line tension.

Wind has temporal memory and smooth gust envelopes. Normal wind may drift and tilt a kite but does not repeatedly trigger desbico.

SpoolController is the authoritative boundary for pull/release rate. RopePhysics remains responsible for rope geometry and tension coupling.

KiteDynamics consumes forces and control intent; safety corridors are reduced to weak anti-collapse assistance rather than hard targets.
## Temporary equipment model

Gift-derived combat equipment is temporary. Persistent ownership is reserved for purchased/unlocked kites, skins, cosmetics and explicitly permanent items.

A temporary line package may define:
- frictionMultiplier
- abrasionResistance
- tensileStrength
- elasticity
- massPerMeter
- visual style
- duration policy

Named virtual materials such as cerol, chilena, acrylic/stone/crystal tiers are gameplay classes only. The project stores numerical simulation properties, not real-world manufacturing instructions.

Shield is a temporary consumable/defensive effect. It may absorb or reduce a valid combat consequence according to configuration, but it does not create permanent invulnerability.

When a higher-value package is activated while a lower one is active, the higher tier wins. Remaining value/time is reconciled by the value resolver; lower-tier and higher-tier rewards are never double-counted.

## Persistent player profile

Use TikTok userId as the stable external identity. uniqueId/@username and nickname are mutable profile attributes.

Persist:
- TikTok userId, uniqueId, nickname
- local avatar reference and source metadata
- owned kites and skins
- equipped persistent loadout
- lifetime/season progression
- gift ledger references and statistics

Runtime combat buffs remain in memory and arena snapshots; permanent ownership lives in the player repository.
## Persistence implementation boundary

The current runtime is Node 26, so the persistent repository will use built-in `node:sqlite`; no ORM/native add-on is required.

Database file: `backend/data/pipa-live.db` with WAL mode enabled.

Logical tables:
- users
- owned_kites
- owned_skins
- loadouts
- progression
- gift_ledger
- avatar_cache metadata

Database writes happen on TikTok/profile/economy events and controlled checkpoints, never inside the 60 Hz physics loop.

At spawn, LoadoutService builds an immutable runtime snapshot from persistent ownership plus active temporary buffs. The simulation reads that in-memory snapshot.

## Avatar cache

Profile pictures received from TikTok are cached locally by TikTok userId. The database stores local path, source URL, hash/version metadata and last refresh time.

A returning user uses the local avatar immediately. Refresh is asynchronous and only replaces the cached image after a successful validated download.

Avatar failure never blocks entry into the arena; the game falls back to the existing default visual.

## Gift ledger and idempotency

Every finalized gift sequence is recorded before granting persistent or temporary value. The ledger key uses stable event identifiers when available (room/message/gift/user plus sequence data), with a deterministic fallback for simulated/replay events.
The economy uses `unitCoinValue` and `totalCoinValue` as canonical internal units. External fields such as `diamondCount` are normalized by GiftValueResolver and are never treated as canonical economy values outside that boundary.

GiftValueResolver priority:
1. configured TikTok gift catalog price in coins
2. observed gift catalog value previously verified for that gift ID
3. trusted normalized event value when compatible with the catalog
4. no combat entitlement when value cannot be resolved safely

For a repeat sequence, only the finalized sequence is granted. `repeatEnd` and ledger idempotency prevent duplicate value during TikTok streak updates/reconnects.

A ledger transaction records unitCoinValue, repeatCount, totalCoinValue, resolvedTier, granted duration/effects and maneuver request.

## Market and permanent ownership

The market is value-based and configurable. It can expose temporary combat buffs, permanent kite/skin unlocks and custom-kite orders.

Temporary combat purchases expire by their duration policy. Permanent kite/skin purchases remain attached to the TikTok userId across future lives.

A custom-kite order creates a persistent owned-kite record associated with that user. Custom art/model creation is an administrative fulfillment workflow; combat physics uses an approved kite definition so custom visuals do not create unbounded pay-to-win parameters.

The player can use chat commands to inspect/equip owned skins and kites while the live continues. Equipment changes that would alter combat physics take effect only at safe boundaries defined by LoadoutService; cosmetic skin changes may be immediate if they do not recreate heavy physics state.
## Live Combat Director

LiveCombatDirector exists only to keep a TikTok live watchable. It may bias wind opportunity, target selection, maneuver timing and weak anti-collapse separation.

It may not teleport kites, write HP, manufacture contact, bypass RopePhysics or force a winner.

Target live pacing: combat opportunities should normally appear within a short watchable window, while preserving calm flight periods and avoiding constant forced contact.

## Runtime data flow

TikTok event -> normalizer -> identity/profile update -> command or gift path.

Command path: Chat parser -> LiveInputBuffer -> PlayerIntentController/SpoolController -> KiteDynamics/RopePhysics -> LineContact/Abrasion.

Gift path: GiftValueResolver -> GiftLedger transaction -> temporary buff/progression resolution -> LoadoutSnapshot update -> physical maneuver request -> same physics/contact pipeline.

Profile path: userId -> PlayerRepository -> AvatarCache/Inventory/Loadout -> in-memory spawn snapshot.

## Error handling

Unknown gift value: celebrate visually, record observation, grant no combat advantage until value is resolved.
Duplicate gift event: ledger rejects silently for economy purposes; no duplicate buff/purchase/manoeuvre.
Database unavailable: keep live combat running with existing in-memory state; do not invent persistent grants.
Avatar failure: use cached/default avatar and continue.
Invalid chat spam: rate-limit/drop through existing input buffer without affecting other players.
Physics overload: preserve gameplay correctness first; degrade visual FX only, as the current runtime profiler already does.
## Testing and acceptance

TDD is required for each migration step.

Economy tests:
- 30 x 1-coin gifts resolve exactly once to totalCoinValue 30
- one 30-coin gift resolves to the same temporary combat entitlement
- repeated TikTok streak updates do not duplicate value
- promotion does not also duplicate lower-tier rewards
- unknown/unresolved value grants no combat advantage

Control/physics tests:
- chat commands change spool/orientation intent, not direct x/y position
- no spontaneous repetitive desbico during stable wind
- pull/release/desbico sequence can produce a retão through physics
- retão never damages without geometric line contact
- friction/material tier changes abrasion only through LineAbrasionModel

Persistence tests:
- returning userId restores owned skin/kite/loadout and local avatar metadata
- username changes do not create a second player identity
- duplicate ledger transaction cannot create duplicate permanent ownership

Performance gates remain: 40 active kites, 60 Hz fixed physics, no naive all-segment all-pairs scan, no unbounded loops in checkHit/contact work, no database or network I/O in physics.

The existing real relinho browser benchmark remains a mandatory regression gate; new live-control/economy work must not regress collision/physics budgets materially.
## Implementation decomposition

This architecture is too broad for one safe implementation batch. It is decomposed into ordered subprojects that preserve a green build between checkpoints.

Phase A — Physical live control:
- Wind memory/gust model
- SpoolController
- chat commands converted from direct movement to intent
- physical desbico/pull/release/retao
- LiveCombatDirector safety assistance
- preserve 40-kite performance and current abrasion system

Phase B — Value-first gift resolver:
- unitCoinValue/totalCoinValue normalization
- value ladder/tier configuration
- repeatEnd + idempotent sequence resolution
- temporary buff promotion/duration semantics
- every resolved gift schedules physical RETAO by default

Phase C — Persistent player platform:
- node:sqlite repository
- users, progression, ownership, loadout, gift ledger
- avatar cache
- migration from current arena/session statistics where useful

Phase D — Market and customization:
- chat commands for inventory/loadout/skin
- permanent kite/skin purchases
- custom-kite order records and admin fulfillment
- live UI/celebration surfaces for tier, buff time and owned equipment

Each phase gets its own tests and commit. No phase may remove a working prior mechanic until its replacement is covered by tests and the relevant benchmark is green.
