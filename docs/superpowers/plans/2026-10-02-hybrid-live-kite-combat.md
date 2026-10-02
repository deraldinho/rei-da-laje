# Hybrid Live Kite Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved hybrid architecture with maximum reuse: wind creates normal PvP, comments create short physical gestures, gifts temporarily pilot maneuvers, and existing 3D line physics remains the only cut authority.

**Architecture:** Reuse `WindField`, `LiveInputBuffer`, `PlayerIntentController`, `ManeuverQueue`, `KiteDynamics`, `RopePhysics`, broad/narrow phase, abrasion and break systems. Replace only opponent-oriented orchestration: `LiveCombatDirector` becomes wind-only arena direction, arbitrary comments become bounded gesture envelopes, and gift maneuvers score spatial line-density corridors rather than players.

**Tech Stack:** JavaScript ESM/CommonJS, Node test runner, PixiJS, Three.js, Socket.IO, existing 60 Hz fixed-step physics.

**Spec:** `docs/superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`

## Global Constraints

- Preserve Tasks 1–7 physical work unless a failing regression proves a targeted correction is needed.
- Maximum code reuse; no second physics loop, no alternate movement engine, no new renderer authority.
- No normal target selection, opponent lock, pair steering or direct gift/comment damage.
- Contact/cut remains `LineBroadPhase -> 3D narrow phase -> LineContactManager -> abrasion/structural -> LineBreakSystem`.
- 40 active kites, 60 Hz fixed physics, `maxTracked <= 12`, `maxSolved <= 3`.
- No network/database work inside the fixed-step physics loop.
- New planners emit physical intent only: spool, debico torque, trim, tension assist and bounded duration.
## Review Focus

- Same physical load must produce lower structural `loadRatio` for stronger material; resistance must not scale the applied load itself.
- Wind transitions must remain coherent while different kite seeds avoid synchronized trajectories.
- Comment bursts must saturate/coalesce rather than enqueue unbounded physics work.
- Gift AI may miss in Z and then must produce zero wear despite a screen-space crossing.
- Planner/density failures must fail soft to ordinary wind-driven flight.

---

### Task 1: Structural-load correction and clean baseline

**Files:**
- Modify: `frontend/src/engine/physics/RopePhysics.js`
- Test: `tests/line-material-structural.test.cjs`
- Preserve: `tests/evidence/relinho-abrasion-benchmark.json` as evidence, not source behavior.

**Interfaces:** `RopePhysics.structuralLoad` is an applied physical-load estimate independent of `material.maxTension`; `evaluateStructuralLoad()` converts it to `loadRatio`.

- [ ] Run the already-written stronger-material tests and verify RED.
- [ ] Correct only the applied-load calculation in `RopePhysics`.
- [ ] Run structural tests, then `npm test`; commit the correction without benchmark evidence if the browser gate has not been rerun.

### Task 2: Replace pair steering with `SkyWindDirector`

**Files:**
- Create: `frontend/src/engine/physics/SkyWindDirector.js`
- Modify: `frontend/src/engine/Wind.js`, `frontend/src/engine/physics/KiteDynamics.js`, `frontend/src/engine/App.js`
- Remove production use of: `frontend/src/engine/physics/LiveCombatDirector.js`
- Test: `tests/sky-wind-director.test.cjs`, update arena pacing tests.

**Interfaces:** `SkyWindDirector.sample(time, baseWind, crowdEnergy=0) -> wind`; may alter only arena-level wind state and bounded turbulence, never read/select an opponent.

- [ ] RED: deterministic smooth phases, no opponent input, no coordinate mutation, crowd modulation bounded.
- [ ] Implement by wrapping/reusing `WindField`; keep per-kite individuality inside existing physics.
- [ ] Remove `computeLiveAssist` from `KiteDynamics`; retain only generic body/boundary safety already physical.
- [ ] GREEN focused + full suite; commit.
### Task 3: Arbitrary comments -> `CommentGestureEngine` + bounded `CrowdEnergy`

**Files:**
- Create: `frontend/src/engine/physics/CommentGestureEngine.js`, `frontend/src/engine/physics/CrowdEnergy.js`
- Modify: `frontend/src/engine/physics/LiveInputBuffer.js`, `frontend/src/engine/physics/PlayerIntentController.js`
- Test: `tests/comment-gesture-engine.test.cjs`, `tests/crowd-energy.test.cjs`, update live-input tests.

**Interfaces:** `CommentGestureEngine.createGesture({text,userId,kite,wind,lineDensity,engagement}) -> {spoolCommand,debicoTorque,trimPitch,tensionAssist,duration,intensity}`; `CrowdEnergy.accept(event)` and `step(dt)` return saturated `[0,1]`.

- [ ] RED: arbitrary useful text works; `1/2/3` are not required; deterministic seed, bounded intent/duration, spam coalescing and saturation.
- [ ] Reuse `LiveInputBuffer` queue/decay instead of adding another input queue.
- [ ] Add a generic intent-envelope path to `PlayerIntentController`; preserve legacy exact actions for admin/debug only.
- [ ] GREEN focused + full suite; commit.

### Task 4: Reusable coarse `LineDensityField`

**Files:**
- Create: `frontend/src/engine/physics/LineDensityField.js`
- Reuse rope nodes/AABBs from `RopePhysics`/broad-phase compatible state.
- Test: `tests/line-density-field.test.cjs`.

**Interfaces:** `LineDensityField.update(kites, nowMs)` reuses fixed cells at low cadence; `sample(x,y,z)` and `scoreCorridor(origin,heading,length)` return density only, never contact/damage.

- [ ] RED: denser cells/corridors score higher, Z separation matters, storage is bounded/reused, stale field is safe.
- [ ] Implement fixed grid/spatial accumulation without all-pairs work.
- [ ] GREEN focused + full suite; commit.

### Task 5: `GiftManeuverAI` using density corridors, not opponents

**Files:**
- Create: `frontend/src/engine/physics/GiftManeuverAI.js`
- Modify: `frontend/src/engine/Maneuvers.js`, `frontend/src/engine/physics/ManeuverQueue.js`, `frontend/src/engine/physics/PlayerIntentController.js`
- Test: `tests/gift-maneuver-ai.test.cjs`, update maneuver physical-contract tests.

**Interfaces:** `planGiftManeuver(kite,maneuver,wind,densityField) -> {steerDir,intensity,duration,profile}`; planner evaluates a small fixed heading set and never returns/accepts a player target.

- [ ] RED: retão prefers higher-density reachable corridor, ignores named opponents, can miss in Z, and emits only physical intent metadata.
- [ ] Remove production `maneuverTarget()`/closest-player behavior; reinterpret `perseguir` as following dense line flow.
- [ ] Reuse `ManeuverQueue` and `PlayerIntentController` action sequences.
- [ ] GREEN focused + full suite; commit.
### Task 6: Backend/frontend event integration without magic commands

**Files:**
- Modify: `backend/tiktokService.js`, `backend/rules/gameRules.js`, `frontend/src/engine/App.js`
- Modify: `frontend/src/entities/Kite.js` only for owning/reusing the new per-kite helpers if required.
- Test: backend chat-flow tests and `tests/hybrid-live-event-integration.test.cjs`.

**Interfaces:** backend emits a generic accepted-comment event containing normalized `userId`, `nickname`, and `text`; legacy `competition:chat_action` remains debug/admin compatibility only. App feeds generic comments into existing per-kite `LiveInputBuffer`, updates shared `CrowdEnergy`, updates `LineDensityField` at low cadence, and passes gift plans into the existing maneuver queue.

- [ ] RED: every accepted active-player comment is forwarded as text; exact `1/2/3` not required; no duplicate spawn/action side effect.
- [ ] Integrate shared `CrowdEnergy`, `SkyWindDirector`, `LineDensityField` in `GameApp` without a second physics clock.
- [ ] Keep failure paths soft: no density/gesture/planner result => ordinary wind physics continues.
- [ ] GREEN focused + full suite; commit.

### Task 7: End-to-end physics/performance verification

**Files:** tests/evidence only when fresh benchmark completes; production changes only through new RED tests.

- [ ] Run complete `npm test`.
- [ ] Run physical cut/voada/abrasion cycle tests.
- [ ] Run `npm run build`.
- [ ] Run real `npm run test:relinho-browser` with 40 kites; require no uncaught exceptions, `maxTracked <= 12`, `maxSolved <= 3`, no target/pair steering, and no budget relaxation.
- [ ] Add hybrid integration stress: wind-only crossings, arbitrary comment gesture, multi-line gift pass, and Z miss => zero wear.
- [ ] Commit fresh evidence and any test-driven corrections separately.

## Self-review result

Spec coverage: normal wind, comments, crowd, gift planning, density field, physics authority, fail-soft overload behavior and performance gates are all assigned. Shared interfaces all terminate at existing `PlayerIntentController`/`KiteDynamics` rather than introducing parallel control. Economy/persistence remains separate by spec and is not pulled into the 60 Hz hybrid-combat implementation.
