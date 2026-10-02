> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# Checkpoint — laje e bonecos maiores, sem interromper a Live

Data: 24/09/2026. Transmissão ativa; preservar sessão do OBS e conexão TikTok na porta 3000.

- `frontend/src/ui/RooftopLayout.js`: fonte única das dimensões da laje e da posição das âncoras. Em 1440 × 2560: laje de 144 px em vez de 58 px, e âncora em y = 2424. Em 1080 × 1920: 110 px; em desktop horizontal permanece 58 px.
- `SkyScene.js`: laje e silhueta dos prédios sobem juntas; objeto de telhado reposicionado para não desaparecer atrás da laje.
- `Kite.js`: linha e boneco seguem a mesma âncora inclusive em `resize`, sem alterar velocidades de vento ou regras de combate.
- `RooftopPlayer.js`: boneco com corpo, braços, pernas, cabeça e foto maiores; ganho visual adicional de 18% em live vertical grande.
- `tests/rooftop-live-layout.test.cjs`: testa alturas e âncoras nas resoluções 1440 × 2560, 1080 × 1920 e 1920 × 1080.

Validação: 25 testes automatizados aprovados. A compilação foi realizada em `frontend/dist-preview`, mantendo `frontend/dist` (versão servida em produção) intacta. Processo Node.js da porta 3000 não foi reiniciado; a fonte de navegador do OBS não foi recarregada.

IMPORTANTE: alterações em PixiJS não são aplicadas ao navegador já aberto automaticamente; ativar o novo visual exige trocar os arquivos servidos e recarregar a fonte OBS. Não fazer isso com pipas ativas, porque o estado da arena está no navegador. Planejar implantação segura com snapshot/rehidratação antes de atualizar a cena em plena Live.
