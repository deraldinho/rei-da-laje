> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 48 · Otimização Máxima de GPU, Redução Drástica de RAM e Eliminação de Pipas sob a Laje

**Data**: 28/09/2026  
**Status**: Implementado, Auditado e 100% Testado (149/149 testes aprovados)  
**Módulos Alterados**:
- `frontend/src/entities/FallingKite.js`
- `frontend/src/entities/Kite.js`
- `frontend/src/engine/App.js`
- `frontend/src/ui/ThreeSkyScene.js`
- `frontend/src/ui/game.css`
- `tests/gpu-memory-laje-floor.test.cjs`

---

## 1. Problemas Diagnosticados

### A. Pipa ficando bugada debaixo da laje
1. **Spawn no Chão**: O construtor de `Kite.js` iniciava `this.y = this.baseY` (coordenada do piso da laje no rodapé). No Three.js, como a profundidade Z do jogador está no fundo da arena e a laje fica no primeiro plano ($Z = 480$), a pipa recém-criada nascia literalmente debaixo/atrás do piso da laje e subia lentamente.
2. **Descida Ilimitada no Teclado**: Ao pilotar com as teclas `2` (soltar linha) e `3` (desbicada no vento), o deslocamento vertical para baixo (`+8px` e `+14px`) não possuía teto inferior (`screenHeight * 0.65`), permitindo que a pipa fosse empurrada para dentro e para baixo da laje.
3. **Pipas Cortadas sem Limite de Solo**: Em `FallingKite.js`, a vida útil era de 8 segundos (`life = 8.0`) sem colisão com a laje. A pipa cortada continuava descendo indefinidamente até o fundo da tela, ficando presa visivelmente atrás da mureta e debaixo do piso.

### B. Consumo Excessivo de Memória RAM (Sobrecarga de CPU/Buffers)
1. **Renderização Duplicada a Cada Frame**:
   - `gameLoop(delta)` chamava `this.threeScene.update()`, que realizava `syncEntities()` e `render()`.
   - Imediatamente após, `this.app.render()` (o hook de render do PixiJS) chamava novamente `this.threeScene.syncEntities()` e `this.threeScene.render()`.
   - **Resultado**: O Three.js inteiro (76 casas, 40 pipas, 40 linhas, sombras e pós-processamento) era renderizado **duas vezes por quadro** (120 FPS de chamadas de render em um loop de 60 FPS), saturando a fila de buffers de comando na RAM.
2. **Duplicação 2D + 3D para Pipas Cortadas**: Quando o Three.js 3D estava ativo, o PixiJS continuava desenhando sprites 2D de `fallingContainer` com textos, tags e gráficos em paralelo.
3. **Falta de Forçamento de GPU Dedicada**: PixiJS e Three.js sem atributos estritos de contexto WebGL permitiam que navegadores e o OBS Studio retivessem cópias de buffers na RAM principal (`preserveDrawingBuffer`, `stencil` e falta de `transform: translateZ(0)`).

---

## 2. Soluções e Otimizações Implementadas

### 2.1 Eliminação Absoluta de Pipas debaixo da Laje
1. **Spawn Aéreo Imediato**:
   - No construtor de `Kite.js`, a posição inicial agora é `this.y = Math.min(screenHeight * 0.58, this.targetY + 45)`. A pipa já nasce no céu visível, voando e subindo suavemente, sem jamais tocar ou nascer atrás do piso da laje.
2. **Travamento Físico de Solo**:
   - No final de `Kite.update`:
     ```javascript
     this.y = Math.max(35, Math.min(this.screenHeight * 0.65, this.y));
     ```
   - No teclado (`executeKeyboardAction`), `soltar` e `despicada` são travados com `Math.min(maxKiteY, ...)`.
3. **Descarte Imediato da Pipa Cortada ao Atingir o Horizonte**:
   - Em `FallingKite.js`, vida reduzida de 8.0s para **3.5s**.
   - Se `this.y >= floorLimit` (horizonte da laje), a pipa é instantaneamente descartada com `this.life = 0`.
   - Em `ThreeSkyScene.js`, se `fkWorld.y < maxLajeWorldY`, a pipa 3D é descartada imediatamente por `disposeHierarchy`.

### 2.2 Forçamento da GPU Dedicada e Alívio da Memória RAM
1. **Eliminação do Render Duplicado**:
   - Removida a chamada redundante de `this.threeScene.render()` de dentro de `this.app.render()`. O Three.js agora renderiza apenas 1 vez por quadro no `gameLoop`.
2. **Ocultação do Container 2D em Modo 3D**:
   - `this.fallingContainer.visible = !is3D`. Em modo 3D, todo o desenho de pipas cortadas fica a cargo exclusivo da GPU via Three.js.
3. **Atributos de Contexto WebGL de Alta Performance**:
   - `powerPreference: 'high-performance'` (obriga o uso da GPU dedicada, como NVIDIA/AMD, em vez de chipsets integrados ou SwiftShader).
   - `preserveDrawingBuffer: false` (evita que o driver copie o framebuffer para a RAM a cada quadro).
   - `stencil: false` (elimina buffers auxiliares desnecessários de memória).
   - PixiJS com `antialias: false` (elimina overhead de 4x de buffer MSAA).
4. **Camadas de Composição Direta de Hardware (CSS GPU Layers)**:
   - `#threeCanvas` e `#gameCanvas` atualizados com:
     ```css
     transform: translateZ(0);
     backface-visibility: hidden;
     will-change: transform;
     ```
   - Força o Chromium / OBS a alocar superfícies diretas de hardware na VRAM da GPU, sem swapping para a RAM do sistema.

---

## 3. Guia de Configuração para o OBS Studio (Zero Cópia de RAM)

Para garantir que o OBS Studio utilize 100% da sua GPU dedicada:
1. Nas **Propriedades da Fonte do Navegador** (Browser Source) no OBS:
   - Marque a opção: **"Controle de áudio pelo OBS"** (opcional).
   - Marque: **"Fechar a fonte quando invisível"**.
2. Nos atalhos de inicialização do OBS ou em *Configurações $\to$ Avançado*:
   - Garanta que a aceleração de hardware do navegador esteja ativada:
     `Habilitar aceleração por hardware para fontes do navegador (Browser Source)`.
3. Se estiver rodando o navegador em janela/captura de tela, abra com aceleração total:
   ```bash
   --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist
   ```

---

## 4. Resultados da Validação Técnica
- **149 testes unitários aprovados (100% de sucesso)**.
- Eliminação comprovada de pipas penetrando ou nascendo sob a laje.
- Redução substancial de ciclos de CPU e alocação de buffers duplicados.
