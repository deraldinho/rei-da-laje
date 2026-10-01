# Checkpoint 31 — estabilidade da conexão TikTok Live

Data: 25/09/2026 ~02:46–03:00 (-03), x99. Produção na porta 3000 mantida em execução durante toda a auditoria; sem restart do backend/OBS.

## Sintoma confirmado em produção

A conexão TikTok da versão atualmente ativa não sustenta a Live. Leituras consecutivas mostraram crescimento rápido de relocalizações/falhas. Na última leitura desta rodada:
- connected=false, retrying=true;
- failures=20;
- roomFoundCount=18;
- transportWarnings=32;
- internalRetry attempt=5/6, delay=8000 ms;
- lastError=TRANSPORT_DISCONNECTED;
- Arena continua saudável: authorityActive=true e FPS=60.

Portanto o problema não é o render Pixi/OBS; está na política de reconexão do conector TikTok em execução.

## Causa raiz

piratetok-live-js 0.1.5 mantém um contador local de tentativas dentro de TikTokLiveClient.connect(). O contador aumenta toda vez que um WebSocket fecha e não é zerado após uma reconexão bem-sucedida. A Live pode reencontrar a sala e voltar a trafegar eventos, mas após fechamentos sucessivos o contador inevitavelmente supera _maxRetries, emite disconnected e encerra o ciclo.

Isso explica o padrão observado de “sala localizada” várias vezes seguido por queda total e novo worker.

## Correção implementada (ainda não ativa na produção)

- Novo backend/tiktokWorkerSupervisor.js.
- tiktokWorker.js agora usa ciclos curtos do cliente upstream: timeout HTTP 15 s, maxRetries interno 2, staleTimeout WSS 45 s.
- Quando um ciclo upstream termina, o supervisor cria outro TikTokLiveClient dentro do mesmo worker, renovando ttwid/WSS e zerando o contador defeituoso do pacote sem derrubar o GameServer.
- A sala reencontrada gera room_relocated, mas não é tratada como recuperação completa.
- A recuperação só gera transport_restored quando existe atividade real de WSS: chat, gift, like, member, roomUserSeq, control, roomMessage.
- transport_activity mantém lastTransportActivityAt para telemetria mesmo quando ninguém comenta/presenteia.
- Até 6 ciclos de recuperação são permitidos. Se realmente falharem, o worker entrega SUPERVISOR_EXHAUSTED ao fallback externo.
- server.js agenda substituição externa aproximadamente 750 ms após queda definitiva, em vez de depender apenas do polling de 10 s.
- liveEnded é tratado separadamente como LIVE_ENDED.
- transportRecoveries, lastTransportRecoveredAt e lastTransportActivityAt são expostos nas APIs de status/health após ativação da nova versão.
- msgId/roomId reais dos presentes foram normalizados para deduplicar replay após reconexão; janela atual de deduplicação: 2 minutos.

## Outras correções encontradas durante a mesma validação

- Autoridade de combate endurecida: somente o socket dono pode consumir escudo e confirmar corte; sem owner nenhum corte é aceito.
- FPS do health zera quando a autoridade cai, evitando mascarar executor morto.
- Staging antigo das portas 3109–3112 encerrado; produção 3000 preservada. Esses stagings não tinham TikTok workers, portanto não eram a causa da queda.
- Stress de 6000 participantes reproduziu falha de snapshot antes da correção. Runtime agora limita 40 ativos + 1000 na fila, com histórico limitado/prunado. O mesmo stress passou com snapshot de ~936 KB.
- Buff ainda válido de participante em fila ou que presenteou antes de comentar sobrevive ao restart.
- Layout smoke: a verificação antiga de posição da laje foi atualizada para relações geométricas reais; barra permanece separada dos bonequinhos.

## Validação

- npm test: 86/86 aprovados.
- Supervisor sintético: 20 ciclos saudáveis consecutivos de fechamento/reabertura de WebSocket sem disconnected externo.
- Testes cobrem: primeira conexão fatal rápida quando Live realmente não existe, recuperação interna, fallback após esgotamento, sala reencontrada vs transporte ativo, liveEnded, deduplicação de gift por msgId e telemetria.
- Browser smoke completo: passou sem exceções; repetição mediu ~29.94 FPS no Edge headless/SwiftShader. Produção real continua reportando 60 FPS.
- Persistência: testes de restart/fila/buffs aprovados.

## Ativação

A produção na porta 3000 ainda executa o código carregado antes deste checkpoint. A correção do supervisor TikTok depende de restart controlado do backend. Não foi reiniciado nesta auditoria.
