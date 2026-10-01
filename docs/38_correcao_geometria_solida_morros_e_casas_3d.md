# 38. Correção Estrutural da Geometria 3D dos Morros e Casario

## 1. Diagnóstico da Causa Raiz Visual

Na versão anterior, ao visualizar a arena em formato vertical (retrato 9:16 — 1440 × 2560 ou 1080 × 1920), ocorriam os seguintes defeitos visuais críticos:
1. **Montanha Direita Invisível (Backface Culling):**
   - A malha anterior usava `THREE.PlaneGeometry`. Ao espelhar as coordenadas X para o morro direito (indo da direita para o centro), o sentido de enrolamento dos triângulos (*triangle winding order*) foi invertido, apontando as normais para trás da câmera (-Z).
   - O material usava o padrão `THREE.FrontSide`, fazendo o Three.js descartar a face inteira. Como consequência, a montanha direita desaparecia por completo, deixando o casario e as árvores flutuando no vazio do céu.
2. **Montanhas Flutuando no Ar (Corte Prematuro em Y):**
   - A base das montanhas era limitada em `hillBottomY = -bounds.height * 0.34`, muito acima da laje (`-bounds.height * 0.48`). Isso gerava um vão de ~150 pixels de céu vazio passando por baixo da montanha e das fundações.
3. **Casario em Linha Única / Degraus Flutuantes:**
   - A distribuição das casas dependia de uma única curva monotônica em X (`normDistFromEdge = 0.05 + progressInTier * 0.82`), forçando todas as 46 habitações a formarem uma linha reta ou coluna vertical estreita descendo a encosta.
   - O embasamento de alvenaria das casas tinha profundidade de apenas 45 unidades, insuficiente para cobrir o declive, deixando blocos de pedra suspensos no ar.

---

## 2. Soluções de Engenharia 3D Implementadas

### 2.1. Geometria Sólida Tridimensional com Saias Estruturais (`createSolidMountainGeometry`)
- Substituída a folha 2D aberta por uma **malha volumétrica fechada** (`createSolidMountainGeometry(Nu, Nv)`).
- Além dos vértices de relevo na superfície, a malha conta com **saias laterais (skirts)** nas 4 bordas:
  - *Skirt do Vale (Borda interna):* Desce verticalmente até `yFloor = -bounds.height * 0.85`.
  - *Skirt Exterior (Borda externa):* Desce até `yFloor`, estendendo-se para fora da tela.
  - *Skirts Frontal e Traseiro:* Fecham a frente e o fundo da encosta.
- O morro se estende profundamente para trás e abaixo da laje frontal dos 40 jogadores, tornando **fisicamente impossível enxergar vãos ou céu por baixo**.
- Ativado `side: THREE.DoubleSide` em `terrainMat` e `distantTerrainMat`, garantindo renderização das faces em ambos os lados e eliminando 100% dos problemas de culling.

### 2.2. Função Única de Altura Paramétrica (`computeMorroHeight`)
- Criado o método mestre `computeMorroHeight(x, z, isLeft, bounds)` que calcula a elevação contínua e suave da montanha carioca com curvatura orgânica (`slope = (1 - norm)^1.25`) e relevo estocástico de granito/Mata Atlântica.
- Tanto a malha da montanha quanto **cada casa, árvore e formação rochosa** utilizam esta exata mesma função para determinar sua coordenada vertical Y no momento do layout ou resize:
  ```javascript
  const groundY = this.computeMorroHeight(x, z, isLeft, bounds);
  house.position.set(x, groundY, z);
  ```

### 2.3. Distribuição Natural do Casario em 3 Patamares e Fundação Profunda
- As habitações foram reorganizadas em **3 patamares orgânicos de encosta**:
  1. *Zona Alta (Cume / Fundo):* Casas mais distantes (`z = -340`), posicionadas mais alto no morro.
  2. *Zona Média (Miolo da Comunidade):* Núcleo denso com casas sobrepostas e vielas (`z = -230`).
  3. *Zona Baixa (Base da Laje):* Casas em primeiro plano integradas ao horizonte da laje (`z = -120`).
- A fundação em pedra (`foundationMesh`) foi ampliada para **75 unidades de profundidade** (`scale.y: 75`, `pos.y: -37.5`), cravando-se profundamente na rocha da montanha e eliminando qualquer aresta no ar.

---

## 3. Validação e Evidências

1. **Testes Unitários:** `npm test` aprovado com **129/129 testes (100% de sucesso)**.
2. **Build de Produção:**
   - `dist/` gerado com sucesso via `npm run build`.
   - `dist-preview/` gerado com sucesso via `npx vite build frontend --outDir dist-preview`.
3. **Teste End-to-End no Navegador (`tests/browser-smoke.mjs`):**
   - Execução headless completa com Edge simulando OBS 1440 × 2560 vertical.
   - Ambas as montanhas (esquerda e direita) totalmente sólidas e ancoradas na base.
   - Casario perfeitamente distribuído e fixado sobre o terreno sem nenhuma casa flutuando.
   - Evidência gráfica capturada e validada em [`tests/evidence/portrait-1440x2560.png`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/tests/evidence/portrait-1440x2560.png).
