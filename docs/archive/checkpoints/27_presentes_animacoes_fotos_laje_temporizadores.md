> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 27 — animações de presentes, foto na laje e duração dos benefícios

Data: 24/09/2026 no projeto x99. Continuar sem alterar fonte OBS, sem reiniciar servidor da Live.

## O que mudou
- `backend/giftCatalog.js`, `backend/tiktokService.js`, `backend/server.js`: catálogo persistente dos presentes conhecidos e efetivamente recebidos, `GET /api/gifts/catalog`, celebração `gift:celebration` para todo presente reconhecido ou novo. O TikTok pode variar o catálogo por região, Live e data; não se alega acesso à lista global completa. Presente desconhecido tem animação própria determinística por ID, mas não ganha poder sem regra definida. Presentes reconhecidos preservam vantagens já definidas; ranking conta presente de participante ativo.
- `frontend/src/engine/GiftAnimations.js`, `GiftShowcase.js`, `App.js`, `HUD.js`, `frontend/index.html` e CSS: estilos de partículas exclusivos para Rosa, Flor, Donut, Capivara, Perfume, Leão e Universo e efeito determinístico para qualquer novo ID; celebração com nome do remetente, nome do presente, multiplicador e camada Pixi de duração limitada. Até 4 celebrações simultâneas; fila visual de até 8 anúncios. `gift-celebration[hidden]` respeitado. Erro PixiJS `drawStar` detectado no smoke e corrigido com polígono manual; não reaplicar versão com drawStar.
- `RooftopPlayer.js`: usa URL HTTPS da foto de perfil já fornecida pelo TikTok no evento `chat`, com recorte circular, borda e inicial de fallback se falhar; nome curto acima da cabeça. Foto só fica disponível quando o TikTok a fornece e o navegador consegue carregar a URL. Não inventar foto para participantes sem URL.
- `RooftopLayout.js`, `game.css`, `portrait-live.css`: laje vertical 20% mais alta, cenário/âncora/boneco consistentes; arena horizontal preservada. Guia de manobras e footer reduzidos e deslocados para o rodapé, para não cobrir os bonequinhos na laje.
- `backend/rules/buffManager.js`, `backend/server.js`, `backend/tiktokService.js`: expirations absolutos `expiresAt` da linha e especiais enviados por sockets e no snapshot da arena. `frontend/src/engine/GiftBenefitTimer.js`, `frontend/src/entities/Kite.js`, `App.js`: relógio MM:SS/H:MM:SS próximo da pipa por linha, tornado, proteção e manobra; reavaliação a cada segundo, relógio absoluto evita recomeçar após atualizar tela. No cliente, efeitos também deixam de valer quando o relógio expira, inclusive com FPS baixo; servidor continua fonte autoritativa. Combo acumula tempo no backend até limite atual; timers de tornado e proteção são independentes da linha. Presentes não configurados geram animação, não tempo de buff inventado.

## Testes
- `npm test`: 52/52 aprovados, incluindo catálogo dinâmico, presente não reconhecido sem buff, identidades visuais, 20% de laje vertical, combo/timers independentes e relógio absoluto após reload.
- Vite `frontend/dist-preview`: build aprovado, JS final `index-B_zNh_du.js` e CSS `index-Cfhll_NJ.css` (aviso não bloqueante de bundle >500 kB).
- `node tests/browser-smoke.mjs`: Edge isolado na porta 3107 com TikTok autoconnect desligado, 40 pipas, restauração, presente conhecido e desconhecido, catálogo, efeitos Pixi e duração visível de kevlar/aparada/tornado/proteção, TOP ranking e jogo sem exceções: aprovado. Os testes não foram executados na fonte OBS.

## Ativação
- Mudanças compiladas somente em `frontend/dist-preview`; NÃO publicadas em `frontend/dist` nem ativadas no JS já aberto na fonte OBS. Backend `server.js`/`tiktokService.js` com novo endpoint/evento está modificado em disco; somente entrará em produção após reinício controlado do backend. Para nova celebração ser recebida pela tela, tanto backend quanto frontend devem estar na mesma versão. Não reiniciar conexão TikTok/arena sem permissão clara do usuário.
