# 03. Física 3D da pipa, linha e relinho

**Status:** vigente
**Data:** 02/10/2026

Este documento define a autoridade física do jogo. Nenhum sistema de live, comentário, presente, câmera ou efeito visual pode ignorar estas regras.

## Autoridade de movimento

A trajetória da pipa emerge de:

`WindField + KiteAttitude + KiteAerodynamics + PlayerIntentController + SpoolController + KiteDynamics + RopePhysics`

- `KiteDynamics` é autoridade de posição, velocidade e atitude.
- `SpoolController` controla recolhimento/liberação de linha.
- `RopePhysics` controla comprimento, folga, tensão e geometria XPBD.
- Three.js/Pixi apenas renderizam o estado físico.

Não existe animação pré-gravada alterando `x/y/z`, nem renderer devolvendo coordenadas para a simulação.

## Vento

O vento deve ser coerente, suave e com memória temporal. Mudanças de direção reorganizam a arena inteira e constituem o mecanismo normal de criação de PvP.
## Contato linha-linha

Um X visual na câmera não é contato. O narrow phase precisa confirmar distância tridimensional entre segmentos dentro do raio configurado.

`rope geometry -> broad phase -> narrow phase 3D -> LineContactManager`

Somente contatos confirmados entram em relinho.

## Abrasão e ruptura

O resultado físico depende de:

- velocidade relativa de deslizamento;
- tensão de cada linha;
- ângulo local de contato;
- propriedades virtuais do par de materiais;
- duração do contato;
- desgaste já acumulado no segmento.

`LineAbrasionModel` produz desgaste localizado. `LineStructuralModel` trata sobrecarga/fadiga sustentada separadamente. Ambos convergem em `LineBreakSystem`, que rompe um segmento físico específico.

Nenhum gift ou comentário pode chamar um equivalente a `damageEnemy()` ou `forceCut()`.

## Orçamento permanente

- até 40 pipas;
- fixed step 60 Hz;
- `maxTracked <= 12`;
- `maxSolved <= 3`;
- sem scan ingênuo de todos os segmentos contra todos os segmentos por frame.

## Tensão transmitida pelo vento

A tensão da linha não depende apenas de a corda estar geometricamente reta. O modelo vigente soma duas cargas aerodinâmicas baratas:

- arrasto transversal sobre o comprimento exposto da linha;
- carga terminal quando o vento empurra a pipa para longe da mão no eixo do tirante.

A carga terminal altera somente `RopePhysics.tension`; ela não cria linha, não teleporta a pipa e não substitui o `SpoolController`. Assim, uma linha ainda pode manter barriga visual/XPBD e ao mesmo tempo permanecer funcionalmente tensionada pelo vento.

Regressão: `tests/kite-tether-wind-physics.test.cjs` cobre o caso de vento forte alinhado ao tirante, observado durante a Live de 02/10/2026.

## Orçamento visual adaptativo do 3D

O `RuntimeProfiler` mede agora o tempo real gasto pelo `gameLoop`; o delta simulado não é usado como FPS observado. Em arena cheia, o orçamento visual reduz apenas detalhes pequenos: fitilhos/varetas/cabresto por LOD e o segundo passe de glow das linhas ociosas. Rei, Líder, relinho ativo, manobras e linhas em combate recuperam o destaque imediatamente. Física, contato, abrasão e limites do `LineContactManager` não são alterados.

### Checkpoint de 40 pipas — 02/10/2026

Benchmark browser final: 40/40 pipas, 240 amostras, `p95=27,5 ms`, `p99=34,2 ms`, máximo `35,5 ms`, zero exceções, `maxTracked=12`, `maxSolved=3` e `maxCold=96`. No profiler interno, `render3d p95=24 ms`, colisão média ~`0,50 ms` e física média ~`1,59 ms`.

## Cone físico de voo e vento frontal

O voo passa a usar um volume convexo ancorado na mão de cada jogador, aberto em direção ao horizonte. O cone não teleporta nem reposiciona a pipa: `FlightCone` aplica força de recuperação antes da borda e limita apenas a componente de velocidade que atravessaria o volume em um único passo.

`ForwardWind` garante componente frontal positiva (+Z), velocidade mínima equivalente a 30 km/h e variação lateral/vertical contínua. `Wind.sample`, `sampleAt` e o vento local de vórtices preservam essa autoridade física sem fabricar comprimento de linha.

Com o novo voo tridimensional, a abrasão ambiental foi recalibrada para `abrasionK=0.10` e `maxWearPerTick=0.05`. Em 40 pipas com vento moderado, o primeiro corte fica aproximadamente na janela de 5–12 s sem massacre da arena, mantendo `maxTracked=12` e `maxSolved=3`.

## Estado canônico entre navegadores

A autoridade de simulação continua única para impedir que duas abas decidam cortes diferentes. A cada 150 ms, somente o navegador autoridade envia `arena:live_state` ao backend. O backend sanitiza o snapshot em memória e retransmite `arena:state` aos demais navegadores, sem persistir em disco nessa frequência.

O snapshot vivo inclui posição 3D, velocidade, HP da linha, tensão, comprimento liberado, desgaste por segmento e nós XYZ da corda. OBS, Chrome, Edge e previews aplicam o mesmo estado canônico; observadores não calculam dano próprio. O evento `game:cut_occurred` continua sendo a única confirmação irreversível de corte/voada/pontuação.

### Validação canônica do corte por segmentos 3D

O claim de corte agora envia `contactEvidence` com os dois IDs de linha, índices dos segmentos, frações `s/t` e raio de contato. O backend usa o checkpoint anexado ao claim para reconstruir esses dois segmentos em 3D e recalcular o ponto canônico do corte.

Isso elimina falsos `PHYSICAL_POINT_MISMATCH` causados por `cutX/cutY` defasados entre o frame do solver e o snapshot, sem liberar cortes impossíveis: segmentos separados continuam rejeitados como `PHYSICAL_SEGMENT_MISMATCH`.

Regressão: `tests/p15-cut-continuity-multi-relinho.test.cjs` cobre aceitação de contato 3D real, rejeição de segmentos separados e presença da evidência no payload do frontend.

## Auto size do mundo físico

A física não é calibrada para uma resolução fixa. `PhysicsScale.physicsWorldScale()` calcula uma escala uniforme a partir da área atual do canvas/viewport; 1080×1920 permanece apenas como unidade interna de normalização.

A mesma escala é aplicada a comprimento/capacidade do carretel, velocidade de puxar/soltar, profundidade Z, separação entre pipas, forças aerodinâmicas, gravidade, vento sobre a corda e raio físico de contato. A velocidade de deslizamento usada pela abrasão é normalizada pela escala, evitando que uma tela maior cause mais dano apenas por medir velocidades em mais pixels por segundo.

Durante resize, posição, velocidade, nós XYZ e capacidade da corda acompanham a nova dimensão, preservando a fração de linha já liberada. Assim, trocar a dimensão do canvas não cria nem remove linha de forma artificial.

Em arenas esparsas de 3–8 pipas, o spawn protegido pode ser recalculado enquanto novos participantes entram; após o fim da proteção, o layout nunca teleporta a pipa. Bots do Admin usam manobras físicas pelo mesmo motor de intenção, sem selecionar adversário ou aplicar dano artificial.

### Checkpoint autosize — 03/10/2026

Validação específica em 1432×2428: `physicsScale=1,2949`, capacidade de linha ~2331 unidades, quatro bots com autoridade física e corte canônico real. Regressão completa: 551/551 testes. Benchmark de 40 pipas: 40/40, `p95=20,8 ms`, `p99=28,9 ms`, zero exceções, `maxTracked=12`, `maxSolved=3` e `maxCold=91`.
