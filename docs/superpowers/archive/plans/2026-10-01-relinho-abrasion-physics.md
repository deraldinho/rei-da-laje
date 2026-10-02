> **ARQUIVADO / HISTÓRICO.** Este plano/spec registra trabalho anterior. Consulte [`docs/README.md`](../../../README.md) e a spec vigente em [`2026-10-02-hybrid-live-kite-combat-design.md`](../../specs/2026-10-02-hybrid-live-kite-combat-design.md).

# Relinho Abrasion Physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace collision-to-damage relinho behavior with persistent sliding abrasion and localized physical rupture while preserving 40-kite stability, canonical backend cuts, TikTok maneuvers and post-cut 3D physics.

**Architecture:** Keep the 60 Hz XPBD rope simulation and canonical cut flow. Add bounded sweep-and-prune discovery, persistent pooled `LineContact` state, pure contact kinematics, configurable abrasion integration and localized break evaluation; `GameApp` only bridges simulation results to FX/audio/socket actions.

**Tech Stack:** JavaScript ESM/CommonJS, Node test runner, PixiJS 7, Three.js r186, Socket.IO, Vite.

**Spec:** `docs/superpowers/specs/2026-10-01-relinho-abrasion-physics-design.md`

## Global Constraints

- Keep `PhysicsClock` authoritative at `1/60` seconds; render FPS must not change abrasion.
- New-contact discovery runs at 30 Hz; accepted/tracked contacts revalidate at 60 Hz.
- Default global solved-contact budget is 3; default per-rope solved-contact budget is 3.
- Track at most 12 persistent contacts and perform at most 96 new-contact narrow checks per discovery scan.
- Preserve `RopePhysics`, canonical `relinho:cut` / `game:cut_occurred`, `FallingKite`, `FlyawayKite`, `BrokenHandRope`, gifts and maneuvers.
- No new production dependency, no renderer rewrite, no forced-kill timer and no direct skill damage.
- Do not reset or discard unrelated dirty-tree work; stage only files/hunks owned by each task.

## Review Focus

- Explicit `vSlide = 0` must remain zero; no fallback may manufacture abrasion from kite speed or contact age.
- A contact that disappears and reappears inside release grace may reuse its object, but continuous `contactTime` must restart rather than accumulate through separation.
- One rope participating in multiple contacts must respect the per-rope solve cap and must not receive duplicate wear from the same pair in one fixed tick.
- Simultaneous rupture, shield absorption and backend cut rejection must never remove a kite locally before canonical confirmation.
- Missing/partial/out-of-range settings must sanitize to safe defaults and must not make the physics NaN, negative or unbounded.

---

## File Structure

**New physics modules**
- `frontend/src/engine/physics/RelinhoPhysicsConfig.js` — validated frontend tuning object.
- `frontend/src/engine/physics/LineBroadPhase.js` — allocation-light sweep-and-prune pair discovery.
- `frontend/src/engine/physics/LineContactManager.js` — pooled persistent contacts, release grace, scoring and fair solve selection.
- `frontend/src/engine/physics/LineContactPhysics.js` — pure kinematics/tension/normal-force calculations.
- `frontend/src/engine/physics/LineAbrasionModel.js` — sliding-distance and abrasion integration.
- `frontend/src/engine/physics/LineBreakSystem.js` — localized wear, HP projection and deterministic rupture result.
- `frontend/src/engine/physics/LineContactSystem.js` — fixed-step orchestration with bounded discovery/narrow-phase work.
- `frontend/src/ui/LineContactDebugOverlay.js` — optional read-only debug DOM surface.

**Existing integration points**
- `frontend/src/engine/App.js`, `Physics.js`, `RelinhoMechanics.js`.
- `frontend/src/engine/physics/RopeCollision.js`, `RopePhysics.js`, `RelinhoContactSolver.js`, `LineMaterial.js`, `KiteDynamics.js`.
- `frontend/src/engine/Maneuvers.js`, `backend/settingsManager.js`.

### Task 1: Central physics configuration and material cut resistance

**Files:**
- Create: `frontend/src/engine/physics/RelinhoPhysicsConfig.js`
- Modify: `frontend/src/engine/physics/LineMaterial.js`
- Modify: `backend/settingsManager.js`
- Modify: `frontend/src/engine/App.js` (`applySettings` only)
- Test: `tests/relinho-physics-config.test.cjs`
- Test: `tests/admin-settings.test.cjs`

**Interfaces:**
- Produces `DEFAULT_RELINHO_PHYSICS_CONFIG`, `sanitizeRelinhoPhysicsConfig(input, base?)`.
- `GameApp.relinhoPhysicsConfig` stores the sanitized object and later feeds `LineContactSystem.setConfig(config)`.
- `getLineMaterial(type)` additionally returns `cutResistance`.

- [ ] **Step 1: Write failing configuration/material tests** asserting exact defaults: `abrasionK=0.04`, `frictionMultiplier=1.0`, `minSlideSpeed=0.75`, `tensionMultiplier=1`, `angleExponent=1`, `minContactTime=0.08`, `engagementRampSec=0.20`, `releaseGraceSec=0.22`, `maxWearPerTick=0.012`, `discoveryHz=30`, `maxSolvedContacts=3`, `maxContactsPerRope=3`, `maxTrackedContacts=12`, `maxDiscoveryChecksPerScan=96`; assert invalid/partial values sanitize safely and every line material has positive `cutResistance`.
- [ ] **Step 2: Run** `node --test tests/relinho-physics-config.test.cjs tests/admin-settings.test.cjs` and verify RED for missing config/cut resistance.
- [ ] **Step 3: Implement config and settings sanitization.** Backend accepts a nested `relinhoPhysics` object and broadcasts it through existing settings sync; frontend defensively sanitizes it again. Add `cutResistance`: algodão `1.00`, cerol `1.10`, chile `1.45`, kevlar `2.20`, tornado `1.65`, mestre_do_ceu `2.40`.
- [ ] **Step 4: Run the two tests** and verify GREEN, including the Review Focus case for missing/NaN/negative settings.
- [ ] **Step 5: Commit** only Task 1 files with `feat: add configurable relinho abrasion physics`.

### Task 2: Sweep-and-prune broad phase with bounded discovery

**Files:**
- Create: `frontend/src/engine/physics/LineBroadPhase.js`
- Test: `tests/line-broad-phase.test.cjs`

**Interfaces:**
- `new LineBroadPhase(config)` owns reusable entry/candidate buffers and counters.
- `scan(kites, contactRadius = 0) -> Array<{ pairKey, kiteA, kiteB }>` returns a reused array valid until the next `scan`.
- `metrics()` returns `{ inputLines, candidatePairs, rejectedX, rejectedY }` without exposing mutable internal buffers.

- [ ] **Step 1: Write failing tests** for two separated ropes => 0 candidates, two overlapping AABBs => 1 candidate, spawn-protected/ascending/pending-cut entries excluded, and 40 distributed ropes producing far fewer than 780 candidates.
- [ ] **Step 2: Add an identity/reuse assertion** showing consecutive scans reuse candidate objects/buffers rather than allocate a fresh graph every tick.
- [ ] **Step 3: Run** `node --test tests/line-broad-phase.test.cjs` and verify RED because `LineBroadPhase` does not exist.
- [ ] **Step 4: Implement sweep-and-prune** using already-maintained `rope.getAABB()`: sort reusable entries by `minX`, stop at `maxX + contactRadius`, then Y-overlap check. Do not call `RopeCollision` here.
- [ ] **Step 5: Run the focused test** and verify GREEN.
- [ ] **Step 6: Commit** `frontend/src/engine/physics/LineBroadPhase.js` and its test as `perf: add bounded rope broad phase`.

### Task 3: Reusable contact kinematics from `RopeCollision`

**Files:**
- Modify: `frontend/src/engine/physics/RopeCollision.js`
- Test: `tests/rope-contact-kinematics.test.cjs`
- Regression: `tests/rope-collision-p2.test.cjs`, `tests/rope-collision-enhanced-p7.test.cjs`

**Interfaces:**
- Extend `RopeCollision.checkRopeCollision(ropeA, ropeB, thicknessMultiplier, options, out?)` so an optional `out` object is filled and returned.
- Successful hit additionally exposes `tangentAx/Ay`, `tangentBx/By`, `velocityAx/Ay`, `velocityBx/By`, `relativeVx/Vy`, signed `slideA/slideB`, `relativeSpeed`, `slidingSpeed`, `sinAngle`, `s/t`, segment indices and contact point.

- [ ] **Step 1: Write failing tests** for crossed moving ropes, crossed ropes whose local points move together (`relativeVx=relativeVy=slidingSpeed=0`), and reuse of the caller-provided `out` object across repeated calls.
- [ ] **Step 2: Run** `node --test tests/rope-contact-kinematics.test.cjs tests/rope-collision-p2.test.cjs tests/rope-collision-enhanced-p7.test.cjs` and verify only the new contract is RED.
- [ ] **Step 3: Implement local tangent and interpolated node velocity calculation** in `_finalizeContact`; compute `slideA = vRel·tangentA`, `slideB = vRel·tangentB`, and `slidingSpeed = 0.5*(abs(slideA)+abs(slideB))`. Explicit zero must remain zero.
- [ ] **Step 4: Reuse result/scratch storage** when `out` is supplied; keep legacy call signature behavior when omitted.
- [ ] **Step 5: Run the three test files** and verify GREEN, especially the Review Focus zero-slide case.
- [ ] **Step 6: Commit** as `refactor: expose reusable rope contact kinematics`.

### Task 4: Persistent pooled contacts and fair solve selection

**Files:**
- Create: `frontend/src/engine/physics/LineContactManager.js`
- Test: `tests/line-contact-manager.test.cjs`

**Interfaces:**
- `new LineContactManager(config)` preallocates `maxTrackedContacts` mutable contact objects.
- `beginStep(nowMs, dtSeconds)`, `touch(pairKey, kiteA, kiteB, hit, physics) -> LineContact`, `endStep(nowMs)`, `selectForSolve(out?) -> LineContact[]`, `snapshot(limit=8) -> plain debug data`, `setConfig(config)`.
- Public `contacts` is the manager-owned `Map`, used by `GameApp.relinhoContacts` for compatibility.

- [ ] **Step 1: Write failing persistence tests** proving the same active pair mutates the same object, accumulates `contactTime`/`slidingDistance`, enters `RELEASE` when unseen and returns to pool after `releaseGraceSec`.
- [ ] **Step 2: Add the Review Focus re-contact test:** re-contact inside grace reuses the object but resets continuous `contactTime` instead of counting separated time.
- [ ] **Step 3: Add fairness/bounds tests:** at most 12 tracked contacts, at most 3 selected globally, at most 3 selected per rope, and a high-slide/high-normal-force pair displaces a sterile zero-slide pair despite active-contact hysteresis. Equal scores rotate over repeated selections.
- [ ] **Step 4: Run** `node --test tests/line-contact-manager.test.cjs` and verify RED.
- [ ] **Step 5: Implement the contact pool, in-place mutation, release lifecycle and score.** Score inputs are overlap quality, `vSlide`, normal force and age; hysteresis is a small bounded bonus, never permanent priority.
- [ ] **Step 6: Run the focused test** and verify GREEN with no growth beyond the pool.
- [ ] **Step 7: Commit** as `feat: add persistent fair line contacts`.

### Task 5: Physical contact, abrasion integration and localized rupture

**Files:**
- Create: `frontend/src/engine/physics/LineContactPhysics.js`
- Create: `frontend/src/engine/physics/LineAbrasionModel.js`
- Create: `frontend/src/engine/physics/LineBreakSystem.js`
- Modify: `frontend/src/engine/physics/RopePhysics.js`
- Test: `tests/line-abrasion-model.test.cjs`
- Test: `tests/line-break-system.test.cjs`

**Interfaces:**
- `computeLineContactPhysics(kiteA, kiteB, hit, config, out?) -> metrics` fills tension, angle influence, normal force, local slide and relative velocity without mutation.
- `integrateLineAbrasion(contact, kiteA, kiteB, dtSeconds, config) -> contact` mutates `slidingDistance`, `abrasionA/B`, `abrasionRateA/B`, `wearDeltaA/B`.
- `applyLineWearAndEvaluateBreak(contact, kiteA, kiteB, config) -> null | breakResult` writes localized segment wear, projects structural integrity to HP, and returns deterministic winner/loser plus exact segment/t coordinate only at rupture.

- [ ] **Step 1: Write required physics tests 1–7**: separated/parallel => zero; crossed but zero slide => approximately zero; high slide => positive; higher `vSlide` => higher rate; higher tension => higher bounded rate; short contact cannot break; prolonged sliding eventually breaks.
- [ ] **Step 2: Add asymmetry test** where changing material abrasiveness/resistance and signed local slide changes `abrasionA` and `abrasionB` without a fixed “moving line always wins” rule.
- [ ] **Step 3: Add exact-location tests** proving wear lands on the reported segment only and `breakResult.segmentIndex/segmentT` match the contact `s/t` for the line that broke.
- [ ] **Step 4: Run** `node --test tests/line-abrasion-model.test.cjs tests/line-break-system.test.cjs` and verify RED.
- [ ] **Step 5: Implement contact physics** with `effectiveTension = 0.5*(tensionA+tensionB)*tensionMultiplier`, `angleInfluence = pow(clamp(sinAngle,0,1), angleExponent)`, and `normalForce = effectiveTension*angleInfluence`.
- [ ] **Step 6: Implement abrasion** using `baseRate = abrasionK * frictionMultiplier * friction * normalForce * max(0, vSlide-minSlideSpeed)`, a contact engagement ramp after `minContactTime`, bounded directional exposure, material abrasiveness/resistance, and `maxWearPerTick`.
- [ ] **Step 7: Implement localized wear/break evaluation.** Convert abrasion to normalized wear using each material `cutResistance`; HP is `maxLineHP * weakestSegmentIntegrity`. If both lines reach rupture in the same fixed step, compare incoming normalized wear rate; if still tied, reuse the existing contact-position tie rule; if still exactly tied, resolve by stable lexical `userId` order. No `takeDamage()` is called because a contact exists.
- [ ] **Step 8: Run focused tests** and verify GREEN, including exact zero-slide and no-instant-cut behavior.
- [ ] **Step 9: Commit** as `feat: model sliding abrasion and localized line breaks`.

### Task 6: Bounded fixed-step contact system and `GameApp` integration

**Files:**
- Create: `frontend/src/engine/physics/LineContactSystem.js`
- Modify: `frontend/src/engine/App.js` (`constructor`, `gameLoop`, `checkRelinhos`, reset/settings paths)
- Modify: `frontend/src/engine/Physics.js`
- Modify: `frontend/src/engine/physics/RelinhoContactSolver.js`
- Modify: `frontend/src/engine/RelinhoMechanics.js` (legacy helper retained but removed from production hot path)
- Test: `tests/line-contact-system.test.cjs`
- Test: `tests/relinho-solver-p3.test.cjs`
- Regression: `tests/relinho-contact-budget.test.cjs`, `tests/physics-unbound-cut-regression.test.cjs`, `tests/p15-canonical-cut-authority.test.cjs`

**Interfaces:**
- `new LineContactSystem(config)` owns `LineBroadPhase` + `LineContactManager` and reusable narrow-phase/result/event buffers.
- `step(kites, dtSeconds, nowMs, { allowWear = true } = {}) -> { contacts, fxContacts, couplingJobs, cuts, metrics }`; all returned arrays are reused and valid until the next step.
- `setConfig(config)`, `reset()`, `contacts` getter. `GameApp.relinhoContacts` aliases `lineContactSystem.contacts`.

- [ ] **Step 1: Write failing system tests** proving discovery runs every other 60 Hz tick, active/tracked contacts revalidate every tick, new-contact narrow phase is capped at 96 checks/scan, solved contacts never exceed 3 and tracked contacts never exceed 12.
- [ ] **Step 2: Add multi-contact Review Focus test:** one rope in several candidate pairs receives at most one wear update per pair/tick and respects the per-rope solve cap; coupling is queued and applied only after all narrow checks finish.
- [ ] **Step 3: Add authority tests:** `allowWear=false` may detect/debug contacts but cannot mutate segment wear or emit cut results; `allowWear=true` can.
- [ ] **Step 4: Run** the new test plus existing authority/contact-budget tests and verify RED only for the new architecture.
- [ ] **Step 5: Implement `LineContactSystem`.** Discovery: broad phase at 30 Hz, rotating cursor through candidates, at most 96 cold narrow checks. Revalidation: manager-tracked contacts use their cached 3x3 hints at 60 Hz. Physics/abrasion/break run only for fair-selected contacts.
- [ ] **Step 6: Replace the large policy inside `GameApp.checkRelinhos()`.** Pass the existing `physicsKites` snapshot from `gameLoop` to avoid a second array allocation; App handles only FX/audio, HUD compact state and `handleCutSuccess()` for returned cuts.
- [ ] **Step 7: Preserve canonical break/shield flow.** `Physics.finalizeCut()` remains the only local shield consumer and break-metadata builder; a shield resets the losing rope wear, while a normal cut remains pending until backend confirmation. Backend rejection must leave the kite alive and resync exactly as today.
- [ ] **Step 8: Remove direct HP mutation from the production relinho solver.** Rework `RelinhoContactSolver.resolveCombatStep()` as a compatibility façade over the new contact/abrasion/break modules so existing callers/tests do not retain a second damage model.
- [ ] **Step 9: Run** `node --test tests/line-contact-system.test.cjs tests/relinho-solver-p3.test.cjs tests/relinho-contact-budget.test.cjs tests/physics-unbound-cut-regression.test.cjs tests/p15-canonical-cut-authority.test.cjs` and verify GREEN.
- [ ] **Step 10: Commit** only integration hunks/files as `refactor: route relinho through persistent abrasion system`.

### Task 7: Survivor crossing dynamics and post-cut continuity

**Files:**
- Modify: `frontend/src/engine/physics/KiteDynamics.js`
- Keep/validate: `frontend/src/engine/SpawnLayout.js`
- Test: `tests/sparse-duel-crossing.test.cjs`
- Test: `tests/spawn-layout-stability.test.cjs`
- Regression: `tests/cut-break-flyaway-aparo.test.cjs`, `tests/combat-full-cycle-voada-broken-rope.test.cjs`

**Interfaces:**
- `sparseCruiseTarget(kite, population, globalTime, width, height) -> {x,y}` uses deterministic layout phase for populations 2–4; no timer can directly change HP or declare a winner.

- [ ] **Step 1: Expand the existing sparse test** to 2, 3 and 4 survivors: phases are evenly distributed, two survivors exchange sides every half cycle, and no target collapses all survivors into one exact point.
- [ ] **Step 2: Keep spawn-layout regression** proving 40 new lines begin without artificial crossings or immediate contacts.
- [ ] **Step 3: Run** `node --test tests/sparse-duel-crossing.test.cjs tests/spawn-layout-stability.test.cjs` and verify the intended crossing contract.
- [ ] **Step 4: Implement/finish deterministic sparse targets** using rooftop layout index; preserve wind/turbulence, XPBD coupling and maneuver forces as perturbations around those targets.
- [ ] **Step 5: Run post-cut regressions** proving `breakAt()` uses the physical segment/t, flyaway starts at existing position/velocity, gravity/wind continue and the hand/flyaway rope halves separate without teleport.
- [ ] **Step 6: Commit** Task 7 files as `fix: keep sparse relinho duels physically resolving`.

### Task 8: Optional read-only contact debug overlay

**Files:**
- Create: `frontend/src/ui/LineContactDebugOverlay.js`
- Modify: `frontend/src/engine/App.js` (debug construction/update/destroy only)
- Test: `tests/line-contact-debug-overlay.test.cjs`

**Interfaces:**
- `new LineContactDebugOverlay({ enabled })`, `update(snapshot)`, `destroy()`.
- Enabled only when URL query contains `debugRelinho=1`; update rate is capped at 10 Hz and data comes from `LineContactManager.snapshot()`.

- [ ] **Step 1: Write failing DOM-stub tests** proving disabled mode creates no DOM, enabled mode shows pair IDs, contact point, angle, tensions, normal force, `vSlide`, contact time, sliding distance, rates, accumulated abrasion, cut resistance and `s/t`.
- [ ] **Step 2: Add a test** proving repeated `update()` reuses the same DOM nodes and never mutates manager/contact state.
- [ ] **Step 3: Run** `node --test tests/line-contact-debug-overlay.test.cjs` and verify RED.
- [ ] **Step 4: Implement the overlay** as a small fixed DOM panel; no physics tick may call DOM APIs.
- [ ] **Step 5: Wire render-loop debug updates** at <=10 Hz and clean them in `GameApp.destroy()`.
- [ ] **Step 6: Run focused test** and verify GREEN.
- [ ] **Step 7: Commit** as `feat: add relinho contact physics debug overlay`.

### Task 9: Determinism, 2/10/20/40 benchmarks and final regression gates

**Files:**
- Create: `tests/relinho-fixed-timestep.test.cjs`
- Create: `tests/benchmark-relinho-abrasion.mjs`
- Create: `tests/browser-relinho-perf-40.mjs`
- Create/update: `tests/evidence/relinho-abrasion-benchmark.json`
- Modify: `package.json` scripts only

**Interfaces:**
- `npm run test:relinho-bench` executes deterministic Node benchmarks for 2/10/20/40 ropes and writes the evidence JSON.
- `npm run test:relinho-browser` executes the 40-kite browser stress scenario and records frame/contact metrics.

- [ ] **Step 1: Write FPS-equivalence test** using the existing `PhysicsClock`: simulate the same wall-clock contact at render cadences 30/60/120 FPS and assert final segment wear differs by <=2% and cut tick differs by <=1 fixed step.
- [ ] **Step 2: Build synthetic benchmark scenarios** for 2, 10, 20 and 40 ropes, both distributed and dense-contact stress where useful. Record average/max tick ms, broad candidates, narrow checks, active/created/reused contacts, abrasion updates, cuts and `process.memoryUsage().heapUsed` delta.
- [ ] **Step 3: Add hard logical gates:** `trackedContacts<=12`, `solvedContacts<=3`, cold narrow checks `<=96` per discovery scan, no duplicate cut for a pair, and post-warmup logical contact allocation count cannot grow past the pool.
- [ ] **Step 4: Add timing safety gates** on x99 baseline hardware: 40-rope distributed average physics tick <=2.0 ms and max <=8.0 ms; dense stress average <=4.0 ms and must never exceed the 96 cold-check budget. Treat heap delta as reported telemetry plus a 16 MB safety ceiling after warmup.
- [ ] **Step 5: Add browser 40-kite gates** after prewarm: frame p95 <=40 ms, p99 <=80 ms, max observed frame <=250 ms, no uncaught exception, no more than 3 solved relinhos, no unbounded contact growth, and no synchronous collision storm.
- [ ] **Step 6: Run** `node --test tests/relinho-fixed-timestep.test.cjs`, then `npm run test:relinho-bench`, then `npm run test:relinho-browser`; verify all gates GREEN and inspect the evidence JSON.
- [ ] **Step 7: Run the complete regression set:** `npm run test:unit`, `npm run build`, `npm run test:browser`, `npm run test:perf`, `npm run test:soak`. Fix any regression with a new failing test before changing production code.
- [ ] **Step 8: Clean only temporary probes created during this work** (`tests/.tmp-duel-*`, `.tmp-cut-*`, `.tmp-task6-*` if still present); do not touch user/runtime data or unrelated dirty files.
- [ ] **Step 9: Record final objective evidence** in the benchmark JSON: 2/10/20/40 results, cut counts, timing, contact counts, heap delta and browser frame metrics.
- [ ] **Step 10: Commit** benchmark/test/package changes as `test: lock relinho abrasion performance gates`.

## Completion Gate

Implementation is complete only when all of the following are evidenced in fresh command output:

- Zero relative slide produces zero meaningful abrasion.
- Sustained sliding contact produces increasing abrasion and eventually localized rupture.
- Higher slide and higher tension increase abrasion within configured clamps.
- Short contact cannot instantly cut a healthy line.
- Rupture coordinates/segment `s/t` survive the canonical backend flow and post-cut motion is continuous.
- Two to four survivors receive recurring physical crossing opportunities without any kill timer.
- 40-kite discovery/solve work stays bounded by the broad-phase/narrow-phase/contact-pool gates.
- Full unit, build, browser, performance and soak validations are GREEN.
- No regression reintroduces 3D freeze, tremor cascade, duplicate damage, duplicate cut, infinite contact growth or direct `skill -> damage` shortcuts.
