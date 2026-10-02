> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Documentação 76: Arquitetura de Corte Físico, FlyawayKite e Sistema de Aparo (P10/P15)

## 1. Visão Geral e Filosofia de Design
A partir das diretrizes consolidadas para **"Pipa Combate para TikTok Live"**, o combate deixa de ser uma abstração de HP ou dano artificial em script (`damage: 1.5`, `kite.y -= 10`) e passa a ser uma simulação estritamente física:
- **Intenção de Controle:** Comentários e presentes do público transmitem intenções de carretilha e tração (`reelSpeed`, `spoolLength`, `liftIntent`, `steerIntent`), alimentando a simulação fixa de 60 Hz.
- **Tensão e Força Normal:** A linha esticada eleva a força normal de contato ($N = T \sin(\theta)$), enquanto descarregar linha cria folga (sag), reduzindo a pressão normal e fazendo a linha ceder sob o atrito em vez de ser ceifada.
- **Ruptura Física Localizada no Ponto de Contato:** O corte ocorre no segmento exato onde o desgaste abrasivo atinge o limite crítico ($P = F_{\text{atrito}} \cdot V_{\text{slide}}$).

---

## 2. Componentes Implementados

### 2.1. `RopePhysics.breakAt(segmentIndex, t)`
Implementado em [`frontend/src/engine/physics/RopePhysics.js`](../../../frontend/src/engine/physics/RopePhysics.js):
- Localiza o ponto tridimensional exato de cisalhamento:
  $$P_{\text{break}} = P_i + (P_{i+1} - P_i) \cdot t$$
- Divide a corda física em dois conjuntos de nós contínuos:
  1. **HandRope (`handNodes`):** Conectada na mão do personagem na laje ($t=0$), estendendo-se até $P_{\text{break}}$. A linha não desaparece instantaneamente; permanece visível e recolhe/cai com a gravidade.
  2. **FlyawayRope (`flyawayNodes`):** Conectada no cabresto da pipa cortada e estendendo-se até $P_{\text{break}}$, balançando livremente no ar.

### 2.2. Entidade `FlyawayKite` (Pipa Voada Física)
Implementada em [`frontend/src/entities/FlyawayKite.js`](../../../frontend/src/entities/FlyawayKite.js) (com retrocompatibilidade em [`FallingKite.js`](../../../frontend/src/entities/FallingKite.js)):
- **Inércia e Momento:** Herda integralmente a velocidade linear $(v_x, v_y, v_z)$ e o momento angular $(\omega)$ que a pipa possuía no frame da disputa.
- **Aerodinâmica de Voo Livre:**
  - Vento e arrasto lateral conduzem a pipa pelo céu.
  - Gravidade progressiva com velocidade terminal modulada pelo peso da linha restante.
  - Rabiola e peso da linha pendurada geram torque estabilizador ou rodopio conforme o comprimento.
- **FlyawayRope Dinâmica:** Os nós da linha pendurada balançam com vento e velocidade de avanço.

### 2.3. Sistema de Aparo (`checkAparos`)
Implementado em [`frontend/src/engine/App.js`](../../../frontend/src/engine/App.js):
- A pipa cortada permanece ativa na arena por até 10 segundos como `FlyawayKite`.
- Se a linha de qualquer pipa ativa cruzar os segmentos da corda pendurada da pipa voada (`flyaway.getCatchableSegments()`):
  1. A pipa voada é capturada (`flyaway.catchBy(activeKite)`).
  2. O jogador que resgatou ganha **+2 pontos de bônus de aparo**.
  3. Disparo audiovisual: som característico, faíscas incandescentes e aviso em destaque no HUD (`APARADA! [Jogador] resgatou a pipa de [Perdedor]!`).
  4. Emissão de evento via Socket.io (`competition:catch`).

### 2.4. Two-Way Coupling e Resposta no Three.js
- Durante o atrito de combate (`checkRelinhos`), ambas as pipas sofrem atração mútua de cabresto para o ponto de atrito, frenagem vetorial de avanço ($v \times 0.88$) e estremecimento aerodinâmico.
- Em [`frontend/src/ui/ThreeSkyScene.js`](../../../frontend/src/ui/ThreeSkyScene.js), a pipa 3D estremece em roll/pitch quando `kite.isInCombat = true`.

---

## 3. Validação e Qualidade
- **Testes Unitários:** `node --test tests/*.test.cjs` executado com **232/232 testes passando (0 falhas)**.
- **Teste Específico:** [`tests/cut-break-flyaway-aparo.test.cjs`](../../../tests/cut-break-flyaway-aparo.test.cjs).
- **Compilação Vite:** `npm run build` gerado sem erros em `dist/`.
