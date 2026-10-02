> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — perfil TikTok salvo e conexão automática

Data: 24/09/2026. Perfil padrão salvo: `@deraldinho73`, em `backend/data/live-profile.json` (somente o nome público, sem senha nem cookies).

- `backend/savedLiveProfile.js` normaliza/valida o nome, lê e grava atomicamente o perfil no disco. O painel grava o novo perfil ao iniciar uma conexão manual.
- `backend/server.js` tenta a conexão automaticamente 1,5 s após inicialização, quando existe perfil salvo. Se a Live estiver offline ou a conexão falhar, repete tentativa a cada 60 s. Evita tentativas sobrepostas.
- Botão Desconectar suspende novas tentativas automáticas até clicar Conectar novamente ou reiniciar o jogo. O estado da conexão real continua independente da conexão Socket.IO com o jogo.
- `backend/views/admin.html` preenche automaticamente o campo com o perfil salvo, exibe tentativa automática e informa o comportamento ao operador.
- Teste `tests/saved-live-profile.test.cjs` certifica leitura, gravação, substituição, normalização e rejeição de nomes inválidos. 26/26 testes aprovados e frontend compilado.

**Limite operacional:** alterações de backend só entram em vigor na próxima inicialização do Node.js; nenhuma reinicialização do servidor nem reload do OBS foram realizados durante a Live. O arquivo de perfil já está salvo. A conexão automática depende de a transmissão estar disponível e de o conector independente conseguir receber os eventos; não é garantia de funcionamento da API não oficial.
