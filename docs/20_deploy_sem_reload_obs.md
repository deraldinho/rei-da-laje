> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — publicação sem recarregar OBS

Data: 24/09/2026, horário do x99 ~21:03 (-03). O usuário autorizou publicar sem recarregar OBS.

- Confirmado servidor HTTP da porta 3000 ativo com `/api/competition/stats` e `/api/tiktok/status` da versão recente do backend; não foi parado/reiniciado neste procedimento.
- `frontend/dist` salvo em `backups/frontend-dist-before-live-deploy-20260924-210313`.
- Arquivos de `frontend/dist-preview/assets` copiados para `frontend/dist/assets`, preservando os assets antigos para não invalidar pedidos pendentes do navegador. Demais arquivos copiados, com `index.html` por último.
- Hash SHA-256 do index publicado igual ao da prévia; GET http://localhost:3000/ contém `index-CcxaWkC4.js`. Não houve recarregamento da fonte OBS nem reinício do Node.
- No momento da checagem o servidor respondia, `/api/competition/stats` indicava 0 participantes ativos e `/api/tiktok/status` indicava conexão TikTok desligada, perfil `deraldinho73` salvo e `retrying=true`. Publicação de frontend NÃO resolve a falha do transporte TikTok, nem confirma recebimento de comentários.
- O OBS que já abriu a página continua executando o JavaScript anterior até que sua página seja recarregada; sem reload não há ativação visual imediata das novas manobras/UI. A pasta publicada está pronta para novas aberturas e para uma atualização posterior controlada.
