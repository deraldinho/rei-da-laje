> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint — layout da Live vertical 2K

Data: 24/09/2026. Alvo: monitor 1440 × 2560 (100% de escala do Windows), com suporte também a 1080 × 1920.

- Criado `frontend/src/ui/portrait-live.css`: HUD vertical com cabeçalho, placar, feed, chamadas para comentar, guia de presentes, status e controles ampliados. CSS ativado somente para viewport vertical com largura >= 700 e altura >= 1200 pixels; mantém layout anterior em desktop horizontal e telefone compacto.
- Criado `frontend/src/ui/LiveLayout.js`: fator exclusivamente visual calculado pelo viewport, limitado a 1,85× para pipas e bonecos; em 1440 × 2560 chega a 1,85×. Sem modificar coordenadas lógicas, movimento de vento, área de colisão nem pontuação.
- `Kite.js`: corpo, avatar, nome, barra de HP e coroa ampliados pela escala do contêiner, preservando multiplicadores de efeitos especiais.
- `RooftopPlayer.js`: escala dos bonecos e fotos da laje acompanha a pipa, inclusive após resize.
- `Line.js`: largura renderizada ampliada em vertical sem alterar geometria física da linha.
- Acrescentado teste automatizado `tests/portrait-layout.test.cjs` para o dimensionamento 1440 × 2560, 1080 × 1920, desktop e telefone.

Validação antes do ajuste final de linhas: 20/20 testes aprovados; build aprovado, com avisos preexistentes Vite CJS e tamanho do bundle. Browser smoke passou (boot, 40 pipas, portrait, overlay, combate). Reexecutar testes/build após alteração final da linha. A inspeção visual de legibilidade no OBS na resolução nativa continua necessária; o smoke headless não certifica leitura em celular.

Acesse http://localhost:3000/ e recarregue com Ctrl+F5; no OBS configure a fonte de navegador em 1440 × 2560 se esse for o canvas desejado. A escala de 100% do Windows pode permanecer inalterada. A porta 3000 serve a versão `frontend/dist` produzida pelo build.
