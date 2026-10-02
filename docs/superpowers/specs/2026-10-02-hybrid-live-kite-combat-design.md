# Hybrid Live Kite Combat â€” Design Specification

Date: 2026-10-02
Status: Awaiting user review
Scope: CompetiÃ§Ã£o de Pipa TikTok Live

## 1. Goal

Build a TikTok Live kite-combat system that combines three responsibilities without mixing them:

1. **Live 2D-style arena behavior** â€” the wind continuously reorganizes the whole sky and naturally creates opportunities for line crossings.
2. **3D kite-control mechanics** â€” spool, tension, slack, attitude, apparent wind, inertia and pull/release determine how each kite actually moves.
3. **Experimental 3D line physics** â€” only real line-to-line contact in 3D may create relinho, abrasion, fatigue and breakage.

The game must feel like a continuous free-for-all with up to 40 simultaneous kites. There is no target selection, duel queue, combat lane or opponent lock during normal play.

Core rule:

> Wind creates normal PvP. Comments influence the kite. Gifts pilot the kite. Physics decides the result.

## 2. Non-negotiable constraints

- Preserve the current 3D physics already implemented: wind, `KiteDynamics`, attitude, spool/tension, `RopePhysics`, broad phase, narrow phase, contact manager, abrasion, structural fatigue and localized breakage.
- Do not replace flight with canned animation or coordinate teleportation.
- Normal kites never choose, chase or lock onto an opponent.
- A kite may physically contact any number of nearby lines; contact eligibility is geometric, not AI-driven.
- A visual X in camera space is insufficient. Contact requires true 3D segment proximity inside the configured contact radius.
- Gifts and comments may only produce physical intentions. They never directly reduce HP, force a cut or fabricate a contact.
- Maintain existing relinho budgets: `maxTracked <= 12`, `maxSolved <= 3`; no naive all-pairs/all-segments per-frame loop.
- Preserve the 40-kite performance target and fixed 60 Hz physics clock.
- Virtual line-material names and coefficients are game abstractions only; no real-world preparation or manufacturing instructions belong in the project.

## 3. Responsibility model

The system is intentionally split into five independent layers:

1. `SkyWindDirector` â€” global arena motion and wind phases.
2. `CommentGestureEngine` â€” short native physical influence from chat engagement.
3. `GiftManeuverAI` â€” temporary intelligent piloting after gifts.
4. Existing 3D kite/rope physics â€” authority over actual motion.
5. Existing 3D contact/material physics â€” authority over wear and cut results.

## 4. Normal arena behavior: `SkyWindDirector`

Normal combat has no combat AI. `SkyWindDirector` controls the atmosphere, not individual opponents.

It produces coherent global phases such as calm drift, directional transition, sustained crosswind, gust envelope and recovery. Phase transitions must be gradual enough that the whole field visibly reorganizes instead of snapping.

The director may influence:

- dominant wind direction and speed;
- smooth gust intensity;
- small persistent vertical component;
- low-frequency local variation by position/depth;
- bounded arena-level turbulence driven partly by live engagement.

It must not:

- select an enemy;
- calculate a preferred opponent pair;
- push one kite toward a named kite;
- create synthetic line contact;
- write kite coordinates directly.

Each kite starts with different phase/depth/physical parameters, so the same global wind does not make all kites move in sync. Body separation may prevent visual body overlap, but it must never repel lines from crossing.

## 5. Comment interaction: `CommentGestureEngine`

Comments are not fixed commands. `1`, `2`, `3`, `puxar`, `soltar` and similar text are treated as ordinary comments unless a separate admin/debug mode explicitly enables legacy controls.

For an active player's kite, a valid comment is transformed into a short physical gesture using:

- normalized comment text;
- user identity seed;
- current wind vector;
- current spool/slack/tension state;
- current kite attitude and velocity;
- nearby line-density information at coarse resolution;
- engagement score and anti-spam state.

The result is a bounded intent envelope such as `spoolCommand`, `debicoTorque`, `trimPitch`, `tensionAssist`, duration and intensity. Typical duration is 0.3â€“2.0 seconds.

The engine may bias a gesture toward a reachable region with more line traffic, but it never selects a player. Its purpose is to increase the chance of a useful crossing while preserving physical uncertainty.

Comment quality means useful live engagement, not grammar quality. Scoring may consider useful length, word diversity, novelty versus recent comments, reactions/emojis and non-spam participation. No external LLM call is allowed in the 60 Hz or per-comment hot path.

## 6. Crowd engagement: `CrowdEnergy`

All accepted comments also contribute to a bounded global engagement signal:

`CrowdEnergy âˆˆ [0, 1]`

It rises with unique, non-spam participation and decays smoothly with time. It may modulate only arena-level parameters such as gust amplitude, wind-transition cadence and flight variability within safe bounds.

`CrowdEnergy` must not:

- add damage;
- change material tier;
- force contact;
- bypass per-kite physical controls;
- grow without saturation.

A chat burst therefore makes the sky feel more active without turning comments into direct combat damage.

## 7. Gift behavior: `GiftManeuverAI`

A gift temporarily enables intelligent piloting for the receiving kite. This is the only normal subsystem allowed to plan a multi-step maneuver.

It does not choose a victim. It searches for a physically reachable path through high line-density space while respecting current wind, attitude, spool state, tension, arena bounds and maneuver duration.
For a retÃ£o, the planning sequence is conceptually:

1. sample current wind and coarse line-density field;
2. score a small fixed set of reachable headings/corridors;
3. choose the corridor with the best expected line-crossing opportunity, not a named opponent;
4. release enough line to gain angular freedom;
5. apply attitude torque/trim;
6. recover tension and pull;
7. let `KiteDynamics` and `RopePhysics` determine the actual trajectory.

Other gift maneuvers use the same rule: plan controls, never coordinates. Mergulho scores descending corridors; laÃ§ada scores curved/high-density corridors; aparada prepares tension for nearby incoming line traffic.

When the maneuver expires, control returns automatically to wind + normal comment influence.

The existing gift-value/economy layer resolves which virtual material buff, duration and maneuver are granted. `GiftManeuverAI` consumes that resolved effect and does not calculate TikTok coin economics itself.

## 8. `LineDensityField`

Gift and comment assistance need spatial awareness without O(NÂ²) target logic. A coarse 3D density field is built from existing rope segments at a low update rate.

The implementation should reuse broad-phase-compatible spatial information where practical. A small fixed grid or spatial hash is sufficient; it must not allocate per segment every frame.
The field stores only what maneuver planning needs: line-segment density and optional local direction/tension summaries. It never awards damage or declares contact.

Actual relinho remains exclusively:

`LineBroadPhase -> RopeCollision/NarrowPhase -> LineContactManager -> LineAbrasionModel -> LineBreakSystem`

A path may cross a dense cell yet produce zero damage if the lines never enter true 3D contact radius.

## 9. No canned kite animation

Kite motion and pose must be derived from simulated state. No gift or comment may play a pre-authored movement trajectory that overrides physics.

Visual systems may render particles, labels, glow, trails, hit sparks and camera feedback, but they are observers. They cannot write `x/y/z`, velocity, rope nodes, line HP or cut state.

The visible 'animation' of flight must emerge from wind, attitude, inertia, spool, tension and rope constraints.

## 10. Physics authority

`KiteDynamics` remains authority over position, velocity and attitude. `RopePhysics` remains authority over spool length, slack, tension and rope geometry. The renderer follows those states.

Line contact is valid only from real 3D geometry. Screen-space crossings are decorative unless narrow-phase confirms proximity in X/Y/Z.

Material abrasion, sliding velocity, tension, direction, sustained structural overload and localized segment wear remain separate physical inputs that converge only at line failure.

## 11. Data flow

Normal frame:

`SkyWindDirector -> wind field`

`Comment/Gift processing -> PlayerIntentController -> per-kite intent`

`wind field + per-kite intent -> KiteDynamics -> RopePhysics -> line-contact pipeline -> render`

Comment path:

`comment -> spam/identity validation -> engagement score -> CommentGestureEngine -> bounded physical intent -> PlayerIntentController -> physics`

Gift path:

`gift -> existing canonical gift/value resolution -> temporary material/effect -> GiftManeuverAI -> LineDensityField + wind/state sampling -> intent sequence -> PlayerIntentController -> physics`

Contact path:

`rope geometry -> broad phase -> 3D narrow phase -> tracked contact -> relative sliding/tension/material -> abrasion/fatigue -> localized break -> canonical cut flow`

TikTok input never bypasses the physical line-contact pipeline.

## 12. Failure and overload behavior

All new assistance is fail-soft. If `LineDensityField`, comment parsing or gift planning fails, the kite continues under ordinary wind and physics.

Under heavy chat load:

- coalesce repeated comments per user inside a short window;
- bound per-kite pending gesture count;
- saturate `CrowdEnergy` instead of accumulating unbounded work;
- process gesture generation outside the fixed 60 Hz physics loop.

Under heavy gift load:

- preserve canonical gift ordering/idempotency;
- one active maneuver controller owns the kite at a time;
- additional gift effects are queued/merged according to the existing gift rules rather than spawning parallel physics controllers.

`LineDensityField` updates at a lower cadence than physics and reuses fixed storage. Stale density information is acceptable for maneuver planning; stale information may reduce effectiveness but must never affect contact correctness.

## 13. Migration from current implementation

Keep Tasks 1â€“7 of the current physical-kite-line work unless a test proves a targeted correction is required.

The current `LiveCombatDirector` direction from Task 8 is superseded. Remove opponent/pair-oriented encounter steering and replace its arena responsibility with `SkyWindDirector` plus optional body-separation only.
`PlayerIntentController`, `SpoolController`, `KiteAttitude`, `KiteAerodynamics`, `KiteDynamics`, `RopePhysics`, material mechanics, structural fatigue, broad/narrow phase and abrasion remain the physical execution stack.

Legacy exact chat commands may remain only as admin/debug compatibility; they are not the live-player interaction model.

This specification supersedes the normal-combat and `LiveCombatDirector` assumptions in the earlier live-assisted design and current physical-kite-line plan. Economy/profile persistence remains governed by its separate specification.

## 14. Test strategy

TDD is required for every new boundary.

Unit/contract tests must prove:

- `SkyWindDirector` never references an opponent or writes kite coordinates;
- wind phases are coherent, smooth and deterministic under a fixed seed;
- different kite seeds do not synchronize into one trajectory;
- `CommentGestureEngine` accepts arbitrary useful comments and does not require magic command text;
- comment gestures are finite, bounded, deterministic enough for replay and never modify line integrity directly;
- anti-spam and `CrowdEnergy` remain bounded under burst load;
- `GiftManeuverAI` scores spatial corridors without player-target selection;
- gift plans emit only physical intents;
- screen-space X with large Z separation produces no relinho;
- true 3D contact still feeds the existing abrasion/material/break pipeline.
Integration tests must prove:

- normal wind alone creates recurring physical crossing opportunities with no target steering;
- comments can alter a player's trajectory enough to create a new crossing opportunity without teleportation;
- a gift maneuver can traverse multiple independent line contacts in one pass if geometry allows;
- if a planned path misses in Z, no wear is produced;
- after maneuver expiry, control returns cleanly to wind-driven flight;
- multiple simultaneous gifts do not create parallel controllers for one kite.

Pacing targets for the standard live preset:

- 40 active kites: after warm-up, at least one real geometric contact should occur within a 10-second rolling window;
- 15â€“20 active kites: at least one real geometric contact opportunity within 15 seconds;
- no requirement that a contact causes a cut; material and physics remain authoritative.

Performance gates remain unchanged or stricter: 40 kites, no uncaught exceptions, 60 Hz physics target, `maxTracked <= 12`, `maxSolved <= 3`, no unbounded allocations, and browser benchmark budgets must not be loosened to make the feature pass.

## 15. Acceptance criteria

The design is complete when a viewer can watch a vertical TikTok arena and understand that the whole sky is alive because of wind, not scripted animations; comments visibly nudge individual kites; gifts produce clearly smarter temporary maneuvers; and every relinho/cut can still be traced to actual 3D line contact and existing physical material rules.

## 16. Out of scope for this specification

This design does not redefine:

- persistent user/profile/avatar storage;
- TikTok coin-to-buff economy and marketplace pricing;
- custom kite ownership/skins;
- OBS layout redesign unrelated to physical combat;
- real-world material recipes or construction guidance.

Those systems may consume the physical interfaces defined here but must remain separate.

## 17. Existing implementation checkpoint

The current branch already contains the approved physical foundations from Tasks 1â€“7 and an interim Task 8 implementation. The implementation plan must replace only the superseded encounter-steering behavior, preserving verified physics.

The interrupted Task 9 browser benchmark also exposed a structural-load normalization issue: material `maxTension` must genuinely reduce `loadRatio` under the same physical load. That correction must be completed and covered by regression tests before final performance verification.

No benchmark budget may be relaxed as part of that correction.
