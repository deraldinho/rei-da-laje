> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — isolamento do conector TikTok e erro HTTP/2

Data: 24/09/2026. Evidência inicial: Node.js 26.3.0 terminava com `UND_ERR_SOCKET` em `ClientHttp2Stream` após falha de conexão remota; logs antigos do Euler Stream traziam assinatura HTTP 403.

## Diagnóstico e alteração
- `piratetok-live-js@0.1.5` mantém `connect()` pendente durante a vida da Live, enquanto emite `connected` ao localizar a sala. O backend anterior esperava indevidamente que o método retornasse antes de exibir a conexão.
- `backend/tiktokService.js` aguarda `connected` com timeout de 15 segundos e listener de erro; a resposta representa sala localizada, não confirmação de recebimento de comentários.
- `backend/isolatedTikTokClient.js` e `backend/tiktokWorker.js` executam a biblioteca TikTok num subprocesso. Erro HTTP/2 não tratado neste subprocesso não derruba o backend do jogo; a queda é encaminhada como status de desconexão.
- A interface distingue sala encontrada e evento realmente recebido; primeiro chat, presente ou curtida confirma a passagem do evento pelo conector.
- O antigo HTTP 403 não é resolvido por essa mudança; a integração atual não usa o conector antigo que o emitia.

## Validação
- `npm test`: 21/21 testes aprovados, incluindo erro de transporte e conexão assíncrona; `npm run build`: aprovado com avisos anteriores do Vite.
- Servidor isolado na porta 3112: POST de conexão com `@deraldinho73` retornou `success=true` e um ID de sala; GET de status retornou conectado. Não foi comprovado o recebimento de comentários ou presentes reais, nem a estabilidade de transmissão prolongada.
- A porta principal 3000 executa processo anterior até sua reinicialização. Evitar reiniciá-la no meio da Live sem combinar, porque reinicializar remove pipas em memória.

## Pendente
Solicitar comentário real de usuário na sala e confirmar evento `player:spawn` no painel e na tela do jogo. Caso não chegue, investigar handshake WebSocket da biblioteca, sem interpretar a localização da sala como prova de sucesso do fluxo de eventos.
