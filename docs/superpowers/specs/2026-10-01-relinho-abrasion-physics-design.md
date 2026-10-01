# Relinho Contact, Abrasion and Cut Physics — Design

Date: 2026-10-01
Status: design for implementation
Scope: frontend fixed-step physics + canonical backend cut validation; no renderer rewrite.

## Intent

Replace the current contact-to-damage shortcut with a persistent physical chain:

`CROSSING -> CONTACT -> SLIDING -> ABRASION -> BREAK`

A geometric intersection alone must not damage a line. Abrasion requires sufficient relative sliding, normal force derived from line tension and crossing angle, elapsed contact time, and material properties.

The implementation must preserve the stability already achieved with up to 40 simultaneous kites, preserve all current TikTok gifts and maneuvers, preserve backend cut authority, and keep post-cut flyaway physics and 3D rendering intact.

## Current implementation audit

The existing architecture already provides useful primitives and will be retained:

- `PhysicsClock`: fixed 1/60 s simulation with accumulator.
- `RopePhysics`: 12-node XPBD/Verlet rope, per-node velocity, AABB, emergent tension and localized `segmentWear`.
- `RopeCollision`: capsule-like segment contact, rope AABB rejection, 3x3 hinted hot path, segment indices, normalized `s/t`, angle, relative and sliding speeds.
- `RelinhoContactBudget`: currently limits active relinhos to three but can starve other pairs when low-productivity contacts stay active.
- `RelinhoContactSolver`: currently converts frictional power directly into HP/segment damage each tick.
- `FallingKite`, `FlyawayKite`, `BrokenHandRope`: already preserve momentum, gravity, wind and split rope geometry after a canonical cut.
- `cutClaimValidator`: backend already checks claimed cut point against both XPBD polylines before accepting `relinho:cut`.

## Measured baseline

Before this redesign, the focused physical regression suite is 27/27 GREEN.

Synthetic 40-rope benchmark, 120 fixed steps:

- distributed ropes: 780 pair calls/step, about 0.065 ms/step;
- all-crossing worst case: 780 pair calls/step, about 2.836 ms/step;
- the outer `GameApp.checkRelinhos()` loop is still O(N²), even though `RopeCollision` performs its own AABB rejection internally.

Observed gameplay failure modes:

- two to four surviving kites can remain indefinitely without a meaningful line crossing;
- a persistent contact can have near-zero slide and therefore no abrasion, which is physically valid but needs the flight dynamics to separate/re-engage naturally;
- the current three-contact admission policy favors already-active contacts and can keep low-productivity pairs occupying the solve budget;
- contact state does not store accumulated sliding distance or per-line abrasion energy;
- `evolveRelinhoContact()` creates replacement state objects, adding avoidable allocations in the hot path;
- `RelinhoContactSolver` still calls `takeDamage()` directly, so UI HP and physical segment wear are two competing damage models.

## Selected approach

Use an incremental refactor around the existing XPBD rope system. Do not replace the renderer, RopePhysics, canonical backend flow or post-cut mechanics.

Rejected alternatives:

1. Full server-side rope simulation: strongest authority but too risky for today's latency/performance architecture.
2. Pure timer-based forced cuts: fixes pacing but violates the requested physical model.
3. Rebuilding the entire rope engine: unnecessary; the current node velocities, AABBs, segment wear and cut geometry already provide the required foundation.

## Runtime architecture

### 1. `LineBroadPhase`

A new lightweight sweep-and-prune module consumes the already-maintained rope AABBs and returns only potentially overlapping rope pairs.

Rules:

- sort active rope AABBs on X once per discovery scan;
- stop scanning a pair when the next `minX` exceeds current `maxX + contactRadius`;
- confirm Y overlap before emitting a candidate;
- exclude ascending, spawn-protected and pending-cut kites before insertion;
- reuse arrays/buffers between ticks;
- expose counters: input lines, candidate pairs, rejected pairs.

New-contact discovery may run at 30 Hz while active contacts are revalidated at the 60 Hz fixed step. This caps worst-case discovery work without changing render FPS or abrasion integration.

### 2. `RopeCollision`

Keep it as the narrow phase. Extend its reusable result to expose local contact kinematics without creating transient arrays:

- tangent A/B;
- interpolated contact velocity A/B;
- relative velocity vector;
- signed/magnitude slide projected on each rope tangent;
- `relativeSpeed`, `slidingSpeed`, `sinAngle`, `s/t`, segment indices and contact point.

The existing whole-rope AABB check remains as a defensive early-out. Existing 3x3 segment hints remain the active-contact hot path.

### 3. `LineContactManager`

Own a persistent mutable contact map keyed by the stable pair key. `GameApp.relinhoContacts` remains externally observable for compatibility but becomes the manager's map rather than an ad-hoc state table.

Each `LineContact` stores and mutates in place:

- `pairKey`, `lineAId`, `lineBId`;
- contact `x/y/z`;
- `segmentIndexA/B`, normalized `s/t`;
- `crossingAngle`, `sinAngle`;
- `tensionA/B`, `effectiveTension`, `normalForce`;
- local relative velocity and `vSlide`;
- `contactTime` and `slidingDistance`;
- `abrasionA/B` and current `abrasionRateA/B`;
- `startedAt`, `lastSeenAt`, `active`, `phase`;
- reusable narrow-phase hint indices.

Contacts are not recreated every frame. When unseen they enter `RELEASE`; they expire after a short configurable grace period. Re-contact inside that grace may reuse the same object while continuous `contactTime` is reset appropriately.

Admission changes from "first three active pairs globally" to a bounded fair solve policy:

- existing true contacts receive hysteresis, not permanent priority;
- maximum active solved contacts is bounded globally;
- maximum solved contacts per rope remains small (default 3);
- priority score uses physical overlap quality, `vSlide`, normal force and contact age;
- a rotating cursor breaks equal-score ties so one sterile pair cannot starve every other pair;
- particles and coupling keep their own stricter budgets.

### 4. `LineContactPhysics`

Pure calculation module. No renderer, socket, DOM or state mutation.

For local contact velocities `vA` and `vB`:

`vRel = vA - vB`

`slideA = abs(vRel dot tangentA)`

`slideB = abs(vRel dot tangentB)`

`vSlide = 0.5 * (slideA + slideB)`

`vSlide` must remain approximately zero when both contact points move together. No fallback may turn an explicit zero slide into artificial damage.

Tension uses the physical rope values:

`effectiveTension = 0.5 * (tensionA + tensionB) * tensionMultiplier`

`normalForce = effectiveTension * angleInfluence(sinAngle)`

`angleInfluence` is clamped, monotonic and approaches zero for nearly parallel lines. The existing minimum crossing-angle rejection remains, avoiding singular/glancing contacts.

### 5. `LineAbrasionModel`

Abrasion is integrated from physical work, not direct collision damage.

Base rate:

`baseRate = K * friction * normalForce * max(0, vSlide - minSlideSpeed)`

Per-line wear is asymmetric:

- line A wear is scaled by line B abrasiveness / line A abrasion resistance;
- line B wear is scaled by line A abrasiveness / line B abrasion resistance;
- local slide projected along each rope and relative tension provide bounded directional exposure factors;
- maneuvers primarily affect movement, spool length, tension and geometry through existing systems;
- existing gameplay power/defense modifiers may remain only as bounded multipliers, never as fixed skill damage.

Integration:

`slidingDistance += vSlide * dt`

`abrasion += abrasionRate * dt`

Per-tick normalized wear is capped by `maxWearPerTick` before being written to `RopePhysics.segmentWear`. This prevents one pathological velocity sample from producing an instant cut.

No call to `kite.takeDamage()` occurs merely because a contact exists. The HP bar becomes a presentation of structural integrity: the weakest relevant rope segment drives `lineHP/maxLineHP`, preserving the existing UI and shield flow.

### 6. Material resistance and configuration

Extend `LineMaterial` with explicit cut/abrasion resistance data where needed, while preserving current stiffness, damping, friction, abrasiveness and `maxTension`.

A single validated config object owns all tuneable physics constants. No scattered magic numbers:

- `abrasionK`;
- `minSlideSpeed`;
- `tensionMultiplier`;
- angle influence/exponent;
- minimum contact time / engagement ramp;
- contact release grace;
- `maxWearPerTick`;
- discovery frequency;
- global and per-rope contact solve budgets;
- material `cutResistance`.

The backend `SettingsManager` sanitizes supported overrides and broadcasts them through the existing `settings:sync` path. Defaults remain safe when no custom values exist.

### 7. `LineBreakSystem`

Rupture is triggered by localized structural wear, not by intersection.

For the contacted segment:

- normalized wear is accumulated in `RopePhysics.segmentWear`;
- material `cutResistance` scales how fast abrasion energy becomes normalized wear;
- rupture occurs only when the local segment reaches its physical threshold;
- exact `segmentIndex` and normalized segment `s/t` from the active contact are passed to the canonical cut proposal;
- simultaneous physical rupture uses the existing deterministic tie resolution and shield handling; no infinite 1-HP loop.

The frontend still proposes the cut. The backend remains authoritative and validates the claimed point against both recent XPBD polylines before emitting `game:cut_occurred`.

### 8. Post-cut physics

Do not rewrite the current successful flow:

- backend confirms `game:cut_occurred`;
- `RopePhysics.breakAt(segmentIndex, t)` splits geometry at the physical contact;
- hand-side nodes become `BrokenHandRope`;
- kite-side nodes remain with `FlyawayKite`;
- existing velocity/angular momentum is preserved;
- player tension no longer acts on the flyaway;
- gravity, wind and aerodynamic drag continue naturally;
- 3D flyaway/pool optimization remains independent of the simulation state.

## Preventing eternal low-slip locks

No kill timer will be introduced.

The resolution comes from dynamics:

- wind/turbulence continue to perturb rope geometry;
- XPBD non-penetration coupling separates overlapping ropes rather than magnetizing kite bodies;
- for 2-4 survivors, flight targets use evenly distributed deterministic phases derived from rooftop layout, causing survivors to exchange lateral corridors instead of depending on random `windPhase`;
- persistent near-zero-slip contacts accumulate no meaningful abrasion and naturally release/re-engage as the ropes move;
- contact admission fairness ensures a sterile contact cannot monopolize the solve budget forever.

This preserves the rule `vSlide ~= 0 => abrasion ~= 0` while still producing recurring opportunities for a physical sliding contact.

## Fixed timestep and determinism

The existing `PhysicsClock(1/60)` remains the authority for critical physics.

- abrasion integrates with `dt` in seconds;
- `contactTime` and `slidingDistance` integrate with the same fixed step;
- render FPS does not alter wear rate;
- new-contact discovery can be decimated to 30 Hz, but accepted contacts are integrated at 60 Hz;
- tests compare equivalent wall-clock simulations at 30/60/120 render rates.

## Debug surface

Debug is optional and disabled by default.

A lightweight `LineContactDebugOverlay` reads snapshots from `LineContactManager`; it never owns simulation state.

When enabled it shows, per selected/nearest contact:

- contact point marker;
- pair IDs;
- crossing angle;
- tension A/B and normal force;
- `vSlide`;
- contact time and sliding distance;
- abrasion rate A/B;
- accumulated/local wear and material cut resistance;
- normalized contact `s/t`.

Text lives in a DOM overlay. Optional 3D contact markers are pooled and have a strict count cap.

## Performance strategy

The hot path must stay allocation-light and bounded.

- Sweep-and-prune broad phase replaces unconditional 780-pair outer scanning.
- Active contacts use cached segment hints and a 3x3 narrow search.
- New contacts are discovered at a lower fixed frequency with a rotating candidate cursor.
- Contact objects are pooled/reused and mutated in place.
- Narrow-phase scratch/result objects are reusable.
- No JSON serialization, React/state updates, raycasts or DOM work occurs inside the physics tick.
- Coupling remains deferred until after collision scanning.
- Coupling, sparks/audio and debug markers each have independent budgets.
- No renderer geometry is created or disposed by the contact solver.

Worst-case all-overlap scenes are allowed to postpone discovery of low-priority new contacts rather than perform unbounded work in one tick. Fair rotation guarantees eventual inspection.

## Metrics and benchmark

Add deterministic synthetic benchmark cases for 2, 10, 20 and 40 ropes plus a browser 40-kite scenario.

Collect:

- average and max physics tick ms;
- broad-phase candidate count;
- narrow-phase checks;
- active/created/reused `LineContact` count;
- true contacts;
- abrasion updates;
- cuts;
- logical contact allocations/reuses;
- heap delta where the runtime exposes it;
- browser FPS/frame p95/p99 and renderer draw calls.

Regression gates are based on both absolute safety ceilings and relative improvement versus the recorded baseline. The distributed 40-rope path must remain well below the frame budget; the all-overlap stress path must not create a synchronous collision storm.

## Required tests

TDD must cover at least:

1. parallel separated lines => no contact, zero abrasion;
2. crossed lines with zero relative slide => abrasion approximately zero;
3. crossed lines with high relative slide => positive abrasion;
4. increasing `vSlide` increases abrasion rate;
5. increasing physical tension increases abrasion within clamps;
6. short contact cannot instantly break a healthy line;
7. prolonged sliding contact eventually breaks the disadvantaged line;
8. break segment/index and normalized contact coordinate match the real contact;
9. canonical cut creates separated rope + falling/flyaway state without teleport;
10. equivalent elapsed simulation at 30/60/120 render FPS yields approximately equivalent wear;
11. 40-kite stress remains bounded and does not explode contacts or CPU.

## Expected file-level changes

Existing files to evolve:

- `frontend/src/engine/App.js`: orchestration only; remove embedded contact/damage policy from `checkRelinhos()`.
- `frontend/src/engine/physics/RopeCollision.js`: reusable kinematic output and scratch buffers.
- `frontend/src/engine/physics/RopePhysics.js`: localized structural wear helpers; no renderer responsibility.
- `frontend/src/engine/physics/LineMaterial.js`: explicit cut resistance and material coefficients.
- `frontend/src/engine/Physics.js`: facade delegates break decision without direct collision damage semantics.
- `frontend/src/engine/physics/KiteDynamics.js`: sparse-survivor crossing dynamics only; no forced kill timer.
- `frontend/src/engine/Maneuvers.js`: retain motion/tension effects; remove dependence on direct damage where superseded.
- `backend/settingsManager.js`: validated abrasion/contact tuning knobs.
- `backend/cutClaimValidator.js`: retain canonical geometric validation; extend only if normalized segment evidence is required.

New focused modules:

- `frontend/src/engine/physics/LineBroadPhase.js`
- `frontend/src/engine/physics/LineContactManager.js`
- `frontend/src/engine/physics/LineContactPhysics.js`
- `frontend/src/engine/physics/LineAbrasionModel.js`
- `frontend/src/engine/physics/LineBreakSystem.js`
- `frontend/src/ui/LineContactDebugOverlay.js`

`FallingKite`, `FlyawayKite`, `BrokenHandRope`, Three.js pooling and TikTok event flows remain intact unless a regression test proves a narrowly scoped fix is necessary.

## Migration and compatibility

Implementation is incremental. The existing canonical cut event and payload fields remain valid. Existing `relinhoContacts` consumers receive compatible state plus richer metrics. The old direct-damage solver remains covered by tests until the new abrasion path reaches GREEN, then its obsolete direct HP mutation is removed in the same checkpoint.

No new production dependency is required.

## Acceptance criteria

The work is complete only when:

- intersection without relative sliding produces no meaningful abrasion;
- sliding contact accumulates distance and localized wear predictably;
- material/tension/angle changes affect wear coherently;
- two to four surviving kites repeatedly receive physical crossing opportunities without a kill timer;
- the disadvantaged local segment eventually breaks under sustained abrasive sliding;
- the canonical cut point matches the physical contact and post-cut motion remains continuous;
- 2/10/20/40 benchmarks are recorded;
- focused physics tests, full unit suite, production build and browser/performance tests are GREEN;
- no regression reintroduces 3D freeze, collision storms, duplicate cuts or unbounded contact growth.
