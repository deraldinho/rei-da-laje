> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Correção do Travamento das Pipas ao Disparar Manobras no Painel Admin

**Data:** 29/09/2026  
**Status:** Resolvido e Validado (178/178 testes passando)

---

## 1. Contexto do Problema

Ao utilizar o painel de administração (`/admin.html`) para disparar manobras especiais ("Disparar Manobra Especial: Retão Paulista, Mergulho, Despicada, Relo Lateral, Voadora") em um participante selecionado, as pipas na arena congelavam ou ficavam travadas na tela.

---

## 2. Diagnóstico e Causa-Raiz

Foram identificadas duas causas principais para o travamento:

### 2.1. Exceção fatal não tratada derrubando o PixiJS Ticker (`TypeError: null.startsWith`)
1. No `admin.html`, o select de manobras enviava o identificador direto da manobra (ex: `'retao'`, `'despicada'`, `'voadora'`) através do payload:
   ```javascript
   socket.emit('admin:trigger_maneuver', { userId, maneuver: selectedManeuver });
   ```
2. O servidor retransmitia como `competition:maneuver` com `{ userId, giftName: maneuver }`.
3. No frontend (`App.js`), a função `selectGiftManeuver(giftName)` mapeava presentes (ex: `'Rosa'`, `'Donut'`), mas retornava `null` para nomes diretos de manobras como `'retao'`, `'despicada'`, etc.
4. Ao invocar `maneuverStats(null)`, o objeto de manobra era retornado com `name: null`.
5. Em `Kite.js` (`updateManeuverVisual` e `update`) e em `Maneuvers.js`, o código executava:
   ```javascript
   if (this.maneuver.name.startsWith('aparar')) { ... }
   ```
6. O acesso a `.startsWith` em `null` lançava `TypeError: Cannot read properties of null (reading 'startsWith')`. Como essa chamada ocorria no loop principal do PixiJS (`app.ticker`), a exceção interrompia o loop de renderização de toda a aplicação, **congelando imediatamente todas as pipas na tela**.

### 2.2. Armadilhas cinemáticas de oscilação em `applyManeuverMovement`
1. Manobras como `'retao'`, `'mergulho'` e `'relo_lateral'` recalculavam a direção `dir` a cada frame comparando a posição atual com um alvo:
   ```javascript
   const dir = target ? Math.sign(target.x - kite.x) : ...
   ```
2. Se a pipa estivesse a menos de `speed * dt` do alvo ou na metade da tela, a cada frame a direção invertia entre `+1` e `-1`, prendendo a pipa em uma oscilação de 1 pixel (vibração estática).
3. O `'mergulho'` forçava velocidade puramente vertical descendente sem transição de saída, cravando a pipa no horizonte da laje.

---

## 3. Soluções Implementadas

### 3.1. Suporte a Nomes Diretos e Blindagem contra Nulo
- **`frontend/src/engine/Maneuvers.js`**:
  - `selectGiftManeuver(giftName)` agora reconhece diretamente `retao`, `mergulho`, `relo_lateral`, `despicada`, `voadora`, `aparar_despicada`, `subida_rapida`, etc., preservando o contrato de presentes do TikTok (`Rosa`, `Donut`, `Capivara`, `Perfume`, `Leão`).
  - `maneuverStats(name)` define fallback seguro `'retao'` caso receba `null` ou nome desconhecido.
- **`frontend/src/entities/Kite.js`**:
  - Blindagem completa em `updateManeuverVisual` e `update`:
    ```javascript
    const isAparar = typeof this.maneuver?.name === 'string' && this.maneuver.name.startsWith('aparar');
    ```
  - Todos os acessos a `maneuver.name` utilizam validação de tipo e optional chaining.
- **`frontend/src/engine/App.js`**:
  - No handler `this.socket.on('competition:maneuver')`, adicionado fallback robusto:
    ```javascript
    const maneuverName = selectGiftManeuver(data?.giftName) || String(data?.giftName || 'retao');
    ```
  - Normalização garantida de `userId: String(data?.userId || '')`.
- **`backend/server.js`**:
  - Normalização estrita de `userId: String(userId)` no evento `competition:maneuver`.

### 3.2. Cinemática Fluida sem Armadilhas de Oscilação
- **Persistência de Direção**:
  - Em `retao` e `relo_lateral`, a direção horizontal (`maneuver.dir` ou `maneuver.sweepDir`) é travada no início da manobra, evitando inversões a cada frame. Se a pipa atingir a borda da arena, ela rebate suavemente mantendo a manobra ativa.
- **Mergulho em Curva U com Histerese**:
  - O `mergulho` agora executa uma descida em arco seguida de recuperação ascendente suave (`divePhase: 'diving' -> 'recovering'`), garantindo movimentação dinâmica e retorno natural ao voo estabilizado.

---

## 4. Validação e Testes

- Execução da suíte completa de testes (`npm test`): **178 testes passaram com 100% de sucesso**.
- Build de produção gerado com sucesso via `npm run build` (`dist/assets/index-BAyUPFo-.js`).
- Verificação no painel de administração e arena: manobras acionadas executam voo fluido e responsivo sem qualquer travamento.
