# Persistence + Economy Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist TikTok identity, avatar cache, gift idempotency, progression, ownership, loadout and custom-kite orders without coupling SQLite to the 60 Hz physics loop.

**Architecture:** Node 26 built-in `node:sqlite` owns a local WAL database behind focused repository/services. TikTok/profile/gift event boundaries update persistence; spawn creates an in-memory persistent snapshot that gameplay consumes. Temporary combat remains in existing BuffManager/physics, while permanent grants are transactionally tied to the gift ledger.

**Tech Stack:** Node.js 26 CommonJS, `node:sqlite` DatabaseSync, existing Express/Socket.IO, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-02-persistence-economy-design.md`

## Global Constraints

- Database path defaults to `backend/data/pipa-live.db`; tests use temp DB files or `:memory:`.
- Enable SQLite WAL, foreign keys and bounded busy timeout.
- Stable identity key is TikTok `userId`; mutable `uniqueId`/nickname never create a second account.
- No SQLite access, fetch or marketplace resolution from the 60 Hz physics loop.
- Duplicate gift events cannot duplicate buff, maneuver, progression, ownership or custom order.
- Persistent grants commit in the same transaction as the accepted gift-ledger row.
- Database/cache failure must not stop arena flight, but may not fabricate permanent ownership.
- Avatar downloads are HTTPS-only, bounded, validated by MIME and stored under safe hashed filenames.
- Marketplace pricing is configuration-driven; no unapproved hard-coded custom-kite price.

## Review Focus

- Rename/restart: same `userId` keeps one row and returns the newest display identity.
- Reconnect/replay: same gift `messageId` is accepted once even after process restart.
- Missing gift identity: simulator/transient gifts keep temporary gameplay but cannot invent permanent grants.
- Avatar failure/oversize/invalid MIME: spawn remains usable with safe fallback.
- SQLite error during a permanent grant: ledger + ownership/progression roll back together.

---
### Task 1: SQLite schema and stable player repository

**Files:**
- Create: `backend/persistence/database.js`
- Create: `backend/persistence/playerRepository.js`
- Test: `tests/player-persistence.test.cjs`

**Interfaces:**
- `openPipaDatabase(filename) -> DatabaseSync`
- `new PlayerRepository(db)`
- `upsertProfile({userId,uniqueId,nickname,profilePictureUrl,seenAt}) -> profile`
- `getProfile(userId) -> profile|null`
- `getPersistentSnapshot(userId) -> snapshot|null`

- [ ] Write RED tests for first insert, rename-by-same-userId, reopen persistence and WAL/schema creation.
- [ ] Run `node --test tests/player-persistence.test.cjs` and confirm failures are missing modules/interfaces.
- [ ] Implement schema version 1 with `users`, `avatar_cache`, `owned_kites`, `owned_skins`, `loadouts`, `progression`, `gift_ledger`, `custom_kite_orders`.
- [ ] Implement `PlayerRepository` with bounded strings and stable `userId` upsert.
- [ ] Re-run focused tests; expected PASS.
- [ ] Commit `feat(persistence): add sqlite player repository`.

### Task 2: Transactional idempotent gift ledger

**Files:**
- Create: `backend/persistence/giftLedger.js`
- Test: `tests/gift-ledger-persistence.test.cjs`

**Interfaces:**
- `buildGiftEventKey(gift) -> string|null`
- `new GiftLedger(db)`
- `claim(entry, persistentGrant?) -> {accepted,duplicate,persistent,ledgerId}`

- [ ] Write RED tests for duplicate `roomId+messageId`, restart dedupe, distinct message acceptance and transaction rollback.
- [ ] Add repeat-sequence test proving the finalized event is stored once with `unitCoinValue` and `totalCoinValue`.
- [ ] Implement `BEGIN IMMEDIATE` transaction, unique event key and rollback-on-grant-failure semantics.
- [ ] Treat events without a stable message identity as transient: no permanent grant fabrication.
- [ ] Re-run tests; expected PASS.
- [ ] Commit `feat(persistence): make gift grants idempotent`.

### Task 3: Progression, ownership and persistent loadout

**Files:**
- Create: `backend/persistence/playerInventory.js`
- Test: `tests/player-inventory-persistence.test.cjs`

**Interfaces:**
- `new PlayerInventory(db)`
- `addProgress(userId,{coinValue,giftPoints},dbOverride?)`
- `grantKite(userId,kiteKey,metadata,dbOverride?)`
- `grantSkin(userId,skinKey,metadata,dbOverride?)`
- `equip(userId,{kiteKey,skinKey},dbOverride?)`
- `snapshot(userId) -> {progression,ownedKites,ownedSkins,loadout}`

- [ ] Write RED tests for persistence across reopen, idempotent ownership and rejecting equip of unowned items.
- [ ] Add rollback test using the GiftLedger transaction callback.
- [ ] Implement prepared statements; no DB queries from frontend/physics code.
- [ ] Re-run tests; expected PASS.
- [ ] Commit `feat(persistence): add inventory and loadout ownership`.

### Task 4: Safe avatar cache

**Files:**
- Create: `backend/persistence/avatarCache.js`
- Modify: `backend/server.js`
- Modify: `frontend/src/entities/Kite.js`
- Modify: `frontend/src/entities/RooftopPlayer.js` if its loader rejects local URLs
- Test: `tests/avatar-cache.test.cjs`

**Interfaces:**
- `new AvatarCache({db,rootDir,fetchImpl,maxBytes})`
- `cachedUrl(userId) -> string|null`
- `refresh({userId,remoteUrl}) -> Promise<{cached,url}|null>`

- [ ] Write RED tests for HTTPS validation, MIME/size limits, hashed filenames and cache reuse after restart.
- [ ] Implement bounded streaming/buffer download and metadata upsert; failures return null without blocking arena entry.
- [ ] Serve only the cache directory under `/player-assets/avatars` and allow that same-origin relative path in avatar loaders.
- [ ] Re-run focused tests and frontend unit suite; expected PASS.
- [ ] Commit `feat(persistence): cache player avatars locally`.

### Task 5: Marketplace grants and custom-kite workflow

**Files:**
- Create: `backend/persistence/marketplaceService.js`
- Modify: `backend/server.js`
- Test: `tests/marketplace-persistence.test.cjs`

**Interfaces:**
- `new MarketplaceService({db,inventory,customKiteMinCoins})`
- `applyGiftEntitlements({userId,totalCoinValue,ledgerId},dbOverride?) -> grants[]`
- `listCustomKiteOrders(userId?) -> order[]`
- `approveCustomKiteOrder(orderId,{kiteKey,name,assetPath}) -> ownedKite`

- [ ] Write RED tests with injected pricing proving no rule means no custom order, configured threshold creates one order, duplicate ledger cannot create another, and approval grants persistent ownership.
- [ ] Implement custom-kite threshold from explicit configuration/env only; do not invent a runtime default price.
- [ ] Add local-control admin endpoints for listing/approving pending custom-kite orders.
- [ ] Re-run focused tests; expected PASS.
- [ ] Commit `feat(economy): add persistent custom kite orders`.

### Task 6: TikTok/runtime integration and spawn snapshot

**Files:**
- Create: `backend/persistence/playerPlatform.js`
- Modify: `backend/tiktokService.js`
- Modify: `backend/playerSpawnPayload.js`
- Modify: `backend/server.js`
- Test: `tests/player-platform-integration.test.cjs`
- Update: `tests/browser-smoke.mjs`

**Interfaces:**
- `new PlayerPlatform({db,repository,ledger,inventory,avatarCache,marketplace})`
- `observeProfile(profile) -> persistentSnapshot`
- `resolveGift(gift,resolution,applyTemporary) -> {accepted,duplicate,persistent}`
- `spawnSnapshot(userId) -> snapshot|null`

- [ ] Write RED integration tests proving profile rename survives restart, duplicate gift cannot reapply buff/maneuver, progression is recorded once and spawn receives equipped persistent kite/avatar.
- [ ] Wire profile observation at chat/follow/gift boundaries; avatar refresh stays async and outside physics.
- [ ] Wire gift ledger before temporary buff/maneuver and permanent grant; transient simulator events remain playable but cannot create permanent grants.
- [ ] Extend `playerSpawnPayload` compatibly so persistence can override `kiteType`/skin/avatar without changing temporary buff authority.
- [ ] Instantiate platform in `server.js`; arena REST payload uses the same persistent spawn snapshot path.
- [ ] Run `npm test`, `npm run test:browser`, `npm run build` and `npm run test:relinho-browser`.
- [ ] Commit `feat(persistence): integrate persistent player platform`.
