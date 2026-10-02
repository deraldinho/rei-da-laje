> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 70. Implementação da Fase P5: Unificação de Geometria Física com Buffers 3D e 2D

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**216/216 testes aprovados**)  
**Skills Utilizadas:** `/senior-fullstack`, `/3d-web-experience`, `/test-driven-development`

---

## 1. Visão Geral da Fase P5

Até a Fase P4, a simulação mecânica da corda (Verlet/XPBD de 12 nós), a detecção de colisão euclidiana por cápsula e o cálculo de atrito/desgaste abrasivo operavam perfeitamente. No entanto, havia a necessidade de consolidar a **unificação geométrica de renderização**:
1. Garantir que a linha visual 3D (Three.js WebGL) e a linha visual 2D (PixiJS Canvas) desenhem exatamente os mesmos nós simulados, eliminando qualquer discrepância entre "o que colide" e "o que o espectador vê".
2. Blindar o buffer de atributos de vértices 3D (`posArr`) contra qualquer propagação de `NaN`, assegurando que `computeBoundingSphere()` permaneça sempre com raio finito positivo.
3. Sincronizar os controles de escala visual (`kiteScale` e `kiteNameScale`) para que tanto a representação 2D quanto a 3D respondam instantaneamente às configurações do painel admin.

---

## 2. Pipeline de Vértices 3D Tridimensional (`ThreeLines.js`)

Na função `syncLine`, o array de nós físicos `kite.rope.getNodes()` é amostrado parametricamente ao longo do comprimento da linha $t \in [0, 1]$:
```javascript
const sampleIdx = t * (ropeNodes.length - 1);
const idxA = Math.floor(sampleIdx);
const idxB = Math.min(ropeNodes.length - 1, idxA + 1);
const frac = sampleIdx - idxA;
const nA = ropeNodes[idxA];
const nB = ropeNodes[idxB];

const ropeX = nA.x + (nB.x - nA.x) * frac;
const ropeY = nA.y + (nB.y - nA.y) * frac;
const ropeZ = (nA.z || 0) + ((nB.z || 0) - (nA.z || 0)) * frac;
```

### 2.1 Mapeamento e Inversão de Coordenadas
- **Espaço 2D:** Origem no topo esquerdo da tela ($Y$ para baixo).
- **Espaço 3D Three.js:** Origem centrada no horizonte celeste ($Y$ para cima).
- A deflexão física relativa à linha reta é computada e escalada:
  $$\text{physSag}_X = (\text{ropeX} - \text{straight2D}_X) \times 0.35$$
  $$\text{physSag}_Y = -(\text{ropeY} - \text{straight2D}_Y) \times 0.35$$
  $$\text{physSag}_Z = \text{ropeZ} \times 0.35$$

### 2.2 Blindagem Total de Buffer
Cada componente do vetor tridimensional de vértices passa por verificação estrita:
```javascript
posArr[p * 3]     = Number.isFinite(finalX) ? finalX : lx;
posArr[p * 3 + 1] = Number.isFinite(finalY) ? finalY : ly;
posArr[p * 3 + 2] = Number.isFinite(finalZ) ? finalZ : lz;
```
Isso assegura que o buffer WebGL nunca corrompa a bounding sphere e não cause travamentos de GPU ou warnings de renderizador.

---

## 3. Sincronização 2D/3D das Escalas Configuráveis (`App.js`)

Ao alterar os sliders `cfgKiteScale` e `cfgKiteNameScale` no painel administrativo:
1. `App.js` aplica o valor imediatamente no `ThreeSkyScene` (para os modelos 3D e texturas de decalque).
2. `App.js` itera sobre `this.kites.values()`, recalculando a escala proporcional de cada pipa 2D no PixiJS (`kite.visualScale`) e o crachá de apelido (`tagContainer.scale.set(val)`).
3. Ao nascer novas pipas (`spawnKite`), as variáveis salvas `this.customKiteScale` e `this.customKiteNameScale` são injetadas no construtor.

---

## 4. Testes Automatizados Determinísticos (`tests/rope-geometry-p5.test.cjs`)

Adicionados 4 novos testes unitários com cobertura completa:
- `P5.1`: `ThreeLines.syncLine` gera buffers tridimensionais estritamente finitos sem `NaN` a partir da corda XPBD.
- `P5.2`: Bounding sphere do Three.js computada com sucesso e raio não-negativo.
- `P5.3`: `Line.js` 2D desenha o caminho poligonal dos nós físicos XPBD sem exceções.
- `P5.4`: `ThreeSkyScene` e `App.js` sincronizam `customKiteScale` e `customKiteNameScale` com tolerância total a ambientes sem `localStorage`.

**Resultado da suíte:** **216/216 testes aprovados (100% de sucesso)**.  
**Build de Produção:** Concluído com sucesso via Vite em 6.12s.
