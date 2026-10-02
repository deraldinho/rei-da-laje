> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint — novas mecânicas P1–P4 e estabilidade da Live

Data: 24/09/2026. Transmissão principal ativa no OBS: NÃO reiniciar Node/porta 3000 nem atualizar fonte do navegador sem recuperação comprovada de estado.

## P1 — combate
- Linha crítica visual abaixo de 20% de HP, geometria de corte perfeito (+12% de dano quando o cruzamento é perto da ponta), choque em movimento rápido (+10%), HP regenerado em 10 min para recuperar 100 pontos e preservação do desgaste quando se aplica/expira uma melhoria de linha. Mantidas proteção inicial, escudo e invulnerabilidade existentes.

## P2 — manobras de presentes
- `frontend/src/engine/Maneuvers.js`: retão (Rosa/Flor), despicar (Donut), aparar retão (Capivara), perseguir (Perfume), aparar despicar (Leão/Universo), com alcance/duração delimitados e dano/defesa moderados. O presente não garante corte; alvos selecionados pela proximidade e movimento é aplicado após vento. `competition:maneuver` emitido pelo serviço após presente reconhecido; efeitos anteriores dos presentes preservados.

## P3 — competição
- `gameRules.js`: estatísticas de cortes, derrotas, entradas e sequência da sessão; placar `GET /api/competition/stats`; fila visível e evento de jogador que cortou o líder; anúncios de 2, 3, 5 e 10 cortes consecutivos. Liderança por cortes permanece independente do status de coroa por 5 consecutivos.

## P4 — cenário e participação
- Correntes verticais ascendentes/descendentes e laterais, indicador de intensidade no HUD; avisos das manobras, fila e recorde da Live no frontend. A entrada por comentário, retorno por novo comentário após corte e boneco da laje já existiam.

## Queda do conector TikTok — logs do operador
- Sala localizada mas transporte HTTP/2 termina, seguido de `WORKER_EXIT`; localização da sala NÃO garante recebimento de chat/presentes. `isolatedTikTokClient.js` agora só informa uma falha por ciclo de vida; `tiktokService.js` libera referência ao worker encerrado, limpa status e mantém dados da arena; `server.js` retenta perfil salvo após 10–60 s com limite de simultaneidade; `tiktokWorker.js` não encerra automaticamente o processo se `connect()` retornar enquanto a Live continua.
- Reconexão programada é mitigação, não solução garantida para quedas originadas no TikTok/biblioteca não oficial. A transmissão real contínua e recebimento de eventos ainda requerem teste operacional.

Validação: 35 testes automatizados aprovados e verificação de sintaxe Node. Build frontend `frontend/dist-preview` aprovado (aviso preexistente de tamanho de bundle), sem tocar em `frontend/dist` nesta etapa. **Não houve reinício do servidor da Live nem troca/reload de fonte OBS**; a versão já carregada em memória ainda tem a lógica anterior. O backend modificado só entra em funcionamento quando reiniciado em janela controlada.
