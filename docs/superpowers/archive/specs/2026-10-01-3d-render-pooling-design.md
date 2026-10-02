> **ARQUIVADO / HISTÓRICO.** Este plano/spec registra trabalho anterior. Consulte [`docs/README.md`](../../../README.md) e a spec vigente em [`2026-10-02-hybrid-live-kite-combat-design.md`](../../specs/2026-10-02-hybrid-live-kite-combat-design.md).

# Design: pools 3D e corte sem travamento

Data: 2026-10-01
Projeto: Rei da Laje
Status: aguardando revisão final do usuário

## Objetivo

Manter toda a experiência visual em Three.js/3D e eliminar travamentos associados a corte, entrada/saída de jogadores e descarte de recursos WebGL.

A física XPBD, autoridade do backend, relinho, dano, presentes, manobras, ranking, aparo e regras de vitória não mudam.

## Evidência que motivou o desenho

A auditoria com 40 pipas isolou dois custos distintos. O modelo antigo de pipa cortada reutilizava `createKiteModel3D()` e produzia primeiro render pós-corte de aproximadamente 2,6 s no Edge headless/SwiftShader. Em execuções instrumentadas, o primeiro corte também aumentou os programas WebGL de 35 para 37.

Após introduzir Flyaway leve e pools, o custo lógico de `syncEntities()` caiu para poucos milissegundos, mas ainda ocorreram stalls quando recursos WebGL eram usados pela primeira vez ou destruídos durante a sessão.

O probe combinado — prewarm por draw real de todos os slots e nenhum `dispose()` durante os cinco cortes — reduziu os cinco renders pós-corte para aproximadamente 27–289 ms no mesmo ambiente, sem crescimento do pool nem novos programas WebGL.

## Arquitetura aprovada

A arena terá três famílias de recursos 3D reutilizáveis:

1. `ActiveVisualPool`: slots de participante ativo. Cada slot contém pipa, boneco e linha 3D já criados.
2. `FlyawayKite3DPool`: pipa cortada 3D leve, rabiola e linha pendurada.
3. `BrokenRope3DPool`: pedaço de linha que permanece ligado ao jogador após a ruptura.

A capacidade inicial será 48 slots por família. O limite cobre a arena atual de 40 participantes e mantém margem sem permitir crescimento não limitado.

Nenhuma dessas famílias executará `new Mesh`, `new Material`, `new BufferGeometry` ou `dispose()` no caminho crítico de um corte canônico.

Os objetos permanecem anexados aos grupos Three.js e ficam `visible=false` quando livres. Os `Map`s públicos continuam representando somente entidades ativas, preservando o contrato atual de sincronização.

## Ciclo de vida do participante ativo

Na entrada, `ActiveVisualPool.acquire(userId)` reserva um slot livre, zera todo estado transitório e aplica a identidade visual do novo jogador.

Durante a partida, o slot é atualizado pela sincronização normal: posição, rotação, HP, presentes, escudo, tornado, coroa, manobras, avatar e linha.

Na eliminação, o slot é ocultado e removido dos mapas ativos imediatamente, mas não é destruído. Após o Flyaway capturar a aparência necessária, o slot volta ao pool para reutilização.

## Identidade visual sem vazamento

Cada slot manterá seus próprios materiais e texturas estáveis. A identidade muda atualizando o conteúdo dessas texturas, não trocando o objeto `Texture` e não invalidando o shader quando a estrutura do material permanece igual.

Para corpo e avatar, a implementação usará `CanvasTexture` estável por slot. Ao reutilizar um slot, o canvas é redesenhado com cor, padrão, nome/avatar e `texture.needsUpdate` é usado apenas para upload do bitmap; o `Material` não recebe `needsUpdate` por simples troca de conteúdo.

Quando ocorre um corte, o `FlyawayKite3DPool` copia a aparência visual corrente para o canvas do slot de Flyaway. Assim a pipa voada preserva a identidade do derrotado mesmo que o slot ativo seja imediatamente reutilizado por outro participante.

O pool precisa limpar integralmente estado anterior: `userId`, nickname, HP, coroa, escudo, tornado, leader/king, timers visuais, rotação, escala, rabiola, buffers de linha, decal, badges e chaves de cache.

## Prewarm real

`renderer.compile()` não é suficiente como único prewarm. A evidência mostrou que alguns pipelines e buffers só são materializados no primeiro draw.

Antes de liberar a arena para a live, todos os slots dos pools serão renderizados pelo menos uma vez em uma etapa de prewarm controlada. Essa etapa ocorre fora do gameplay, sem aparecer na transmissão.

O prewarm precisa cobrir as variantes de geometria `tradicional`, `raia` e `peixinho`, materiais de corpo/decal, rabiola, linha ativa, linha rompida e Flyaway. Após o prewarm, todos os slots retornam a `visible=false` e estado neutro.

## Descarte e memória

Durante uma sessão ativa, remoções por corte, saída ou troca de participante não chamam `dispose()` nos objetos dos três pools. O objetivo é evitar sincronizações caras entre CPU e GPU no meio do combate.

A memória permanece limitada pela capacidade fixa dos pools. Recursos estáveis pertencem ao slot e são reutilizados, portanto o número de meshes, materiais, geometrias dinâmicas e texturas de slot não cresce com a duração da live.

`dispose()` completo será permitido apenas no `destroy()` da cena, encerramento do jogo ou reconstrução explícita da arena fora da sessão ativa. Reset lógico da partida somente devolve slots ao pool.

Se todos os 48 slots ativos estiverem ocupados, a regra de negócio existente de limite/fila continua sendo a autoridade. O renderer não cria um 49º slot silenciosamente.

Se o pool de Flyaway atingir a capacidade, a política será reutilizar o Flyaway mais antigo já expirado ou fora da área visível. Um Flyaway ainda elegível para aparo não pode ser roubado do pool.

## Fluxo canônico de corte

`game:cut_occurred` continua sendo o único evento que confirma a eliminação. O fluxo visual será:

`evento canônico -> captura aparência -> oculta slot ativo -> ativa Flyaway 3D -> ativa BrokenRope 3D -> atualiza placar/efeitos -> devolve slot ativo ao pool`.

Nenhuma decisão de vencedor, dano, ponto de corte ou aparo será movida para o renderer. O renderer apenas representa o estado canônico já decidido.

## Tratamento de falhas

Aquisição de slot ativo deve ser fail-closed: se não houver slot livre, o renderer não cria recursos fora do pool. A entidade permanece na fila/estado lógico conforme as regras existentes e um erro de diagnóstico é registrado.

Falha de prewarm não derruba a live. O jogo registra a falha, mantém o fallback atual do Three.js e não altera a autoridade física ou de rede.

Um slot liberado passa por `resetVisualSlot()` antes de voltar à lista livre. Se o reset detectar estado impossível ou recurso ausente, esse slot é marcado como inválido e não é reutilizado até reconstrução da cena.

## Testes e critérios de aceitação

A implementação seguirá TDD. Primeiro entram testes RED para aquisição/liberação/reuso, isolamento de identidade, capacidade fixa, ausência de `dispose()` no corte e ausência de alocação WebGL no caminho crítico.

O benchmark de navegador usará 40 pipas 3D e cinco cortes canônicos consecutivos. Deve confirmar que o tamanho dos pools não cresce, que nenhum novo programa WebGL aparece após o prewarm e que os mapas ativos/flyaway/broken refletem exatamente cada corte.

O gate de referência no Edge headless/SwiftShader será: `syncEntities()` pós-corte <= 80 ms e primeiro render pós-corte <= 300 ms. O valor absoluto não representa uma GPU real; ele é um gate de regressão comparável no mesmo ambiente.

Também serão executados a suíte unitária completa, build de produção, browser smoke, benchmark de 40 pipas existente e soak. A correção não é considerada concluída se qualquer gate relevante permanecer RED.

## Fora de escopo

Este trabalho não altera física XPBD, algoritmo de colisão, backend canônico, TikTok, presentes, manobras, regras de aparo, balanceamento, ranking ou desenho artístico da arena.

Redução adicional de draw calls, LOD/crowding e consolidação dos caches legados continuam como otimizações separadas depois que o ciclo de vida 3D estiver estável.
