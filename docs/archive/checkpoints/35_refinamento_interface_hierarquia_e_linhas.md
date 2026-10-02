> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 35. Refinamento de Interface, Hierarquia Visual e Limpeza de Fios

## Contexto e Diagnóstico

A interface do jogo contava com identidade própria bem estabelecida, mas sofria com **competição visual excessiva**:
- Banners volumosos ("NOVO LÍDER", "SEQUÊNCIA INSANA") cobriam o centro da arena onde os combates de pipa ocorrem;
- As linhas brancas normais formavam uma teia visual densa (ruído excessivo com 40 pipas na arena);
- Os nomes das pipas usavam textos inclinados/rotacionados que acompanhavam o ângulo da linha, gerando sobreposições e difícil legibilidade;
- O feed de cortes crescia em demasia e ocupava áreas centrais;
- A tabela TOP 5 ocupava largura excessiva no canto superior esquerdo;
- Caixas d'água no cenário 3D em primeiro plano competiam com a visibilidade dos bonecos na laje.

---

## Modificações Implementadas

### 1. P0 — Hierarquia Visual e Área Protegida Central
- **Área Protegida (10% a 75% da altura da tela)**: nenhum modal, banner gigante ou caixa central é exibido nessa faixa. O centro é dedicado exclusivamente ao voo das pipas e à ação dos relinhos.
- **Top Lanes em Formato Pílula**:
  - `leadershipBanner`: Top ~72px, formato pill compacto, desaparece após 2.5s.
  - `giftCelebration`: Top ~122px, pílula horizontal com ícone reduzido e duração dinâmica.
  - `competitionNotice`: Top ~174px, pílula com dropshadow sutil.
  - `maneuverToast`: Top ~220px, aviso estreito e elegante com brilho mint.
  - No modo retrato 2K (1440x2560) do OBS, as faixas usam `clamp()` com espaçamento vertical garantido sem sobreposições.

### 2. P1 — Redução Drástica de Ruído dos Fios e Tags Horizontais de Pipas
- **Opacidade dos Fios Normais**: reduzida de 0.85 para **0.28** (`frontend/src/entities/Line.js`). A teia de aranha visual foi totalmente eliminada.
- **Destaque em Manobras / Combate**: apenas pipas envolvidas em manobras ativas (`retao`, `despicar`, `aparar`, `perseguir`) ou dano crítico recebem linha destacada (`alpha: 0.92`), espessura reforçada e halo de brilho com cor semântica.
- **Tags de Identificação Horizontais**:
  - Removido texto rotacionado acompanhando a inclinação da pipa (`frontend/src/entities/Kite.js`).
  - Implementado container horizontal (`this.tagContainer`) com badge tipo dark pill (`#081622e6`), mini ícone (`👑`, `⚡`, `🛡️`) e nome abreviado (máx 14 caracteres).
  - Compensação automática de rotação (`this.tagContainer.rotation = -this.rotation`) garantindo leitura 100% estável e legível independentemente da direção do vento ou inclinação da pipa.

### 3. P2 — Feed de Batalha Compacto
- **Limite Estrito**: máximo de **3 eventos** simultâneos no container direito (`#killfeedContainer`).
- **Pills Horizontais Modernas**:
  - Bordas semânticas: Rosa/Vermelho para corte (`.feed-cut`), Verde para aparada (`.feed-parry`), Amarelo para presentes (`.feed-gift`).
  - Animação de entrada rápida (0.22s) e fade out suave com translação horizontal.

### 4. P3 — Liderança e Sequência Compactos
- Notificação de novo líder dura 2.5s em pill no topo e recolhe.
- O líder ativo é marcado de forma persistente com coroa dourada (`👑`) na tag da pipa, na lista de classificação e no card compacto `👑 LÍDER ATUAL`.

### 5. P4 — Compactação do TOP 5 e Hall da Fama
- **Tamanho Reduzido**: largura desktop reduzida de 256px para **220px** (~16% menor); em 1440x2560 portrait reduzida de 36vw para `clamp(250px, 24vw, 320px)`.
- **Informações Secundárias Agrupadas**: Recorde da live, maior sequência, reis derrubados e mais presentes ficam compactados em uma seção secundária no rodapé do ranking.

### 6. P5 — Jogadores na Laje Mais Presentes e Nomes Sem Cruzamento de Linhas
- Cabeça e avatar dos bonequinhos ampliados em **~18%** (`drawCircle(0, -49, 19.5)`, foto 38x38 px no PixiJS).
- Âncora física da linha fixada na mão direita (`13, -39`).
- **Nomes na Base da Laje**: o badge com nickname do jogador foi reposicionado para a base do boneco (`y = 12`, abaixo dos pés) em container pill escuro (`#061521` com borda sutil dourada). Como a linha é amarrada na mão e sobe em direção ao céu, **é fisicamente impossível a linha cruzar o nome do participante**.

### 7. P6 & P7 — HUD de Presentes e Padronização Semântica
- Formatação clara na barra inferior:
  - `🌹 ROSA · RETÃO` (Vermelho/Rosa: ataque)
  - `🍩 DONUT · DESPICAR` (Âmbar/Laranja: agilidade)
  - `🦫 CAPIVARA · APARAR` (Verde: defesa)
  - `🏆 PERFUME · PERSEGUIR` (Roxo: perseguição)
  - `💨 VENTO` (Azul/Ciano: estado neutro e direção)

### 8. P9 — Limpeza do Cenário 3D na Região Inferior
- Os reservatórios d'água azuis (caixas d'água) que ocupavam grande espaço na laje foram redimensionados para escala realista de 1000L (`scale: 16`), recuados para o fundo (`z: -35`) e empurrados para os cantos externos (`0.52 * fgBounds.width`), liberando totalmente o corredor central de combate.
- Removido poste de madeira vertical de primeiro plano que poluía a lateral direita da tela.

### 9. P10 — Sincronização e Validação Automatizada
- Corrigida checagem geométrica do corte em `frontend/src/engine/App.js` (`!hasInter?.hit`) e adicionado suporte a payload de checkpoint inline no evento `relinho:cut` em `backend/server.js`.
- Ambos os bundles de produção (`dist`) e teste (`dist-preview`) gerados e sincronizados com o servidor Express (`server.js`).
- Bateria de testes:
  - **129/129 testes unitários aprovados (100%)**.
  - **`tests/browser-smoke.mjs` executado com sucesso (exit code 0)** com headless Edge simulando OBS 1440x2560 a 100%.
  - Evidências visuais salvas em `tests/evidence/`.
