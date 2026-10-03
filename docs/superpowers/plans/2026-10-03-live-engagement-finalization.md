# Live Engagement Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fazer toda interaÃ§Ã£o vÃ¡lida da TikTok Live criar/movimentar a pipa do autor, reservar poderes especiais a presentes realmente mapeados, manter a linha tensionada pelo vento e remover manobras automÃ¡ticas de bots.

**Architecture:** O backend normaliza todos os eventos da Live em um Ãºnico contrato `competition:interaction`, usando o mesmo fluxo canÃ´nico de entrada/fila. O frontend converte esse contrato em envelopes fÃ­sicos limitados no `LiveInputBuffer`; presentes vÃ¡lidos acrescentam a manobra especial existente. Vento/corda continuam autoridades fÃ­sicas e o pipeline de relinho/corte permanece inalterado.

**Tech Stack:** Node.js CommonJS backend, Socket.IO, ES modules no frontend, Pixi/Three, `node:test`, Vite.

**Spec:** `docs/superpowers/specs/2026-10-03-live-engagement-finalization-design.md`

## Global Constraints

- Qualquer comentÃ¡rio, like/tap, share, follow ou gift cria a pipa se necessÃ¡rio.
- Toda interaÃ§Ã£o movimenta somente a pipa do autor atravÃ©s de intenÃ§Ã£o fÃ­sica.
- Gift = pulso normal + manobra especial somente quando houver mapeamento funcional.
- Sem escrita direta de `x/y/z`, HP, wear ou corte a partir de evento TikTok.
- Sem piloto de combate automÃ¡tico para bots.
- Linha com vento operacional deve permanecer funcionalmente tensionada, sem eliminar barriga visual.
- Preservar 60 Hz, 40 pipas, `maxTracked <= 12`, `maxSolved <= 3` e orÃ§amento de benchmark existente.

## Review Focus

- Eventos sem `userId` estÃ¡vel nÃ£o podem criar jogador fantasma.
- Rajadas de likes precisam ser coalescidas/saturadas e nÃ£o criar uma aÃ§Ã£o por tap.
- UsuÃ¡rio em fila recebe atividade registrada, mas nÃ£o movimento fÃ­sico atÃ© efetivamente spawnar.
- Gift desconhecido deve continuar gerando participaÃ§Ã£o bÃ¡sica sem anunciar poder inexistente.
- Vento quase zero deve permitir relaxamento; piso de tensÃ£o sÃ³ vale com vento operacional.

---### Task 1: Unificar entrada e interaÃ§Ã£o da Live no backend

**Files:**
- Modify: `backend/rules/GameRules.js`
- Modify: `backend/tiktokService.js`
- Modify: `backend/tiktokWorkerSupervisor.js`
- Test: `tests/live-engagement-entry.test.cjs`
- Update: `tests/follow-event.test.cjs`
- Update: `tests/like-despike.test.cjs`

**Interfaces:**
- Produces: `GameRules.handlePlayerInteraction(userData)`; `TikTokService.ensurePlayerForInteraction(data, interactionType)`; Socket.IO `competition:interaction` payload `{userId,nickname,type,count,status}`.
- Consumes later: Task 2 listens to `competition:interaction`.

- [x] **Step 1: Write failing tests** proving like, share, follow and gift can spawn a user, existing users remain active, queue semantics are preserved, and worker forwards `share` with identity.
- [x] **Step 2: Run the focused tests and verify RED** because generic interaction entry/share gameplay do not exist yet.
- [x] **Step 3: Implement `handlePlayerInteraction`** by extracting the existing canonical spawn/queue logic; keep `handlePlayerComment` as compatibility alias.
- [x] **Step 4: Implement backend event normalization** so chat/like/share/follow/gift all call the same ensure-entry helper and emit one bounded `competition:interaction` event for spawned/active users.
- [x] **Step 5: Preserve replay/profile/gift accounting** and do not emit movement for queue-only users.
- [x] **Step 6: Run focused tests GREEN, then `npm test` GREEN.**
- [x] **Step 7: Commit** `feat(live): unify engagement entry events`.

### Task 2: Transformar toda interaÃ§Ã£o em movimento fÃ­sico

**Files:**
- Create: `frontend/src/engine/physics/InteractionGestureEngine.js`
- Modify: `frontend/src/engine/physics/LiveInputBuffer.js`
- Modify: `frontend/src/engine/App.js`
- Test: `tests/live-engagement-motion.test.cjs`
- Update: `tests/live-input-comment-gesture.test.cjs`
- Update: `tests/like-despike.test.cjs`

**Interfaces:**
- Consumes: Task 1 `competition:interaction`.
- Produces: `createInteractionGesture({type,count,userId,kite,wind})`; `LiveInputBuffer.addInteraction(type,count,context)`.

- [x] **Step 1: Write failing tests** for comment/like/share/follow/gift pulses, author isolation, bounded queue, like coalescing and no automatic `despicar` from likes.
- [x] **Step 2: Verify RED.**
- [x] **Step 3: Implement deterministic bounded interaction envelopes** using only spool/trim/torque/tension intent fields.
- [x] **Step 4: Wire `App.js`** to consume `competition:interaction`; keep visual like/follow feedback but remove free special maneuvers from like/follow.
- [x] **Step 5: Verify focused tests GREEN and run `npm test`.**
- [x] **Step 6: Commit** `feat(gameplay): move kite on every live interaction`.### Task 3: Garantir que sÃ³ poderes funcionais sejam anunciados/executados

**Files:**
- Modify: `backend/tiktokService.js`
- Modify: `frontend/src/engine/Maneuvers.js`
- Modify: `frontend/src/engine/App.js`
- Modify or remove scheduling use: `backend/simulationBotPilot.js`, `backend/server.js`
- Test: `tests/gift-functional-power-gate.test.cjs`
- Update: `tests/simulation-bot-pilot.test.cjs`

**Interfaces:**
- Consumes: gift normalization from Task 1.
- Produces: special maneuver event only for names accepted by the existing maneuver map; unknown/unimplemented powers remain no-op beyond the base interaction pulse.

- [x] **Step 1: Write failing tests** proving unknown/nonfunctional power names do not activate a maneuver or HUD power, while mapped gifts still do.
- [x] **Step 2: Write failing bot test** proving idle simulation bots emit zero `competition:maneuver` events.
- [x] **Step 3: Verify RED.**
- [x] **Step 4: Add a functional maneuver gate** shared by gift handling/consumer logic without changing physical maneuver implementations that already pass tests.
- [x] **Step 5: Remove automatic simulation maneuver scheduling**; bots move only from wind and explicit simulated Live events.
- [x] **Step 6: Run focused tests GREEN and `npm test` GREEN.**
- [x] **Step 7: Commit** `fix(gameplay): disable automatic and nonfunctional powers`.

### Task 4: Manter a linha tensionada pelo vento sem matar a barriga

**Files:**
- Modify: `frontend/src/engine/physics/RopePhysics.js`
- Test: `tests/wind-line-tension-floor.test.cjs`
- Update: `tests/kite-tether-wind-physics.test.cjs`
- Update as needed: `tests/line-material-structural.test.cjs`

**Interfaces:**
- Produces: dynamic aerodynamic tension floor derived from operational wind magnitude and existing line direction/load.
- Consumes: existing local wind passed to `RopePhysics.step`.

- [x] **Step 1: Write failing tests** for slack line + normal wind maintaining operational tension, aligned wind maintaining tension, and near-zero wind allowing relaxation.
- [x] **Step 2: Verify RED against the stricter new floor.**
- [x] **Step 3: Implement minimal dynamic wind floor** after aerodynamic load calculation; it must not modify spool length, wear or structural failure directly.
- [x] **Step 4: Verify sag remains visible** by asserting strain/slack can stay below taut geometry while tension remains operational.
- [x] **Step 5: Run rope/structural suites GREEN, then `npm test`.**
- [x] **Step 6: Commit** `fix(physics): keep kite line tensioned by wind`.

### Task 5: SimulaÃ§Ã£o fiel e validaÃ§Ã£o para abrir a Live

**Files:**
- Modify as required: `backend/server.js`
- Test: `tests/live-engagement-end-to-end.test.cjs`
- Update: `tests/simulation-admin-bots.test.cjs`
- Evidence: `tests/evidence/live-engagement-finalization.json`

**Interfaces:**
- Consumes: Tasks 1â€“4.
- Produces: admin simulation routes/events that traverse the same production handlers for comment/like/share/follow/gift; no bot-only gameplay path.

- [x] **Step 1: Write failing integration test** with five simulated users whose first interaction types differ and verify all enter, all interaction types create physical intent, gifts alone add specials, and idle bots emit no specials.
- [x] **Step 2: Add/adjust admin simulation hooks only where needed** to exercise share/follow through canonical handlers.
- [x] **Step 3: Run integration tests GREEN.**
- [x] **Step 4: Run full `npm test` and require zero failures.**
- [x] **Step 5: Run `npm run build`.**
- [x] **Step 6: Run `npm run test:perf` and preserve existing 40-kite budgets (`p95 <= 40ms`, `p99 <= 80ms`, `max <= 250ms`, tracked/solved caps unchanged).**
- [x] **Step 7: Save evidence JSON and run a runtime health/smoke check without resetting a real active Live.**
- [x] **Step 8: Commit** `test(live): validate engagement gameplay end to end`.
