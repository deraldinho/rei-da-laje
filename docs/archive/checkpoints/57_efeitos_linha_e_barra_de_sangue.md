> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 57. Restauração e Aprimoramento dos Efeitos de Linha e Barra de Sangue (HP) 3D e 2D

## Contexto e Diagnóstico

Durante a evolução visual do motor 3D e otimizações de memória, dois elementos essenciais da experiência do jogo de relinho sofreram regressões visuais:
1. **Desaparecimento da Barra de Sangue (HP Bar)**:
   - No modo 3D (`ThreeSkyScene.js`), o modelo das pipas não possuía nenhum componente tridimensional para a barra de sangue.
   - No modo 2D (`Kite.js`), a visibilidade da barra de sangue estava configurada para `(hpRatio < 1.0 || this.isInCombat)`, o que a ocultava quando a pipa estava com 100% de vida fora de combate, e em modo 3D `App.js` ocultava todo o container PixiJS `kitesContainer.visible = !is3D`.
   - Como resultado, os espectadores e streamer não conseguiam acompanhar a vida e a resistência das linhas das pipas no ar.

2. **Desaparecimento e Inércia dos Efeitos da Linha (Fios e Faíscas)**:
   - Em WebGL desktop (Windows/ANGLE), o `THREE.Line` tem espessura fixa de hardware em 1 pixel, tornando as linhas imperceptíveis no céu aberto e desprovidas de brilho especial para linhas lendárias (Cerol, Chilena, Kevlar, Tornado, Mestre do Céu).
   - O método `emitSpark3D` no `ThreeSkyScene.js` tinha apenas 64 partículas, ponto de tamanho pequeno (4.5) que se perdia na distância focal da câmera (Z=720), ignorava a cor da linha em contato e decaía apenas o canal verde (sem efeito térmico de brasa).
   - O efeito de ruptura de corte (`emitCut3D`) inexistia no Three.js e só era disparado no emissor PixiJS 2D (`this.sparks`), que em modo 3D ficava ocultado por `this.sparks.visible = !is3D`.
   - No momento do corte ou comando de teclado, não havia explosão estelar tridimensional de faíscas.

---

## Modificações Implementadas

### 1. Barra de Sangue 3D ("Blood Bar" de HP da Linha)
- **Modelagem Tridimensional Integrada (`createKiteModel3D`)**:
  - Adicionado `hpGroup` em cada modelo de pipa 3D posicionado logo abaixo da pipa (`Y = -20` a `-25`), perfeitamente calibrado para Peixinho, Raia e Tradicional.
  - Composto por:
    - Cápsula/fundo escuro (`_sharedHpBgMat`) com borda metálica (`_sharedHpBorderMat`) usando geometrias compartilhadas (`getSharedHpBoxGeo`) com zero alocação de memória (`isShared: true`).
    - Barra dinâmica de sangue (`hpFill`) com material básico luminoso (`hpFillMat`).
    - Ícone esférico de sangue/gota (`hpIcon`) pulsante à esquerda da barra.
- **Orientação Horizontal Billboard Antirrotação**:
  - Para evitar que a barra gire ou fique de cabeça para baixo durante manobras acrobáticas (`retao`, `despicar`, `peão`), `k3d.userData.hpGroup.quaternion.copy(k3d.quaternion).invert()` cancela a rotação local da pipa a cada frame, mantendo a barra 100% horizontal e sempre voltada para a câmera.
- **Feedback Semântico de Vida**:
  - `hpRatio > 0.60`: Verde esmeralda vivo (`#10b981`).
  - `0.30 < hpRatio <= 0.60`: Âmbar/amarelo de aviso (`#f59e0b`).
  - `hpRatio <= 0.30`: Vermelho sangue crítico com piscar de perigo (`#ef4444` / `#ff0055`).
  - Ícone de sangue pulsa em alta frequência (`Math.sin(time * 16)`) enquanto a pipa estiver em combate direto (`isInCombat`).

### 2. Visibilidade da Barra de Sangue 2D (`Kite.js`)
- Em `frontend/src/entities/Kite.js`:
  - A visibilidade de `this.hpBarContainer` foi atualizada de `(hpRatio < 1.0 || this.isInCombat)` para `!this.isAscending`, garantindo que assim que a pipa alcança o céu aberto, a barra de vida fique permanentemente visível tanto em 2D quanto em 3D.

### 3. Fios Vivos com Halo Aditivo e Brilho das Linhas Especiais (`createDynamicLine3D`)
- **Arquitetura Dual-Pass com `THREE.AdditiveBlending`**:
  - A linha agora é um `THREE.Group` contendo:
    1. Linha central (`mat: THREE.LineBasicMaterial`, opacidade 0.92, branca ou na cor base da linha).
    2. Halo luminoso aditivo (`glowMat: THREE.LineBasicMaterial`, blending `THREE.AdditiveBlending`, opacidade ajustada dinamicamente).
  - Ambos os passes compartilham a mesma `BufferGeometry` e vetor de posições `positions`, permitindo atualização imediata com uma única chamada de `needsUpdate = true` sem alocação no heap.
- **Hierarquia Visual e Linhas Especiais**:
  - **Cerol (Rosa)**: Núcleo carmim vívido com halo laser neon rosa (`0xf43f5e`).
  - **Chilena (Donut)**: Núcleo âmbar dourado com halo de fogo solar (`0xf59e0b`).
  - **Kevlar (Capivara)**: Núcleo blindado amarelo elétrico (`0xeab308`).
  - **Tornado (Perfume)**: Núcleo ultravioleta com halo de vórtice violeta (`0xa855f7`).
  - **Mestre do Céu (Leão)**: Núcleo ciano reluzente com halo divino laser (`0x06b6d4`).
  - **Rei da Laje**: Linha dourada imperial reluzente (`0xffd700` / `0xffea00`).
- **Vibração Harmônica em Combate**:
  - Adicionada vibração de alta frequência no vetor de posições da linha quando em manobra, tensão alta ou combate (`Math.sin(time * 65 + p * 2.8) * 1.6 * arc`), transmitindo visualmente a fricção do relinho.

### 4. Faíscas Incandescentes 3D e Explosão de Corte (`emitSpark3D` e `emitCut3D`)
- **Expansão de Partículas**:
  - Capacidade aumentada para 180 partículas no pool.
  - Tamanho dos pontos aumentado para `8.5` com `depthTest: false` e `AdditiveBlending`, garantindo visibilidade clara contra céu e montanhas.
- **`emitSpark3D(worldX, worldY, worldZ, count, colorHex)`**:
  - Aceita cor hexadecimal da linha e projeta faíscas incandescentes com mistura de brasas douradas e brancas térmicas.
  - Velocidade radial, empuxo vertical e desvio pelo vento.
- **`emitCut3D(worldX, worldY, worldZ, colorHex)`**:
  - Disparo estelar de 38 partículas em alta velocidade na coordenada 3D exata do corte (`cutX`, `cutY`, `cutZ`).
  - Efeito visual de estouro e ruptura com cores temáticas do vencedor do relinho, labaredas douradas e flash estelar branco.
- **Física de Resfriamento de Partículas**:
  - Decaimento linear proporcional em todos os três canais de cor (R, G, B), simulando o resfriamento de fagulhas incandescentes no ar.

### 5. Integração no `App.js`
- Conectado `emitSpark3D` com profundidade Z precisa calculada a partir da média das pipas em combate (`avgZ`).
- Conectado `emitCut3D` em:
  - `handleCutSuccess` (corte local confirmado).
  - Evento de rede WebSocket `game:cut_occurred`.
- Conectado `emitSpark3D` nas ações manuais de teclado (1 - Puxar, 3 - Despicada) e celebração do novo líder.

### 6. Validação e Qualidade
- **Testes Unitários**: 178/178 testes aprovados (`npm test`).
- **Browser Smoke Test**: Aprovado com sucesso em headless browser (`tests/browser-smoke.mjs`).
- **Build de Produção**: `npm run build` gerado perfeitamente sem erros.
