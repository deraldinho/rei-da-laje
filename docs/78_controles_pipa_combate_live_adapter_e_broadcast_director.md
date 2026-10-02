> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Documentação 78: Controles Pipa Combate, Live Input Buffer e Broadcast Director (P11, P12 e P13)

## 1. Visão Geral
Esta documentação consolida a entrega das fases **P11 (Controles Clássicos Pipa Combate $\to$ Live Adapter)**, **P12 (Buffer Suave de Entradas TikTok Live & Fila de Prioridade de Manobras)** e **P13 (Broadcast Director - Câmera Automática Inteligente Three.js)**.

---

## 2. Componentes e Arquitetura

### 2.1. P11: PlayerIntentController & Live Adapter
- **Arquivo:** [`frontend/src/engine/physics/PlayerIntentController.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/PlayerIntentController.js)
- **Integração:** Acoplado diretamente ao construtor de [`Kite.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/entities/Kite.js) e aos disparos de [`ChatControls.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/ChatControls.js) e [`Maneuvers.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/Maneuvers.js).
- **Mapeamento Mecânico:**
  - `puxar`: `reelVelocity < 0` (recolhe carretilha), eleva tração física e sustentação da pipa.
  - `descarregar`: `reelVelocity > 0` (solta carretilha), alivia a tração para deslizar no vento.
  - `despicar`: mergulho aerodinâmico descendente com rolagem direcional (`liftIntent < 0`).
  - `tenteio`: oscilações de alta frequência simulando puxadas e folgas contínuas.
  - `retao` / `perseguir`: foco direcional agressivo contra adversários próximos com alinhamento mecânico.

### 2.2. P12: LiveInputBuffer & ManeuverQueue
- **Arquivos:**
  - [`frontend/src/engine/physics/LiveInputBuffer.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/LiveInputBuffer.js)
  - [`frontend/src/engine/physics/ManeuverQueue.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/ManeuverQueue.js)
- **Comportamento:**
  - **Buffer Anti-Pico:** Rajadas de 20 a 50 comentários ou centenas de curtidas não causam saltos discretos ou quebra mecânica súbita. O buffer absorve `commentEnergy` e `likeEnergy` e drena exponencialmente a cada ciclo de 60 Hz.
  - **Fila com Prioridade de Presentes:** Se uma pipa recebe múltiplas manobras, elas formam fila ordenada. Presentes lendários (`mestre_do_ceu`, prioridade 10) assumem imediatamente sem descartar a manobra anterior, que volta ao topo da fila para terminar após o efeito especial.

### 2.3. P13: Broadcast Director (Câmera Automática Inteligente 3D)
- **Arquivo:** [`frontend/src/ui/three/BroadcastDirector.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/three/BroadcastDirector.js)
- **Integração:** Orquestrado por [`ThreeSkyScene.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/ThreeSkyScene.js).
- **Modos de Operação Automáticos:**
  - `overview`: Enquadramento panorâmico estável da arena quando o céu está calmo.
  - `combat`: Ao detectar cruzamento de linhas (`isInCombat === true`), a câmera aproxima suavemente (zoom in moderado) e centraliza no centróide 3D dos combatentes.
  - `cut`: Ao ocorrer um corte físico (`emitCut3D`), a câmera enquadra dramaticamente o ponto de rompimento com micro-shake de impacto cinematográfico por 2.4 segundos.
  - `aparo`: Ao ocorrer o resgate de uma pipa voada, foca na interceptação esmeralda/dourada por 2.0 segundos.
  - `maneuver`: Enquadra manobras ativas de alta prioridade.
  - **Adaptação 9:16:** Em dispositivos verticais (TikTok Mobile), a distância $Z$ se ajusta automaticamente para nunca cortar a visão da laje ou o horizonte.

---

## 3. Validação e Qualidade
- **Suíte de Testes:** **236/236 testes passando** (`npm test`).
- **Novo Teste Adicionado:** [`tests/player-intent-live-buffer-p11.test.cjs`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/tests/player-intent-live-buffer-p11.test.cjs).
- **Verificação de Sintaxe:** `node --check` em 100% dos módulos JavaScript.
- **Compilação de Produção:** `npm run build` gerado com sucesso em `frontend/dist/`.
