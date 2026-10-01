# 43. Correção de Botões Sobrepostos e Alinhamento do Design UI

**Data**: 27/09/2026  
**Status**: Implementado e Validado com Sucesso  
**Escopo**: UI/UX para Transmissão Vertical TikTok Live (1440 × 2560 e 1080 × 1920) e OBS Studio

---

## 1. Problemas Identificados e Diagnóstico

Durante a auditoria visual detalhada da transmissão, detectamos três problemas críticos de layout:
1. **Sobreposição de Botões no Rodapé**:
   - Os controles de áudio e cenário (`.game-controls`: *Ativar som* e *Favela / Laje · B*) estavam posicionados em `position: absolute; bottom: 24px; right: 26px; z-index: 20;`.
   - A barra de presentes da arena (`.commands.gift-guide`) ocupava toda a largura horizontal no rodapé (`bottom: 8px`).
   - Consequência: Os botões de controle de transmissão sobrepunham diretamente o botão **🦁 LEÃO** e cortavam o texto do **🌪️ PERFUME**, tornando o rodapé truncado e desalinhado.
2. **Chip Flutuante Desalinhado (`#boostStatus`)**:
   - O indicador de boost de agilidade (`▼ RAJADA ATIVA • +25% AGILIDADE`) possuía coordenada estática `bottom: 154px;`, flutuando no meio do piso cerâmico da laje sem relação com o rodapé.
3. **Etiqueta Fantasma de Pipa em Spawn (`queued`)**:
   - Quando uma nova pipa era instanciada na laje antes de decolar para o céu (`y >= baseY - 70` ou `isAscending`), a tag do PixiJS com o nickname ficava visível no chão cerâmico da laje.

---

## 2. Soluções Implementadas

### 2.1 Reposicionamento dos Controles de Transmissão (`.game-controls`)
- Os botões de som e alternância de cenário foram movidos do rodapé para o cabeçalho superior direito (`.arena-status`):
  - No header, ao lado do contador de pipas no céu, eles funcionam de forma elegante como **Broadcast Controls** (utilitários de live), acessíveis para o streamer sem invadir a arena de jogo.
  - O rodapé fica **100% desobstruído**, permitindo que todos os 6 botões de presentes (Vento, Rosa, Donut, Capivara, Perfume, Leão) tenham espaço total de respiro.
  - O botão do **🦁 LEÃO** e o **🌪️ PERFUME** agora aparecem com seus textos completos (`white-space: nowrap`), sem reticências ou cortes.

### 2.2 Alinhamento Estrutural do `#boostStatus`
- `#boostStatus` foi movido para o fluxo interno de `.arena-footer`, posicionado diretamente acima da barra de chamada (`.join-message`):
  - Integrado ao flexbox vertical do rodapé com centralização automática.
  - Elimina qualquer posição em pixels estáticos que polua o chão da laje dos bonecos 3D.

### 2.3 Supressão de Tags no Chão da Laje (`Kite.js`)
- Em `Kite.js`:
  - `this.tagContainer.visible = !this.isAscending && (this.y < this.baseY - 70);`
  - Enquanto a pipa estiver na mão do boneco ou em animação de subida, a etiqueta não é desenhada no piso.
  - A etiqueta só se torna visível quando a pipa atinge altitude de voo no céu.

---

## 3. Validação Técnica
- **130/130 testes aprovados** (`npm test`, 100%).
- **Browser Smoke Test**: Validação em 1440 × 2560 sem sobreposições e com alinhamento perfeito.
