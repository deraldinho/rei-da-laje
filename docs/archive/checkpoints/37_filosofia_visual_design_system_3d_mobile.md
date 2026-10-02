> **ARQUIVADO / HISTÓRICO.** Este documento registra uma etapa anterior e não define a regra vigente. Consulte [`docs/README.md`](../../README.md) e [`00_arquitetura_vigente.md`](../../00_arquitetura_vigente.md).

# 37. Síntese Visual: Filosofia, Design System Frontend, Mobile 9:16 e Experiência 3D

Este documento consolida a convergência das 4 diretrizes ativadas (`/canvas-design`, `/frontend-design`, `/mobile-design`, `/3d-web-experience`) aplicadas à identidade do jogo **Rei da Laje**.

---

## 1. Canvas Design: Manifesto da Filosofia Visual

### Nome do Movimento: *Cinética do Concreto e Linha* (Kinetic Concrete & Cord)

A vastidão do céu tropical encontra a organicidade caótica e poética das encostas urbanas brasileiras. Em vez de uma sobrecarga de elementos decorativos artificiais, a estética se apoia na tensão física entre a leveza etérea do papel de seda ao vento e o peso sólido do concreto e tijolo aparente. Cada vetor desenhado no espaço não é mera interface: é um condutor de força, tensão mecânica e risco iminente de ruptura.

O espaço e a forma são organizados pelo contraste radical. O horizonte aberto convida ao olhar ascendente, onde a densidade urbana é empurrada para as margens estruturais, criando uma arena limpa de confronto aéreo. A geometria das pipas — polígonos puros, agudos, em constante rotação — estabelece um ritmo visual frenético que dialoga com o silêncio sereno das nuvens ao fundo.

A paleta cromática transcende clichês primários. Ela bebe da cerâmica queimada dos morros, do azul petróleo profundo do crepúsculo e do contraste afiado de materiais técnicos de alta performance: o carmesim do cerol, o ciano ionizado do fio chileno e o reflexo dourado das lâminas da vitória. A cor não decora; ela codifica instantaneamente perigo, vantagem tática e hierarquia.

A tipografia e os glifos comportam-se como marcações técnicas e clínicas de instrumentos de precisão. O texto não compete com a ação; ele atua como legenda telemetrica de um espetáculo visceral. Nada sobrepõe o centro vital onde a física se desdobra. Cada linha traçada carrega a precisão cirúrgica de um artesão que dedicou centenas de horas à calibração visual milimétrica.

---

## 2. Frontend Design: Design System & DFII Index

### Avaliação DFII (Design Feasibility & Impact Index)

| Dimensão | Nota (1–5) | Justificativa |
| :--- | :---: | :--- |
| **Aesthetic Impact** | 5 | Visual autoral, imersivo e imediatamente distinguível de qualquer outra live de jogos. |
| **Context Fit** | 5 | Enraizamento na cultura popular de pipa com acabamento premium e moderno. |
| **Implementation Feasibility** | 4 | Arquitetura dual-canvas (PixiJS + Three.js) já estável e modular. |
| **Performance Safety** | 4 | 60 FPS garantidos no OBS; render loop do WebGL desliga em modo transparente. |
| **Consistency Risk** | 2 | Baixo risco graças ao isolamento dos tokens em variáveis CSS e módulos de UI. |

**Score DFII Total:** `(5 + 5 + 4 + 4) - 2 = 16 / 19 (Excelente)`

### Âncora de Diferenciação
> *"Se o logotipo for removido de uma captura de tela, o enquadramento vertical com casinhas e laje 3D na base e fios semi-translúcidos cruzando o céu identifica inconfundivelmente a live."*

### Tokens Visuais do Design System
- **Tipografia:**
  - *Display / Destaques:* `'Outfit', system-ui, sans-serif` (pesos 700 e 800) — robusto, dinâmico e legível à distância.
  - *Interface / Telemetria:* `'Inter', -apple-system, sans-serif` (pesos 500 e 600) — neutro, preciso e ultralegível em alta densidade de dados.
- **Cores Semânticas:**
  - `Surface Base:` `#06131de6` (Dark glass translúcido)
  - `Borda Tática:` `rgba(255, 255, 255, 0.08)`
  - `Ataque / Rosa (Retão):` `#ff3b5c` / `#ff1744`
  - `Velocidade / Donut (Despicar):` `#ff9100` / `#ffb300`
  - `Defesa / Capivara (Aparar):` `#00e676` / `#1de9b6`
  - `Puxada / Perfume (Perseguir):` `#d500f9` / `#b388ff`
  - `Supremacia / Leão (Rei):` `#ffd700` / `#ffab00`
- **Hierarquia Espacial:**
  - *Área Protegida de Combate:* 10% a 75% da altura da tela (livre de banners ou modais invasivos).
  - *HUD Superior:* Pills compactas com auto-dismiss em 2.5s.
  - *HUD Inferior:* Barra de presentes e vento com glassmorphism fosco e microinterações de hover.

---

## 3. Mobile Design: Diretrizes para TikTok Live Vertical (9:16)

### Leis do Formato Vertical
1. **Vertical Não é Desktop Encolhido:** O foco visual do espectador de celular fica no terço médio e inferior. A laje funciona como piso tátil emocional, enquanto o céu é o palco de ação.
2. **Resoluções Canônicas:**
   - 1440 × 2560 (2K OBS Broadcast Canvas)
   - 1080 × 1920 (Full HD Vertical padrão)
   - 390 × 844 (Visualização compacta de smartphone)
3. **Zonas Seguras contra Overlays do TikTok:**
   - *Margem Direita (25% superior):* Reservada para botões nativos do TikTok (Seguir, Compartilhar, Curtir). O killfeed do jogo respeita essa margem.
   - *Margem Inferior (15%):* O chat do TikTok sobe nessa área; a laje dos bonecos e a barra de presentes possuem espaçamento e contraste elevado para manter 100% de legibilidade mesmo com texto de chat correndo.
4. **Alvos de Toque e Interação:** Mínimo de `48px` para qualquer controle clicável de moderação ou testes.

---

## 4. 3D Web Experience: Arquitetura Three.js & Otimização WebGL

### Pilares Técnicos da Cena 3D (`ThreeSkyScene.js`)
1. **Dual Canvas Decoupled:**
   - `#threeCanvas` (WebGL z-index 0): Renderiza luz solar estocástica, sombras PCF suaves, morros procedurais, domo celeste e nuvens volumétricas.
   - `#gameCanvas` (PixiJS 2D z-index 1): Renderiza física pura de pipas, linhas, partículas e faíscas de contato.
2. **Orçamento de Performance (Frame Budget 16.6ms - 60 FPS):**
   - Geometrias instanciadas e materiais compartilhados (`MeshLambertMaterial` / `MeshStandardMaterial`).
   - Contagem poligonal total da cena controlada em `< 45.000 polígonos`, garantindo fluidez mesmo em GPUs integradas.
   - `pixelRatio` limitado a `Math.min(window.devicePixelRatio, 1.5)` para prevenir gargalo de fragment shader em displays 2K/4K.
3. **Sincronia com Física Real:**
   - O vetor de vento calculado no loop de jogo (`Wind.sample()`) alimenta suavemente a translação das nuvens e a deriva das pipas decorativas ao fundo, criando coesão espacial entre o 2D e o 3D.
4. **Modo OBS Zero-Cost:**
   - Ao ativar o modo transparente de overlay para transmissão, o render loop do Three.js é suspenso imediatamente, liberando 100% da GPU para o encoder do OBS.
