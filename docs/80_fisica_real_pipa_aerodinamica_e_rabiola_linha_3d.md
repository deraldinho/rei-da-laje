# Documentação 80: Física Real da Pipa (Gravidade, Vento, Arrasto, Empuxo) e Rabiola como Linha Física 3D

## 1. Contexto e Motivação
Em versões anteriores, a rabiola 3D se comportava de forma estática no espaço local da pipa, gerando a sensação de "pedaço de pau" rígido preso à cauda. Adicionalmente, a posição da pipa era forçada por um blend cinemático senoidal estático (`Wind.move`), que anulava o integrador newtoniano e desconsiderava as forças de sustentação aerodinâmica direcional, arrasto de cauda e equilíbrio gravitacional.

Esta atualização implementou:
1. **Física da Linha da Rabiola:** A rabiola é modelada como uma linha de corda real baseada em integração de Verlet e restrições inelásticas de distância de corda (Distance Constraints) no espaço mundial (World Space).
2. **Dinâmica Aerodinâmica Completa da Pipa:** A pipa opera sob um modelo de dinâmica de corpos newtonianos com gravidade real, sustentação direcional do bico, arrasto de corpo e cauda, tração de linha de carretilha e estabilização de guinada.

---

## 2. Implementação da Rabiola como Linha Física (3D)

### 2.1. Simulação no Espaço Mundial (`World Space`)
Em [`frontend/src/ui/three/ThreeKites.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/ui/three/ThreeKites.js), a rabiola deixou de ser atualizada em coordenadas locais da pipa:
- **Âncora (Nó 0):** Ancorado no ponto inferior da pipa no mundo (`tailGroup.getWorldPosition()`).
- **Nós Subsequentes ($1 \dots N-1$):**
  - **Gravidade Mundial:** $F_g = -34.0$ no eixo $Y$ do mundo Three.js.
  - **Vento Mundial:** Empurra os nós nos eixos mundiais $X$ e $Z$, acrescido de turbulência senoidal (*flutter* de fita plástica).
  - **Arrasto Aerodinâmico:** Amortecimento de velocidade ($0.88$).
  - **Passo Verlet:**
    $$\vec{v} = (\vec{p}_i - \vec{p}_{prev, i}) \cdot \text{damping}$$
    $$\vec{p}_{prev, i} = \vec{p}_i$$
    $$\vec{p}_i += \vec{v} + \vec{a} \cdot \Delta t^2$$
  - **Restrição Inelástica de Distância (4 iterações):**
    Cada segmento mantém comprimento fixo ($L_0 = 5.2$). Se o nó 0 é a âncora, ele não se move; os demais nós distribuem a correção.

### 2.2. Projeção e Fitilhos Coloridos
- Cada nó mundial é projetado para o espaço local de `tailGroup` através de `tailGroup.worldToLocal(tempLocal)`.
- O buffer de vértices da GPU (`BufferAttribute.position`) é atualizado frame a frame com `needsUpdate = true`.
- Os fitilhos de plástico têm suas posições e orientações calculadas a partir da tangente local da curva da linha, tremulando com a vibração do ar.
- **Resultado:** A rabiola fica solta, flexível e viva. Quando a pipa dá giros ou manobras, a rabiola curva fluidamente no céu e nunca mais gira dura como uma haste.

---

## 3. Física Aerodinâmica da Pipa (`KiteDynamics` & `Kite.js`)

Em [`frontend/src/engine/physics/KiteDynamics.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/KiteDynamics.js) e [`frontend/src/entities/Kite.js`](file:///c:/Users/deral/Competi%C3%A7%C3%A3o%20de%20pipa%20tiktok%20live/frontend/src/entities/Kite.js):

1. **Gravidade ($F_g$):** $F_g = m \cdot g$ puxando continuamente a pipa para baixo (+Y no 2D, -Y no 3D).
2. **Vento Aparente e Arrasto ($F_{drag}$):** Proporcional ao vento relativo $\vec{V}_{rel} = \vec{V}_{vento} - \vec{V}_{pipa}$.
3. **Empuxo Direcional do Bico (Sustentação por Ângulo de Ataque):**
   - Vetor do bico: $\hat{n} = (\sin(\theta), -\cos(\theta))$.
   - O vento incidente projeta sustentação aerodinâmica na direção em que o bico está virado.
   - Pipa virada para a direita arranca para a direita; virada para a esquerda arranca para a esquerda.
4. **Arrasto e Estabilização de Rabiola:**
   - A cauda exerce arrasto traseiro contra a velocidade da pipa e puxa com peso adicional ($tailDragFx, tailDragFy$).
   - Amortece oscilações angulares descontroladas.
5. **Integração Newtoniana Contínua:**
   - Removida a sobreposição de velocidade cinemática em `Kite.js`. Durante o voo normal, as forças newtonianas calculam $a = \frac{\sum F}{m}$, atualizando `vx, vy`, `x, y` e mantendo a velocidade física sem anulações artificiais.

---

## 4. Validação
- **Testes Unitários:** 237/237 testes passando sem falhas (`npm test`).
- **Verificação de Sintaxe:** `node --check` sem erros nos módulos afetados.
- **Build de Produção:** `npm run build` gerado com sucesso via Vite.
