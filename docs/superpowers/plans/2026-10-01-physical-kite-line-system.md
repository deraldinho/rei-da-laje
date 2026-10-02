# Physical Kite + Line System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scripted kite motion with a cheap deterministic 3D tethered-kite model where wind, attitude, spool length, rope tension and line material generate flight, retÃ£o, relinho, abrasion and cuts.

**Architecture:** Keep the current 60 Hz fixed-step and XPBD rope/contact pipeline. Add explicit wind-field, spool, attitude/aerodynamic and live-assist boundaries; `KiteDynamics` becomes the force integrator, while renderer/UI only consume physics state. Existing contact broad-phase, wear locality and cut pipeline remain authoritative.

**Tech Stack:** JavaScript ESM, Node test runner, PixiJS, Three.js, existing XPBD RopePhysics and browser performance harnesses.

**Spec:** `docs/superpowers/specs/2026-10-01-live-assisted-kite-progression-design.md`

## Global Constraints

- Fixed simulation remains 60 Hz and must support 40 active kites.
- No database/network I/O inside the physics loop.
- No direct opponent HP changes from commands, maneuvers or gifts.
- No direct kite x/y/z teleport for ordinary control or combat maneuvers.
- Keep broad-phase bounded; never restore all-segment/all-pairs per-frame scanning.
- Preserve contact fairness limits and the existing physical abrasion/cut pipeline.
- Physics owns x/y/z and attitude; Three.js is render-only after migration.
- Material names are virtual gameplay classes only; store coefficients, never real-world preparation instructions.

## Review Focus

- A 30â€“60 s idle flight under stable wind must not repeatedly desbicar or oscillate violently.
- Pull/release at extreme command rates must remain finite and must not invert rope length or tension.
- A renderer slowdown or missing 3D slot must never change logical z/contact physics.
- Forty kites must remain distributed without returning to a rigid grid or central pile.
- Hot-swapping a virtual line material must not reset wear or create NaN/instant breaks.

## File Structure

- Create `frontend/src/engine/physics/WindField.js` â€” deterministic slow wind field and gust envelopes.
- Create `frontend/src/engine/physics/SpoolController.js` â€” authoritative pull/release of rope length.
- Create `frontend/src/engine/physics/KiteAttitude.js` â€” heading/pitch/roll state and angular stability.
- Create `frontend/src/engine/physics/KiteAerodynamics.js` â€” apparent-wind forces and torques.
- Create `frontend/src/engine/physics/LineStructuralModel.js` â€” material load/over-tension fatigue only.
- Create `frontend/src/engine/physics/LiveCombatDirector.js` â€” weak anti-stall/anti-collapse physical bias.
- Modify `Wind.js`, `KiteDynamics.js`, `RopePhysics.js`, `LineMaterial.js`, `LineAbrasionModel.js`, `PlayerIntentController.js`, `ChatControls.js`, `Maneuvers.js`, `App.js`, `ThreeSkyScene.js`.
- Add focused Node tests and keep the existing relinho/browser benchmarks as final gates.

---
### Task 1: Slow deterministic wind field

**Files:**
- Create: `frontend/src/engine/physics/WindField.js`
- Modify: `frontend/src/engine/Wind.js`
- Test: `tests/wind-field-organic.test.cjs`
- Update: `tests/competition-mechanics.test.cjs`

**Interfaces:**
- Produces: `sampleWindField(timeSeconds, config = {}) -> {x,y,z,gust,turbulence,current}`.
- Preserves: `Wind.sample(time)` and `Wind.sampleAt(time,y,height)` public contracts.

- [ ] **Step 1: Write failing continuity/determinism tests**

Assert same time/config returns identical samples; consecutive 1/60 s samples are finite and continuous; gust/direction change smoothly rather than stepping.

- [ ] **Step 2: Add a 60 s stability test**

Assert normal wind keeps a dominant direction over multi-second windows and vertical/turbulence components remain secondary to horizontal flow.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `node --test tests/wind-field-organic.test.cjs tests/competition-mechanics.test.cjs`
Expected: new organic-wind assertions fail against the current fast multi-sine model.

- [ ] **Step 4: Implement `sampleWindField` and delegate `Wind.sample` to it**

Use deterministic low-frequency target interpolation with smooth gust envelopes; retain settings for intensity/direction/pace without abrupt vector jumps.

- [ ] **Step 5: Re-run focused tests and commit**

Run the same command; expected PASS.
Commit: `feat(physics): add persistent organic wind field`

### Task 2: Authoritative spool length and rope tension

**Files:**
- Create: `frontend/src/engine/physics/SpoolController.js`
- Modify: `frontend/src/engine/physics/RopePhysics.js`
- Test: `tests/spool-rope-control.test.cjs`
- Update: `tests/audit-physics-p5-remediation.test.cjs`

**Interfaces:**
- Produces: `new SpoolController(rope, options)` and `step(dt, spoolCommand)` where command is clamped to `[-1,1]` (`-1` pull, `+1` release).
- Adds: `RopePhysics.adjustSpoolLength(deltaPx)`, `RopePhysics.getSlackRatio(handPos,kitePos)`, `RopePhysics.getMechanicalState(handPos,kitePos)`.

- [ ] **Step 1: Write failing spool tests**

Assert release monotonically increases `spoolLength`/slack and lowers natural tension; pull monotonically decreases slack and raises tension without taking spool length below a safe geometric minimum.

- [ ] **Step 2: Add extreme-input tests**

Feed long pull/release sequences and assert all rope nodes, spool length and tension stay finite and bounded.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/spool-rope-control.test.cjs tests/audit-physics-p5-remediation.test.cjs`
Expected: RED because `RopePhysics.step` currently drives spool length back toward `currentDist*(1+lineSlack*0.32)`.

- [ ] **Step 4: Make spool length authoritative**

`RopePhysics.step` may initialize spool length but must not overwrite an already controlled spool from `lineSlack`; derive slack/tension from geometry and controlled length instead.

- [ ] **Step 5: Implement `SpoolController` and pass tests**

Map normalized command to bounded pull/release speeds and use only RopePhysics length APIs.

- [ ] **Step 6: Commit**

Commit: `feat(physics): make spool length drive rope tension`

### Task 3: Kite attitude and aerodynamic force model

**Files:**
- Create: `frontend/src/engine/physics/KiteAttitude.js`
- Create: `frontend/src/engine/physics/KiteAerodynamics.js`
- Test: `tests/kite-aerodynamics-attitude.test.cjs`

**Interfaces:**
- Produces: `ensureKiteAttitude(kite) -> attitude` with `heading`, `pitch`, `roll`, `headingRate`, `pitchRate`.
- Produces: `stepKiteAttitude(kite, dt, {wind,tension,debicoTorque}) -> attitude`.
- Produces: `computeKiteAerodynamics(kite, wind, ropeState, control) -> {fx,fy,fz,headingTorque,pitchTorque}`.

- [ ] **Step 1: Write failing stable-flight tests**

Simulate 30 s with steady wind/high line tension and assert attitude remains bounded, no repeated large nose-down events occur, and position/velocity outputs stay finite.

- [ ] **Step 2: Write failing desbico/tension tests**

Assert explicit `debicoTorque` changes heading more when tension/slack allows it, while high tension damps angular velocity and restores stability.

- [ ] **Step 3: Write apparent-wind tests**

Assert aerodynamic force uses `windVelocity - kiteVelocity`; increasing relative wind increases force without NaN/negative-mass behavior.

- [ ] **Step 4: Run and verify RED**

Run: `node --test tests/kite-aerodynamics-attitude.test.cjs`
Expected: RED because attitude/torque modules do not exist.

- [ ] **Step 5: Implement attitude integration and aerodynamic force functions**

Keep the model tethered-kite-specific and allocation-light; do not import Three.js into physics.

- [ ] **Step 6: Run tests and commit**

Expected: PASS.
Commit: `feat(physics): add tethered kite attitude and aerodynamics`

### Task 4: Make KiteDynamics the 3D physics authority

**Files:**
- Modify: `frontend/src/engine/physics/KiteDynamics.js`
- Modify: `frontend/src/engine/App.js`
- Modify: `frontend/src/ui/ThreeSkyScene.js`
- Replace/update: `tests/dense-arena-distribution.test.cjs`
- Create: `tests/kite-3d-authority.test.cjs`

**Interfaces:**
- Consumes: WindField, SpoolController, KiteAttitude and KiteAerodynamics from Tasks 1â€“3.
- Produces: authoritative `kite.x/y/z`, `vx/vy/vz`, attitude and contact speed at the fixed physics step.

- [ ] **Step 1: Write failing physics-authority tests**

Assert changing/missing a mock renderer z cannot modify logical kite z; the same physics seed/input produces the same x/y/z trajectory with renderer enabled or absent.

- [ ] **Step 2: Replace rigid-grid tests with anti-collapse tests**

For 40 kites, require adequate arena spread and bounded close-pair count after 10/30 s, but explicitly assert positions are not locked to row/column cruise targets.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/kite-3d-authority.test.cjs tests/dense-arena-distribution.test.cjs`
Expected: RED because current code uses dense/sparse cruise targets and ThreeSkyScene writes `kite.z`.

- [ ] **Step 4: Refactor `KiteDynamics.step` into force integration**

Remove `naturalSway` and strong cruise-target springs from normal flight; consume aerodynamic, rope, gravity and control forces, then integrate x/y/z and attitude with safety bounds only.

- [ ] **Step 5: Make ThreeSkyScene render-only**

Render depth/orientation from logical physics state; delete the renderer-to-physics `kite.z = k3d.position.z` path and the equivalent pre-contact overwrite in `App.checkRelinhos`.

- [ ] **Step 6: Run tests and commit**

Commit: `refactor(physics): make kite simulation authoritative in 3d`

### Task 5: Convert chat and maneuvers to physical intent only

**Files:**
- Modify: `frontend/src/engine/physics/PlayerIntentController.js`
- Modify: `frontend/src/engine/ChatControls.js`
- Modify: `frontend/src/engine/Maneuvers.js`
- Modify: `frontend/src/engine/App.js`
- Update: `tests/player-intent-live-buffer-p11.test.cjs`
- Create: `tests/live-control-physics-contract.test.cjs`

**Interfaces:**
- `PlayerIntentController.update(...)` produces `spoolCommand`, `debicoTorque`, `trimPitch`, `tensionAssist` (legacy fields may exist only during this migration).
- Chat/maneuver functions may set intent/action state but must not write x/y/z/vx/vy/vz directly.

- [ ] **Step 1: Write failing no-teleport tests**

Call `puxar`, `soltar/descarregar`, `desbicar/despicar`, `tenteio` and `retao`; before a physics step assert position and velocity are unchanged while intent state changes.

- [ ] **Step 2: Write retÃ£o sequence test**

Execute release -> desbico -> pull through fixed physics; assert heading changes during slack and subsequent pull creates a strong pass in the acquired heading without setting a target coordinate.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/player-intent-live-buffer-p11.test.cjs tests/live-control-physics-contract.test.cjs`
Expected: RED because `ChatControls`/`Maneuvers` currently mutate coordinates and velocities.

- [ ] **Step 4: Route all control through intent/spool/attitude**

Keep command parsing, combos, buffering and maneuver names; replace direct movement bodies with intent sequences and timers.

- [ ] **Step 5: Route local/admin keyboard controls through the same interface**

No debug input may bypass physical control by writing coordinates.

- [ ] **Step 6: Run tests and commit**

Commit: `refactor(control): drive live maneuvers through kite physics`

### Task 6: Material mechanics and structural line failure

**Files:**
- Modify: `frontend/src/engine/physics/LineMaterial.js`
- Create: `frontend/src/engine/physics/LineStructuralModel.js`
- Modify: `frontend/src/engine/physics/RopePhysics.js`
- Modify: `frontend/src/engine/physics/LineBreakSystem.js`
- Create: `tests/line-material-structural.test.cjs`
- Update: `tests/line-break-system.test.cjs`

**Interfaces:**
- `getLineMaterial(type)` keeps existing fields and adds normalized mechanical properties needed by rope load/elasticity.
- `evaluateStructuralLoad(rope, material, dt) -> {loadRatio,fatigueDelta,overloaded,broke}`.
- Existing segment wear remains preserved when `RopePhysics.setMaterial()` changes material.

- [ ] **Step 1: Write failing material-contract tests**

Assert every virtual material has finite positive density/stiffness/damping/friction/abrasiveness/abrasionResistance/cutResistance/maxTension; aliases resolve safely to known material classes.

- [ ] **Step 2: Add safe virtual material tiers**

Represent the requested gameplay families only as virtual coefficients: cerol base `friction=.74, abrasiveness=1.50, abrasionResistance=.92, cutResistance=1.10, maxTension=45`; lampada `.78/1.65/1.00/1.15/47`; acrilico `.82/1.80/1.08/1.25/50`; pedra `.86/2.00/1.12/1.30/52`; cristal `.90/2.20/1.20/1.40/55`; chilena `.92/2.35/1.35/1.55/62`. All new cerol subtiers inherit the base cerol diameter/linearDensity/stiffness/damping unless explicitly changed later by a separately approved balance task; `chilena` aliases the existing `chile` mechanical profile plus the listed contact/strength values. These are gameplay numbers only; do not encode preparation recipes or real manufacturing details.

- [ ] **Step 3: Write sustained-overload tests**

Assert overload lasting under 0.12 s cannot snap an intact line. After the grace window, fatigue accumulates as `max(0, loadRatio-1) * dt / 0.35`; break only when accumulated structural fatigue reaches 1, localized at the weakest segment.

- [ ] **Step 4: Run and verify RED**

Run: `node --test tests/line-material-structural.test.cjs tests/line-break-system.test.cjs`
Expected: RED because structural load/fatigue is not currently evaluated.

- [ ] **Step 5: Implement structural model and integrate with break evaluation**

Keep abrasion and tensile failure as separate causes that converge on the same localized `breakAt(segmentIndex,t)` pipeline.

- [ ] **Step 6: Run tests and commit**

Commit: `feat(physics): model line material strength and fatigue`

### Task 7: Couple material, tension and sliding into abrasion

**Files:**
- Modify: `frontend/src/engine/physics/LineAbrasionModel.js`
- Modify: `frontend/src/engine/physics/LineMaterial.js`
- Update: `tests/line-abrasion-model.test.cjs`
- Update: `tests/line-break-system.test.cjs`

**Interfaces:**
- Add: `getLinePairProperties(materialA, materialB) -> {friction,abrasivenessA,abrasivenessB}`.
- `integrateLineAbrasion` continues to output localized `wearDeltaA/B` and never applies direct HP damage.

- [ ] **Step 1: Add failing pair-property tests**

Assert pair resolution is symmetric for friction, directional only for each material's abrasiveness/resistance, finite for aliases, and monotonic for higher virtual friction tiers.

- [ ] **Step 2: Add tension/sliding regression tests**

Pin that zero geometric contact gives zero wear, valid engaged contact keeps the approved nonzero floor, and increasing relative slide/tension materially increases wear without order-dependent winner rules.

- [ ] **Step 3: Run and verify RED where pair properties are absent**

Run: `node --test tests/line-abrasion-model.test.cjs tests/line-break-system.test.cjs`

- [ ] **Step 4: Replace ad-hoc average friction with pair properties**

Keep the existing engagement ramp, contact floor, localized segment wear and directional exposure; only material coupling changes.

- [ ] **Step 5: Run tests and commit**

Commit: `refactor(physics): couple line materials through contact abrasion`

### Task 8: Weak LiveCombatDirector instead of cruise rails

**Files:**
- Create: `frontend/src/engine/physics/LiveCombatDirector.js`
- Modify: `frontend/src/engine/physics/KiteDynamics.js`
- Modify: `frontend/src/engine/App.js`
- Update: `tests/dense-arena-distribution.test.cjs`
- Update: `tests/pace.test.cjs`

**Interfaces:**
- Produces: `computeLiveAssist(kite,kites,wind,dt) -> {fx,fy,fz}` with strictly bounded force output.
- The director receives state only and cannot mutate kite coordinates, HP, rope wear or contact state.
- [ ] **Step 1: Write failing director purity/bounds tests**

Assert the function does not mutate inputs, produces finite bounded forces, does nothing when spacing/action pacing is already healthy, and never encodes direct damage/contact.

- [ ] **Step 2: Write 15/20/40-kite live pacing tests**

Over deterministic 15/20/40-kite runs, require horizontal span > 65% of width, vertical span > 10% of height, <=12 pairs within 55 px after settling, no fixed row/column targets, and at least one geometric contact opportunity within 15 s without manufacturing contact.

- [ ] **Step 3: Run and verify RED**

Run: `node --test tests/dense-arena-distribution.test.cjs tests/pace.test.cjs`
Expected: RED after cruise rails are removed until weak physical assistance exists.

- [ ] **Step 4: Implement bounded assistance**

Use weak separation and encounter-opportunity bias only. Clamp assist magnitude to 25 game-force units total and z assist to 8; disable encounter steering during explicit player maneuver control.

- [ ] **Step 5: Run tests and commit**

Commit: `feat(physics): add bounded live combat assistance`

### Task 9: End-to-end physics regression and 40-kite performance gate

**Files:**
- Update only tests/benchmarks if instrumentation is required; do not loosen production budgets to make a test pass.
- Verify: `tests/browser-relinho-perf-40.mjs`, unit suite and build.

**Interfaces:**
- No new production interface; this task proves Tasks 1â€“8 compose safely.

- [ ] **Step 1: Run the complete unit suite**

Run: `npm test`
Expected: all tests PASS; no skipped physical-contract tests.

- [ ] **Step 2: Run focused physical cycle tests**

Run: `node --test tests/combat-full-cycle-voada-broken-rope.test.cjs tests/cut-break-flyaway-aparo.test.cjs tests/line-abrasion-model.test.cjs tests/line-break-system.test.cjs`
Expected: PASS.

- [ ] **Step 3: Run the real 40-kite relinho browser gate**

Run: `npm run test:relinho-browser`
Expected: 40 kites, no uncaught exceptions, 60 FPS runtime target, bounded collision/physics costs, maxTracked/maxSolved budgets preserved.

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Vite production build succeeds and backend-served `dist` references the new bundle.

- [ ] **Step 5: Perform a 30â€“60 s visual smoke test**

Verify: no spontaneous repetitive desbico, wind drifts organically, pull/release visibly changes line belly/tension, retÃ£o emerges from orientation + pull, 40 kites do not form a grid/pile, and line cuts occur only at physical contact.

- [ ] **Step 6: Commit verification-only fixes if needed**

Do not amend earlier behavior commits unless a failing gate requires a focused fix; record every fix with its own test and commit.


