# 3D Render Pooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manter toda a arena e o pós-corte em 3D, eliminando criação/destruição WebGL durante a live por meio de pools fixos e prewarm real.

**Architecture:** Um `ActiveVisualPool` de 48 slots reutiliza pipa, boneco e linha 3D; pools separados continuam responsáveis por Flyaway e BrokenRope. Texturas de identidade pertencem aos slots, são redesenhadas sem invalidar materiais, e todos os recursos são realmente desenhados durante o prewarm antes do gameplay.

**Tech Stack:** JavaScript ES modules, Three.js 0.186.1, Vite 5, Node test runner, Edge CDP/SwiftShader.

**Spec:** `docs/superpowers/specs/2026-10-01-3d-render-pooling-design.md`

## Global Constraints

- Capacidade fixa: 48 slots por família de recursos 3D.
- Nenhum `new Mesh`, `new Material`, `new BufferGeometry` ou `dispose()` no caminho crítico de `game:cut_occurred`.
- `game:cut_occurred` continua sendo a única confirmação de eliminação.
- Física XPBD, colisão, TikTok, presentes, manobras, aparo, ranking e regras não mudam.
- Não criar branch paralela nem segunda arquitetura; trabalhar em `main` preservando o working tree existente.
- TDD obrigatório e commit pequeno ao fim de cada tarefa GREEN.

## Review Focus

- Reuso de slot após corte não pode deixar foto, nome, HP, coroa, buff ou linha do usuário anterior.
- Callback atrasado de avatar do usuário anterior não pode sobrescrever o slot já reutilizado.
- Pool lotado não pode criar um 49º slot nem expulsar participante ativo.
- Flyaway ainda elegível para aparo não pode ser roubado ao faltar slot livre.
- Reset lógico da arena não pode chamar `dispose()`; `destroy()` final precisa liberar tudo exatamente uma vez.

---
### Task 1: Pool genérico de slots ativos

**Files:**
- Create: `frontend/src/ui/three/ActiveVisualPool.js`
- Create: `tests/active-visual-pool.test.cjs`

**Interfaces:**
- Produces: `new ActiveVisualPool({ capacity, createSlot, resetSlot, disposeSlot })`
- Produces: `acquire(userId) -> slot | null`, `release(userId) -> slot | null`, `get(userId)`, `dispose()`.
- Produces: propriedades `slots`, `active`, `capacity`, `freeCount`.

- [ ] **Step 1: Write failing tests** para capacidade 48, reuso do mesmo slot, limpeza ao liberar, aquisição idempotente e falha segura no 49º usuário.
- [ ] **Step 2: Run RED:** `node --test tests/active-visual-pool.test.cjs`; esperado: módulo/classe inexistente.
- [ ] **Step 3: Implement minimal pool** sem dependência de Three.js; slots são criados somente no construtor e nunca durante `acquire()`.
- [ ] **Step 4: Run GREEN:** `node --test tests/active-visual-pool.test.cjs`; esperado: todos PASS.
- [ ] **Step 5: Commit:** `feat(render): add fixed active visual pool`.
### Task 2: Texturas mutáveis e identidade segura

**Files:**
- Modify: `frontend/src/ui/three/ThreeMaterials.js`
- Create: `tests/three-reusable-textures.test.cjs`

**Interfaces:**
- Produces: `createReusableKitePaperTexture() -> THREE.CanvasTexture`.
- Produces: `paintReusableKitePaperTexture(texture, primaryColorHex, secondaryColorHex, patternIndex) -> void`.
- Produces: `createReusableKiteDecalTexture() -> THREE.CanvasTexture`.
- Produces: `paintReusableKiteDecalTexture(texture, identity, generation, isCurrent) -> void`.

- [ ] **Step 1: Write failing tests** comprovando que o objeto `Texture` permanece o mesmo, somente `texture.needsUpdate` muda e callback atrasado de avatar é ignorado quando `isCurrent(generation)` retorna falso.
- [ ] **Step 2: Run RED:** `node --test tests/three-reusable-textures.test.cjs`.
- [ ] **Step 3: Implement painters** reutilizando o mesmo canvas; não usar `material.needsUpdate` por mudança de conteúdo.
- [ ] **Step 4: Run GREEN** e também `node --test tests/three-memory-optimizations.test.cjs`.
- [ ] **Step 5: Commit:** `feat(render): reuse player identity textures`.
### Task 3: Slot 3D completo e reconfigurável

**Files:**
- Create: `frontend/src/ui/three/ActiveVisualSlot3D.js`
- Modify: `frontend/src/ui/three/ThreeKites.js`
- Modify: `frontend/src/ui/three/ThreeCharacters.js`
- Modify: `frontend/src/ui/three/ThreeLines.js`
- Create: `tests/active-visual-slot-3d.test.cjs`

**Interfaces:**
- Produces: `createActiveVisualSlot3D(index, groups) -> slot`.
- Produces: `configureActiveVisualSlot3D(slot, userId, kite, time) -> slot`.
- Produces: `resetActiveVisualSlot3D(slot) -> void` e `disposeActiveVisualSlot3D(slot) -> void`.
- Produces: `configureKiteModelType3D(model, type, patternIndex) -> void` com tipos `tradicional`, `raia`, `peixinho`.

- [ ] **Step 1: Write failing tests** para reset de HP/coroa/escudo/tornado/rotação/linha, troca entre os três tipos sem criar geometria nova, identidade nova sem resíduo e componentes sempre anexados aos grupos.
- [ ] **Step 2: Run RED:** `node --test tests/active-visual-slot-3d.test.cjs`.
- [ ] **Step 3: Implement slot fixo** com uma pipa reconfigurável, um boneco e uma linha; pré-alocar capacidade máxima de rabiola e usar `drawRange`/visibilidade para cada tipo.
- [ ] **Step 4: Expor materiais mutáveis do boneco** (`skinMat`, `shortsMat`, `capMat`, `shirtMat`) em `userData` para reuso sem recriação.
- [ ] **Step 5: Run GREEN** mais testes 3D existentes de âncora, HP, presentes e manobras.
- [ ] **Step 6: Commit:** `feat(render): add reusable 3d participant slots`.
### Task 4: Integrar o pool ativo ao `ThreeSkyScene`

**Files:**
- Modify: `frontend/src/ui/ThreeSkyScene.js`
- Modify: `tests/three-memory-optimizations.test.cjs`
- Create: `tests/three-active-pool-integration.test.cjs`

**Interfaces:**
- `ThreeSkyScene.activeVisualPool: ActiveVisualPool`.
- `ThreeSkyScene.acquireActiveVisual(userId, kite) -> slot | null`.
- `ThreeSkyScene.releaseActiveVisual(userId) -> slot | null`.

- [ ] **Step 1: Write failing tests** provando que `syncEntities()` usa slots pré-criados, mapas ativos apontam para os componentes do slot, e a remoção de usuário só oculta/libera sem `dispose()`.
- [ ] **Step 2: Add review-focus tests**: com 48 ativos, o 49o nao cria slot nem objetos WebGL; reset logico nao chama `dispose()`; `destroy()` final libera cada slot exatamente uma vez.
- [ ] **Step 3: Run RED:** `node --test tests/three-active-pool-integration.test.cjs tests/three-memory-optimizations.test.cjs`.
- [ ] **Step 4: Instantiate 48 slots** em `initSubsystems()` e ligar `kites3D`, `players3D` e `lines3D` somente aos usuários ativos.
- [ ] **Step 5: Replace inactive cleanup** por `releaseActiveVisual()`; remover `_deferDispose()` do caminho normal de corte/saída/reset.
- [ ] **Step 6: Run GREEN** e a suíte unitária completa.
- [ ] **Step 7: Commit:** `refactor(render): pool active 3d participants`.
### Task 5: Flyaway/BrokenRope com captura de aparência e capacidade segura

**Files:**
- Modify: `frontend/src/ui/three/FlyawayKite3DPool.js`
- Modify: `frontend/src/ui/three/ThreeLines.js`
- Modify: `frontend/src/ui/ThreeSkyScene.js`
- Modify: `tests/flyaway-kite-3d-pool.test.cjs`

**Interfaces:**
- Produces: `FlyawayKite3DPool.captureAppearance(target, activeSlot) -> void` usando cópia de canvas, nunca compartilhando textura mutável com o slot ativo.
- `acquireFlyaway(id, flyaway, appearance)` retorna `null` se todos os 48 slots ainda estiverem elegíveis/visíveis e nenhum puder ser reaproveitado com segurança.

- [ ] **Step 1: Write failing tests** para captura independente de paper/decal, preservação após reuso do slot ativo e proteção de Flyaway ainda aparável.
- [ ] **Step 2: Write failing BrokenRope test** para capacidade fixa, reuso e ausência de alocação após construção.
- [ ] **Step 3: Run RED:** `node --test tests/flyaway-kite-3d-pool.test.cjs`.
- [ ] **Step 4: Implement canvas copy** para Flyaway e política de reaproveitamento apenas de item liberado/expirado.
- [ ] **Step 5: Implement BrokenRope fail-closed** sem roubar uma linha rompida ainda ativa.
- [ ] **Step 6: Run GREEN** e regressões de aparo/corte canônico.
- [ ] **Step 7: Commit:** `fix(render): preserve pooled cut visuals`.
### Task 6: Prewarm por draw real de todos os pools

**Files:**
- Modify: `frontend/src/ui/ThreeSkyScene.js`
- Create: `tests/three-prewarm-pools.test.cjs`
- Modify: `tests/browser-cut-perf-40.mjs`

**Interfaces:**
- Produces: `ThreeSkyScene.prewarmVisualPools() -> void`.
- O método cobre 48 slots ativos, 48 Flyaways, 48 BrokenRopes e variantes de pipa `tradicional`, `raia`, `peixinho` antes do gameplay.

- [ ] **Step 1: Write failing source/integration tests** que exigem draw real do renderer, restauracao de todos os itens para `visible=false` e fallback seguro quando o prewarm lanca erro sem derrubar a live.
- [ ] **Step 2: Run RED:** `node --test tests/three-prewarm-pools.test.cjs`.
- [ ] **Step 3: Implement prewarm** depois de `setTheme()`: tornar os recursos temporariamente desenháveis, executar render controlado, restaurar estado neutro e marcar `_visualPoolsPrewarmed=true`.
- [ ] **Step 4: Run GREEN** e build de produção.
- [ ] **Step 5: Run browser cut benchmark**; esperado: nenhum programa WebGL novo após prewarm, pools continuam em 48 e cada um dos 5 renders pós-corte fica <= 300 ms no SwiftShader.
- [ ] **Step 6: Commit:** `perf(render): prewarm all 3d visual pools`.

### Task 7: Gates finais, limpeza e documentação

**Files:**
- Modify: `tests/verify.mjs`
- Modify: `package.json` se necessário apenas para gate permanente.
- Delete: `tests/.tmp-cut-prewarm-probe.mjs`, `tests/.tmp-cut-no-dispose-probe.mjs`, `tests/.tmp-cut-all-prewarm-no-dispose-probe.mjs`.
- Update: `docs/superpowers/specs/2026-10-01-3d-render-pooling-design.md` com checkpoint final medido.

- [ ] **Step 1: Add `test:cut-perf` to `verify.mjs`** antes do benchmark geral de 40 pipas.
- [ ] **Step 2: Run fresh unit suite:** `npm run test:unit`; esperado: 100% PASS.
- [ ] **Step 3: Run build + browser smoke + cut perf + 40-kite perf + soak** com bundle recém-gerado.
- [ ] **Step 4: Confirm memory bounds**: slots/pools não crescem após entradas, cortes, resets e 5 cortes consecutivos.
- [ ] **Step 5: Remove temporary probes only after permanent benchmark is GREEN** e verificar `git status` para não apagar WIP alheio.
- [ ] **Step 6: Commit:** `test(render): gate pooled 3d cut performance`.
- [ ] **Step 7: Final review** do diff e dos resultados antes de declarar a correção concluída.
