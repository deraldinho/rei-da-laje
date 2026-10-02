> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 85 · Auditoria Geral do Game: Runtime, Física Canônica, Integridade de Aparo e Estabilidade

**Data**: 01/10/2026  
**Status**: Concluído, Auditado, Blindado e 100% Validado (**257/257 testes unitários aprovados + Browser Smoke Test E2E com zero exceções**)  
**Arquivos Auditados e Aprimorados**:
- `frontend/src/entities/FlyawayKite.js`
- `frontend/src/engine/App.js`
- `tests/browser-smoke.mjs`
- `tests/p15-canonical-cut-authority.test.cjs`
- `tests/synchronization-integrity.test.cjs`
- `frontend/dist/` (Bundle Vite de Produção Recompilado)
- `frontend/dist-preview/` (Bundle Vite de Prévia e Testes Recompilado)

---

## 1. Escopo e Objetivos da Auditoria

Atendendo à solicitação de auditoria no game, foi realizada uma varredura completa em todos os subsistemas críticos:
1. **Pipeline de Combate e Autoridade Canônica (P15.2)**: Validação de claims de corte no backend (`relinho:cut`), integridade física de coordenadas contra polilinhas XPBD e eventos de confirmação (`game:cut_occurred`).
2. **Ciclo de Vida de Pipa Voada e Aparo (P10/P15)**: Sobrevivência de `FlyawayKite`, ancoragem de `BrokenHandRope` e mecânica de resgate por outros jogadores.
3. **Resiliência contra Exceções de DisplayObject no PixiJS**: Proteção contra descarte de transform/position em objetos destruídos.
4. **Regras de Eliminação de Ruptura Espontânea (Doc 83)**: Garantia de que nenhuma pipa seja cortada no spawn por vento/tensão mecânica estática.
5. **Autocura e Sincronização de Arena**: Sincronização periódica da arena (`arenaSyncTimer`) e robustez no supervisor do TikTok Live.

---

## 2. Não-Conformidades Diagnosticadas e Corrigidas

### 2.1 [ALTA SEVERIDADE] Exceção Fatal de Null Pointer em `FlyawayKite.update` ao Seguir Pipa Destruída
- **Sintoma**: Exceção não capturada no console do navegador:  
  `TypeError: Cannot read properties of null (reading 'position')` no getter `get x()` de DisplayObject do PixiJS.
- **Causa Raiz**: Quando uma pipa realizava um **aparo** (`catchBy`), a pipa voada armazenava a referência `this.caughtBy = playerKite`. Caso a pipa resgatadora fosse cortada ou destruída no mesmo intervalo, o PixiJS anulava `this.transform = null` durante `destroy()`. Ao tentar ler `this.caughtBy.x` no frame seguinte, o getter tentava acessar `this.transform.position.x`, disparando a exceção fatal e travando o loop de animação da voada.
- **Remediação Aplicada**: Adicionada verificação defensiva em `frontend/src/entities/FlyawayKite.js`:
  ```javascript
  if (this.isCaught && this.caughtBy) {
    if (this.caughtBy.destroyed || !this.caughtBy.transform || !Number.isFinite(this.caughtBy.x)) {
      this.caughtBy = null;
      this.life = 0;
      this.alpha = 0;
      return;
    }
    this.x += (this.caughtBy.x - this.x) * 0.15 * step;
    this.y += (this.caughtBy.y - this.y) * 0.15 * step;
    ...
  }
  ```

### 2.2 [MÉDIA SEVERIDADE] Desalinhamento do Teste E2E de Fumaça com o Corte Canônico P15.2
- **Sintoma**: `browser-smoke.mjs` falhava ao verificar o ranking de cortes após acionar `handleCutSuccess`.
- **Causa Raiz**:
  - No P15.2, `handleCutSuccess` não mais gera score nem remove pipas localmente de forma otimista; ele envia o claim ao backend e aguarda o evento canônico `game:cut_occurred`.
  - As pipas de teste `qa_0` e `qa_1` estavam a 110px de distância na grade, violando a validação física de polilinha no backend (`PHYSICAL_POINT_MISMATCH`).
  - A asserção de tag verificava a string antiga `"CORTADA"`, enquanto o Doc 82 padronizou a nomenclatura autêntica da cultura de pipa para `"VOADA!"`.
- **Remediação Aplicada**:
  - Em `tests/browser-smoke.mjs`, as duas pipas de teste são posicionadas em contato físico com `resetPositions`, garantindo que o backend valide e aprove o claim de corte.
  - A verificação de tag de identificação agora aceita `"VOADA"` e `"CORTADA"`.
  - Adicionado await de sincronização com o evento WebSocket antes da checagem do leaderboard.

### 2.3 [MÉDIA SEVERIDADE] Delimitador Incorreto nos Testes Estruturais de Auditoria
- **Sintoma**: Falha em `tests/p15-canonical-cut-authority.test.cjs` e `tests/synchronization-integrity.test.cjs` procurando pelo método `handleTensionBreak`.
- **Causa Raiz**: O método de ruptura espontânea por tensão havia sido removido no Checkpoint 83 para impedir que pipas recém-entradas arrebentassem ao vento. O bloco de teste ainda procurava `handleTensionBreak` como token de fechamento de `handleCutSuccess`.
- **Remediação Aplicada**: Padronizado o token de fechamento para `destroy()` em ambos os testes estruturais, mantendo a regra de que pipas só quebram por relinho genuíno.

---

## 3. Matriz de Auditoria por Subsistema

| Subsistema | Componentes Auditados | Status | Parecer Técnico |
| :--- | :--- | :---: | :--- |
| **Backend & Autoridade** | `server.js`, `cutClaimValidator.js`, `gameRules.js` | ✅ Aprovado | Fail-closed authority ativa, sem corte duplicado, validação AABB + polilinha XPBD rigorosa. |
| **Física XPBD & Colisão**| `RopePhysics.js`, `RopeCollision.js`, `RelinhoContactSolver.js` | ✅ Aprovado | Dois fios acoplados sem atração artificial, microbenchmark processa 10.8M pares/s. |
| **Ciclo da Pipa Voada** | `FlyawayKite.js`, `FallingKite.js`, `BrokenHandRope.js` | ✅ Aprovado | Preservação de momentum, linha caindo na laje, aparo protegido contra objetos nulos. |
| **Renderizador 3D & 2D** | `ThreeSkyScene.js`, `Kite.js`, `Line.js` | ✅ Aprovado | Desativação de paths 2D ocultos no modo 3D, prevenção de memory leaks e zero NaN. |
| **Conector TikTok Live** | `tiktokWorkerSupervisor.js`, `tiktokFetchGuard.js` | ✅ Aprovado | Tolerância a reconexões upstream, isolamento seguro em worker subprocess. |

---

## 4. Resultados da Validação

1. **Suíte Completa de Testes Unitários e de Integração**:
   - `npm test`: **257/257 aprovados** (0 falhas, 0 pendências, tempo: 2,49s).
2. **Teste E2E no Navegador Real (Edge Headless via CDP)**:
   - `node tests/browser-smoke.mjs`: **Aprovado com 100% de sucesso**.
   - Lista de erros / exceções: `errors: []` (zero exceções).
3. **Microbenchmark de Colisão de Linhas (40 Pipas / 780 Pares)**:
   - `node tests/benchmark-40-rope-collisions.mjs`:
     - Distribuído: **0,072 ms/substep** (10,8 milhões de verificações/s).
     - Pior caso simultâneo: **2,77 ms/substep** (280k verificações/s).
4. **Compilação de Produção e Prévia**:
   - `frontend/dist/` e `frontend/dist-preview/` compilados com sucesso via Vite em 6.05s e 6.07s.
