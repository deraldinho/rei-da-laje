# Diretrizes de Arquitetura de Jogo 3D & Live Streaming

1. **Integridade de Geometria WebGL**:
   - Nunca passar variáveis escalares isoladas (ex: `bonecoX`) para métodos que esperam `Vector3` (`{ x, y, z }`).
   - Sempre executar verificação de sanidade numérica (`Number.isFinite`) em posições de malhas e buffers de linhas dinâmicas antes de disparar `computeBoundingSphere()`.

2. **Enquadramento Seguro de Transmissão Vertical (9:16)**:
   - Em telas verticais de Live (TikTok/OBS), a mureta frontal da laje não pode cobrir o tórax dos personagens (altura máxima do parapeito = cintura do boneco, ~9 unidades).
   - O pitch da câmera e o ponto focal devem sempre manter corpo, carretilha e camiseta dos jogadores visíveis no terço inferior da transmissão.

3. **Controle de Escala e Densidade Visual pelo Admin**:
   - O streamer deve ter controles granulares no painel `/admin` para:
     a) Tamanho das Pipas (`kiteScale`)
     b) Tamanho dos Nomes sobre as Pipas (`kiteNameScale`)
     c) Escala do TOP 5 (`top5Scale`)
     d) Estilo do TOP 5 (`top5Style`: glass, cyberpunk, gold, minimal)
     e) Exibição de Estatísticas Extras (`top5ShowExtras`)
