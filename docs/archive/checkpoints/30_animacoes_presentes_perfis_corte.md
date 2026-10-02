> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# Checkpoint 30 — animações de presentes, avatares e corte cinematográfico

Data: 24/09/2026 — x99. Continuação do bloco visual sem deploy/reload do OBS.

## Presentes e catálogo
- O conector `piratetok-live-js 0.1.5` não expõe uma lista global de presentes da sala; o evento `giftPanelUpdate` disponível no pacote contém somente room/version, não a lista de itens. Portanto o jogo mantém catálogo configurado + presentes efetivamente observados, sem inventar IDs globais do TikTok.
- `backend/tiktokEventNormalizer.js`: normaliza o formato real do conector. Foto do usuário vem de `avatarLarge/avatarMedium/avatarThumb.urlList`; ícone do presente vem de `gift.image.urlList`. Apenas HTTPS é aceito para imagens externas.
- `backend/giftCatalog.js`: catálogo persistente reconhece benefício por ID **ou nome**. Flor reutiliza Rosa e Universo reutiliza Leão mesmo se aparecerem com um ID novo. A API informa duração, teto, linha/especial e descrição do benefício; item desconhecido fica como animação automática sem buff inventado.
- `backend/views/admin.html`: painel lista presentes configurados e observados, imagem, diamantes, quantidade, benefício e duração/teto.
- `GiftAnimations.js/GiftShowcase.js/HUD.js`: qualquer presente recebe identidade visual determinística; quando o TikTok fornece o ícone real, ele aparece no anúncio e participa da animação sobre a pipa. Falha de CDN é silenciosa e mantém partículas/emoji.
- O bonequinho do doador na laje faz uma comemoração curta proporcional ao tier do presente.

## Fotos dos participantes
- `RooftopPlayer.js` e `Kite.js`: rede carregada via `Image()`; o Pixi só recebe a textura após `onload`. CDN quebrada nunca produz promise rejection no ticker; inicial/corpo permanecem como fallback.
- `GameRules`: comentário posterior pode enriquecer nome/foto de participante ativo ou em fila sem alterar a posição.
- `player:profile_updated`: participante ativo troca nome/avatar na pipa e o bonequinho da laje é recriado ao vivo.
- `playerSpawnPayload.js`: entrada direta e saída da fila compartilham exatamente o mesmo payload, incluindo foto, score/streak, `buffExpiresAt` e especiais com `expiresAt`.

## Layout
- A regra inline antiga que forçava `.gift-guide` a quebrar linha foi removida; CSS final mantém a barra de manobras compacta/nowrap.
- A laje vertical permanece 20% mais alta; o layout horizontal original continua preservado.
- Smoke confirma `flex-wrap: nowrap` em portrait.

## Relinho e corte
- `Line.js`: `triggerContact()` adiciona vibração visual curta quando linhas se cruzam. A física continua calculando somente os segmentos retos originais.
- `SparkEmitter.js`: `emitCut()` cria flash/ring curto no ponto exato da ruptura, com limite de bursts e limite existente de partículas.
- `FallingKite.js`: pipa cortada preserva cores do tipo (peixinho/raiada/carrapeta), rabiola visual, oscilação/rotação e rótulo com nickname durante a queda.
- Observadores e renderizador autoritativo usam o mesmo flash visual de corte; somente o renderizador autorizado continua pontuando.

## Validação
- `npm test`: **65/65 aprovados**.
- Testes adicionais cobrem formato real de avatar/gift do PirateTok, URLs inseguras, catálogo Flor/Universo, atualização de perfil ativo/fila e payload unificado.
- Build Vite da prévia aprovado. Último bundle validado antes das alterações backend-only do catálogo: `frontend/dist-preview/assets/index-BIAelatS.js` + CSS `index-D1XGW1kX.css`.
- Smoke Edge isolado passou com 40 pipas, atualização de avatar, barra compacta, presentes, timers 5/10/15s, manobras, vibração de linha, flash de corte, pipa caindo, ranking, checkpoint e zero exceções. Repetição do smoke mediu ~30 FPS no renderizador software; isso não é medição do OBS/GPU real.

## Ativação
- Alterações de frontend permanecem em `frontend/dist-preview`; não copiadas para `frontend/dist` neste checkpoint.
- Backend principal não foi reiniciado e fonte OBS não foi recarregada. Recursos backend novos que dependem de módulos carregados no startup entram em vigor somente no próximo reinício controlado.
