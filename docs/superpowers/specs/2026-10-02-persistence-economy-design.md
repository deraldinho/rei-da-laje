# Persistence and Economy — Design Specification

Date: 2026-10-02
Status: active companion specification
Scope: persistent identity, avatar cache, gift value, inventory, ownership and marketplace

## 1. Boundary

This specification is deliberately separate from kite physics.

The 60 Hz simulation never reads SQLite, downloads avatars or resolves TikTok prices. At spawn/event boundaries, backend services create an in-memory snapshot consumed by gameplay.

Physics authority remains defined by `2026-10-02-hybrid-live-kite-combat-design.md`.

## 2. Identity

TikTok `userId` is the stable external key. `uniqueId/@username` and nickname are mutable attributes and must never create a second account when they change.

Persist at minimum:

- TikTok userId;
- current uniqueId/nickname;
- avatar cache metadata;
- owned kites/skins;
- equipped persistent loadout;
- progression/statistics;
- gift ledger references.
## 3. Storage

Runtime target is Node 26 with built-in `node:sqlite` and WAL mode.

Database path: `backend/data/pipa-live.db`.

Logical tables:

- users;
- avatar_cache;
- owned_kites;
- owned_skins;
- loadouts;
- progression;
- gift_ledger;
- custom_kite_orders.

Database failure must not stop the live. Temporary combat can continue in memory, but persistent grants must not be invented when a transaction cannot be recorded safely.

## 4. Avatar cache

Profile images are cached by stable userId using bounded, validated downloads. A returning user can use the local copy immediately while refresh occurs asynchronously.

Avatar failure falls back to the default visual and never blocks arena entry.
## 5. Gift value and idempotency

Canonical internal units are `unitCoinValue` and `totalCoinValue`.

`totalCoinValue = unitCoinValue * repeatCount`

The resolver must prefer verified catalog value and finalize TikTok repeat sequences exactly once. Reconnect/replay cannot duplicate entitlement.

A gift-ledger record stores enough identity to reject duplicates and records resolved value, tier, duration/effect and maneuver request.

Equivalent total coin value should grant equivalent combat entitlement unless an explicit promotion rule says otherwise.

Promotion consumes the sequence once. The same value cannot grant all lower tiers plus an additional promoted tier.

## 6. Temporary versus permanent

Temporary:

- combat material/buff duration;
- shields/consumables;
- GiftManeuverAI entitlement.

Permanent:

- owned skins;
- approved kite models;
- cosmetics;
- progression;
- personalized-kite ownership.
## 7. Marketplace/loadout

The marketplace is configuration-driven and cannot encode physics formulas or arbitrary pay-to-win parameters. It grants approved entitlements; the physical layer maps those entitlements to bounded gameplay profiles.

Cosmetic changes may apply immediately if they do not recreate heavy physics state. Physics-affecting loadout changes apply only at safe boundaries.

Custom-kite art/model fulfillment is an administrative workflow. Ownership persists by userId across future lives.

## 8. Tests

Required tests include:

- user rename keeps the same identity;
- cached avatar is reused after restart;
- duplicate gift event grants once;
- cumulative repeat updates grant only the final delta/sequence once;
- 30 one-coin gifts resolve to the same configured tier as one 30-coin gift;
- promotion never duplicates lower-tier value;
- database failure does not fabricate ownership;
- spawn snapshot contains equipped persistent items without any database access from the physics loop.

## 9. Relationship to gameplay

Economy resolves entitlement. `GiftManeuverAI` and the physical stack execute it. Only real 3D line contact can create abrasion/cut.
