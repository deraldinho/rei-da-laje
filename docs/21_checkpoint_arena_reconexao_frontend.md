> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — recuperação da arena e sincronização de novos renderizadores

Data: 24/09/2026. Contexto: jogo ativo na Live, usuário solicitou continuar novas funcionalidades sem reset do OBS.

## Implementação
- `backend/server.js`: nova leitura `GET /api/competition/arena` com identificador de sessão, jogadores ativos validados pelo backend, atributos de linha, escudos, especiais, ranking e fila. Nova sessão ao reiniciar Node invalida checkpoints de sessão anterior. Adicionada variável de ambiente `PIPA_DISABLE_TIKTOK_AUTOCONNECT=1` para testar servidor secundário sem conectar o perfil real ou disputar eventos da Live.
- `frontend/src/engine/ArenaCheckpoint.js`: checkpoint local limitado a 40 pipas e validade de 90 segundos; só restaura jogadores que constam no snapshot do backend da mesma sessão. Restringe HP ao máximo, coordenadas e efeitos temporários a intervalos seguros.
- `frontend/src/engine/App.js`: restaura jogadores ativos quando a fonte do jogo abre, resincroniza em reconexão Socket.IO e salva a cada 3 segundos quando conectado. Mantém pipas atuais durante falha temporária de rede. A recuperação detalhada (HP, posição) depende de checkpoint feito por versão que já tem este recurso; na primeira atualização, só dados básicos do backend estão disponíveis.
- Evita efeitos de estreia e pontuação duplicada ao restaurar: `spawnKite` só cria usuários ausentes; nomes e status vêm do backend. Reconciliador remove participantes que já não estão ativos somente se existiam antes do início da consulta, evitando apagar entradas novas recebidas durante o fetch.

## Validação
- `npm test`: 37 testes aprovados; `node --check backend/server.js` aprovado; frontend compilado em `frontend/dist-preview` (bundle `index-C6Vy83C1.js`).
- Servidor secundário em porta 3114, com reconexão TikTok intencionalmente desativada: POST de comentário simulado, GET do snapshot, id de sessão estável, 1 jogador ativo e buff de algodão: OK. Servidor secundário encerrado ao fim dos testes.
- OBS/servidor principal da porta 3000 não foram reiniciados ou recarregados. Antes dos testes, `/api/tiktok/status` da instância principal retornou conectado ao perfil `deraldinho73`; `/api/competition/stats` retornou dois jogadores ativos. Não interferir na partida.

## Limitações de ativação
- Versão nova está apenas em `frontend/dist-preview`, não no JS já em memória da fonte OBS. Endpoint novo só estará disponível na instância principal após o próximo reinício controlado do backend.
- Este checkpoint NÃO preserva jogadores através de reinicialização do backend porque `GameRules` ainda reside em memória. É necessário persistir backend antes de planejar deploy com reinício sem perda do ranking/participantes. A primeira troca para frontend com checkpoint restaura os dados do backend, mas não consegue recuperar o HP/posição exatos de navegador antigo sem checkpoint.
