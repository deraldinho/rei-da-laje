# Documento 82: Ciclo Completo de Combate Físico Autêntico, Pipa Voada, BrokenHandRope e Aparo XPBD

## 1. Contexto e Motivação
Na física de pipa tradicional brasileira ("Pipa Combate"), o ápice da transmissão ao vivo decorre da **consequência física visível do corte**:
1. O corte parte fisicamente a linha no ponto exato do relinho.
2. A metade inferior da linha não desaparece: ela permanece ancorada à mão do jogador na laje e desaba com gravidade e vento (`BrokenHandRope`).
3. A metade superior da linha permanece atada ao cabresto da pipa cortada (`FlyawayKite`), chicoteando ao vento.
4. A pipa cortada perde o equilíbrio de tração, rodopia sob sustentação e arrasto e plana por até 25 segundos, descendo suavemente pelo cenário 3D.
5. Qualquer outra pipa ativa que cruzar a linha pendurada resgata a pipa em um **APARO**, ganhando bônus e celebrando com a plateia da live.

## 2. Diagnóstico das Lacunas Anteriores ("O Que Estávamos Deixando de Enxergar")
1. **Desaparecimento Imediato da Linha da Mão**: Ao ocorrer o corte, o jogador perdedor era removido do array de pipas ativas, fazendo com que a linha 3D e 2D sumisse instantaneamente no mesmo frame.
2. **Pipa Voada sem Linha no 3D**: `ThreeSkyScene` renderizava o modelo 3D da pipa cortada sem nenhuma representação física da linha pendurada.
3. **Morte Prematura da Pipa no Ar**: `FallingKite` e `ThreeSkyScene` descartavam a pipa voada assim que atingisse `lajeWorldY + 16.5` ou aos 3.5 segundos, evaporando a pipa em pleno ar antes de alcançar os telhados ou o solo.
4. **Bug de Coordenadas Globais no PixiJS**: A linha pendurada em 2D era desenhada com coordenadas absolutas de mundo dentro de um `PIXI.Container` já transladado, causando deslocamento para fora da tela.
5. **Aparo com Reta Simplista**: `checkAparos` testava uma reta simples mão→pipa contra a linha da voada, ignorando a curvatura real da corda física XPBD da pipa ativa.
6. **Seleção Incorreta de Segmento Perdedor**: O objeto de colisão `inter` não propagava `kiteA`, `kiteB`, `s` e `t`, gerando corte no segmento incorreto quando o perdedor era a pipa A.
7. **Ruptura por Excesso de Tração ("Estourou na Mão")**: A tração máxima (`maxTension`) rompia a corda no XPBD mas não propagava para o ciclo de vida do jogo.

## 3. Implementações Realizadas

### 3.1. Entidade `BrokenHandRope` (Linha Rompida da Mão)
- Criada classe [`frontend/src/entities/BrokenHandRope.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/entities/BrokenHandRope.js).
- O nó 0 permanece estritamente ancorado na mão/carretel do operador na laje.
- Os nós 1 a N sofrem aceleração gravitacional e arrasto do vento com integração Verlet e restrição elástica.
- Colisão com a superfície da laje (`floorY`), onde a linha repousa e desvanece suavemente ao longo de 8 segundos.
- Sincronização 2D no PixiJS e 3D no Three.js via `THREE.Line` dinâmica em `ThreeSkyScene`.

### 3.2. Pipa Voada (`FlyawayKite` e `FallingKite`)
- Duração de vida estendida para 25 segundos, permitindo perseguição e disputa de aparo.
- Renderização da linha pendurada corrigida para coordenadas relativas locais (`node.x - this.x`, `node.y - this.y`).
- Preservação do momentum linear pré-corte nos nós da linha (`prevX = x - vx * dt`).
- No Three.js (`ThreeSkyScene`), criação de `THREE.Line` dinâmica (`hangingLine`) conectada ao cabresto inferior da pipa voada, ondulando ao vento e caindo até o chão profundo do cenário (`lajeWorldY - 140`).

### 3.3. Soberania do `RopeCollision` e Propagação Cirúrgica
- Em [`frontend/src/engine/App.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js), quando ambas as pipas possuem corda XPBD, `RopeCollision` tem soberania estrita sobre a reta geométrica.
- Objeto `inter` transmite `kiteA`, `kiteB`, `segmentIndexA`, `segmentIndexB`, `s` e `t`.
- `Physics.finalizeCut` seleciona o segmento exato da pipa derrotada.

### 3.4. Detecção de Aparo com Corda Física XPBD
- [`checkAparos`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js) agora itera sobre `activeKite.rope.getSegments()`, detectando o entrelaçamento físico real entre a corda ativa curvada pelo vento e a linha solta da pipa voada.

### 3.5. Ruptura por Tensão Máxima ("Estourou na Mão")
- Em [`frontend/src/engine/physics/KiteDynamics.js`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/physics/KiteDynamics.js), se a tração exceder o limite mecânico do material (`maxTension`), sinaliza `kite.isTensionBroken`.
- [`handleTensionBreak`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/frontend/src/engine/App.js) converte a pipa em voada e gera a `BrokenHandRope` na laje, com aviso sonoro e no feed da live.

## 4. Validação e Testes
- Adicionado teste [`tests/combat-full-cycle-voada-broken-rope.test.cjs`](file:///c:/Users/deral/Competição%20de%20pipa%20tiktok%20live/tests/combat-full-cycle-voada-broken-rope.test.cjs).
- **238/238 testes automatizados aprovados com 100% de sucesso.**
