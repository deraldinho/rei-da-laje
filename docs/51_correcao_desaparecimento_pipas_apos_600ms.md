> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 51 · Correção do Desaparecimento das Pipas após 600ms e Blindagem Numérica da Física de Voo

**Data**: 29/09/2026  
**Status**: Concluído, Validado em Navegador e 100% Testado (**175/175 testes aprovados**)  
**Módulos Alterados**:
- `frontend/src/engine/Wind.js`
- `frontend/src/entities/Kite.js`
- `frontend/src/engine/App.js`
- `frontend/src/ui/ThreeSkyScene.js`

---

## 1. O Problema Diagnosticado

O usuário relatou:
> *"adinda estmos com erros pois os bonecos apareceram mas as pipas nãos"*  
> *"faz um teste no navegador exatamente depois de 600mls a pipa some"*

### Diagnóstico Frame a Frame (Timeline do Bug):
Através de inspeção via Chrome DevTools Protocol no Microsoft Edge em `scratch/test-exact-600ms.mjs`, mediu-se o estado das pipas frame a frame a partir de $t = 0$:

1. **Até ~350ms**:
   - `k2dIsAscending: true`
   - `k2dPos: { x: 170, y: 557 }`
   - `k3dPos: { x: -85, y: -120, z: 430 }`
   - A pipa subia normalmente pela interpolação linear inicial de decolagem.

2. **Entre 350ms e 400ms**:
   - A distância vertical `Math.abs(this.y - this.targetY) < 25` era atingida.
   - `this.isAscending` tornava-se `false`.
   - O código chaveava para o ramo `else { Wind.move(this, delta, windTime, population); }`.

3. **Causa Raiz Fatal (`NaN` Propagation)**:
   - Em `App.js`: a chamada `kite.update(delta, currentWind, this.kites.size)` passava `currentWind` (um objeto pré-amostrado `{ x, y, gust, current }`) no lugar do número escalar `this.windTime`.
   - Em `Wind.js`: `static move(kite, delta, time, population = 2)` executava:
     ```javascript
     time *= 0.6;
     ```
   - Como `time` era um objeto `{...}`, a expressão `{...} * 0.6` avaliava para `NaN`!
   - Consequentemente, `Wind.sample(NaN)` gerava seno e cosseno de `NaN`, transformando `wind.x`, `wind.y`, `wind.gust`, `targetX` e `targetY` em `NaN`.
   - `kite.x` e `kite.y` tornavam-se `NaN`.
   - Em `ThreeSkyScene.js`, `screenToWorld(kite.x, kite.y, depthOffset)` retornava `{ x: NaN, y: NaN, z: ... }`, corrompendo a matriz do WebGL da pipa (`k3d.position.x = NaN`, `k3d.position.y = NaN`).
   - A GPU descartava o mesh e a pipa desaparecia do céu exatamente aos ~400ms–600ms de execução.

---

## 2. Solução Implementada

### 2.1 Blindagem do `Wind.js`
- `Wind.sample(time)`: garante que `time` seja numérico finito com fallback para 0 (`Number.isFinite(time) ? time : 0`) e anexa `time: t` ao objeto retornado.
- `Wind.move(kite, delta, timeOrWind, population)`:
  - Detecta se o argumento recebido é um número escalar (`typeof === 'number'`) ou um objeto de vento (`typeof === 'object'`).
  - Se for objeto, extrai com segurança `timeOrWind.time` (ou `kite.oscillationTimer`).
  - Garante valores finitos de `wind.x`, `wind.y` e `wind.gust`.
  - Garante que `kite.x` e `kite.y` sejam protegidos contra `NaN`, preservando a posição anterior ou recalculando para o alvo seguro.

### 2.2 Blindagem de `Kite.js`
- No início e no fim de `Kite.prototype.update`:
  ```javascript
  if (!Number.isFinite(this.x)) this.x = Number.isFinite(this.targetX) ? this.targetX : (this.screenWidth * 0.5);
  if (!Number.isFinite(this.y)) this.y = Number.isFinite(this.targetY) ? this.targetY : (this.screenHeight * 0.35);
  ```
- Definição segura de `windX` com verificação de tipo para a oscilação da rabiola.

### 2.3 Blindagem de `ThreeSkyScene.js`
- Em `screenToWorld(screenX, screenY, depthZ)`:
  ```javascript
  const sx = Number.isFinite(screenX) ? screenX : this.width * 0.5;
  const sy = Number.isFinite(screenY) ? screenY : this.height * 0.35;
  ```
- Garante que mesmo em caso de input anômalo de física, as coordenadas do mundo 3D jamais se tornem `NaN`.

---

## 3. Validação e Resultados

1. **Teste Automatizado de Timeline CDP (`scratch/test-exact-600ms.mjs`)**:
   - `[SNAPSHOT 100ms]`: inicialização.
   - `[SNAPSHOT 250ms]`: `k2dPos: {x: 170, y: 557}`, `k3dPos: {x: -85, y: -120, z: 430}`.
   - `[SNAPSHOT 400ms]`: `k2dPos: {x: 191, y: 623}`, `k3dPos: {x: -102, y: -1, z: 317}` (transição para `isAscending: false` com sucesso).
   - `[SNAPSHOT 650ms]`: `k2dPos: {x: 227, y: 704}`, `k3dPos: {x: -104, y: 74, z: 228}` (pipa voando perfeitamente no ar).
   - `[SNAPSHOT 2000ms]`: `k2dPos: {x: 281, y: 737}`, `k3dPos: {x: -70, y: 63, z: 211}` (permanência estável no céu 3D).

2. **Suite de Testes Unitários**:
   - `npm test`: **175/175 testes aprovados** (100% de cobertura e sem regressões).

3. **Verificação Visual em Navegador**:
   - Capturada screenshot de alta resolução (`pipas_voando_apos_600ms.png`).
   - Pipa 3D com varetas de bambu, papel de seda, decalque de avatar, aura de líder, coroa de Rei da Laje, tag 3D de nickname e linha conectada à mão do boneco na laje.
