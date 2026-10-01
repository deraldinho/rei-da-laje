# Checkpoint — conector independente do TikTok Live

Data: 24/09/2026.

- Substituído o cliente Euler Stream por `piratetok-live-js@0.1.5` dentro de `backend/tiktokService.js`.
- A biblioteca afirma conectar diretamente por WebSocket sem serviço de assinatura de terceiros; NÃO é uma API oficial do TikTok e sua disponibilidade pode variar.
- Comentários, presentes e curtidas são normalizados ao formato atual do jogo; IDs numéricos convertidos em texto e dados do usuário vindos de `event.data.user`.
- Painel mantém estado da conexão independente do estado do servidor e apresenta falha sem exibir detalhes técnicos sensíveis.
- Backend ainda necessita validar eventos reais, especialmente estrutura dos presentes e fotos; não usar na transmissão pública como recurso certificado.
- Teste de `checkOnline('deraldinho73')` retornou usuário não ao vivo; `POST /api/tiktok/connect` em porta de ensaio 3111 retornou Live não encontrada. Isso NÃO prova que a Live estava encerrada: pode haver divergência de usuário ou falha na resolução da sala.
- Testes automatizados incluem mock do novo conector; testes reais de comentários e presentes continuam pendentes.
- `npm install` reportou 2 vulnerabilidades na árvore do projeto (1 moderada e 1 alta); auditar antes de expor servidor publicamente. Rotas de simulação e administração continuam sem autenticação.

Procedimento: confirme o @ exato no endereço da Live pública, abra o painel local `/admin`, informe somente o @ e clique Conectar; quando status indicar Live conectada, comente na transmissão e confira a entrada de uma nova pipa no jogo aberto na mesma máquina.
