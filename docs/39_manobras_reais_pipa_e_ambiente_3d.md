# Documento 39 · Manobras Reais de Relinho de Pipa e Objetos 100% 3D no Three.js

## 1. Visão Geral e Contexto

Este documento consolida a evolução gráfica e mecânica da arena **Rei da Laje**, atendendo à demanda de transformar todos os elementos do jogo (pipas, bonecos empinadores na laje, carretilhas, linhas, efeitos de combate e cenário) em **objetos tridimensionais volumétricos nativos em WebGL (Three.js)**, eliminando por completo os bonecos de palito e losangos planos 2D que anteriormente sobrepunham a cena.

Além disso, detalha a pesquisa etnográfica e mecânica das **manobras autênticas brasileiras de combate de pipa (relinho/relo)**, integradas à simulação de física, curvas aerodinâmicas e poses 3D em tempo real.

---

## 2. Pesquisa de Manobras Tradicionais Brasileiras de Pipa

Nas favelas e periferias do Rio de Janeiro, São Paulo e Minas Gerais, a arte do combate de pipas ("dar relinho", "cruzar" ou "tirar relo") possui um repertório tático sofisticado com vocabulário próprio:

| Manobra Autêntica | Mecânica Tradicional | Comportamento Aerodinâmico e Físico | Efeito de Linha e Jogo |
|---|---|---|---|
| **Retão Seco** | Puxada contínua com força máxima sem desbicar, tensionando a linha para cortar na velocidade e atrito da cerol/chilena. | Pipa ergue o bico verticalmente, ganhando aceleração ascendente com $v_y < 0$ e tensão $\tau \to 1.0$. | Dano de atrito contínuo acelerado; estica a linha catenária em linha reta tensa. |
| **Despique / Desbicar** | Puxão seco de bico para baixo seguido de folga repentina para esquivar ou cruzar por baixo da linha adversária. | Rotação rápida em Pitch negativo e Roll angular; folga temporária de linha ($\text{slack} = 0.85$). | Reduz dano sofrido momentaneamente; linha ganha curvatura côncava catenária. |
| **Tenteio (Tenteando)** | Vai-e-vem contínuo puxando e soltando a carretilha para "serrar" a linha do oponente na fricção. | Micro-oscilações em alta frequência no Pitch e Roll ($24\text{ rad/s}$), simulando o movimento de serrote. | Aumenta fricção de contato e gera centelhas 3D mais densas no ponto de cruzamento. |
| **Largada / Alívio** | Soltar linha rapidamente deixando a pipa planar e derivar livremente nas correntes térmicas laterais. | Pipa empina suavemente, respondendo com mais intensidade ao vetor do vento ($W_x, W_y$). | Esquiva de retões agressivos; carretilha 3D gira soltando linha. |
| **Mergulho Parafuso** | Ataque helicoidal onde a pipa desce rodopiando em espiral 360° para laçar a rabiola ou cortar na curva. | Giro contínuo em Roll 3D (`spin3D`), combinando descida rápida com rotação angular axial. | Alto risco e alto dano de enrosco; estirador e rabiola giram em cone helicoidal. |
| **Aparada por Baixo** | Entrar por baixo da linha do oponente e escorar na vareta central ou transversal para quebrar o cabresto. | Deslocamento tático lateral e ascensão na quina inferior da pipa adversária. | Bloqueio defensivo (absorção de impacto) que protege o cabresto do jogador. |
| **Aparada de Bico** | Bloqueio defensivo de quina contra quem desce desbicando ou dando retão. | Rotação em quina angular de 45° com rigidez de tensão máxima. | Impede passagem direta do oponente e força desvio de trajetória. |
| **Laçada de Cerol** | Manobra circular envolvendo a linha adversária em volta da própria linha para corte duplo ou fricção de 360°. | Curva fechada em arco com cruzamento de linhas em múltiplos pontos. | Provoca faíscas simultâneas e dano acumulado rápido. |

---

## 3. Arquitetura dos Objetos 100% 3D (Three.js WebGL)

Todos os elementos agora são instanciados como geometrias tridimensionais volumétricas adicionadas à árvore da cena Three.js:

### 3.1 Pipa 3D (`createKiteModel3D`)
- **Folha / Seda da Pipa**: Malha `ShapeGeometry` em formato clássico de losango carioca (Peixinho/Raiada/Carrapeta) com material `MeshStandardMaterial` translúcido (opacidade 0.95, roughness 0.42).
- **Vareta Central**: Cilindro de bambu natural (`CylinderGeometry`) com textura marrom-palha.
- **Vareta Transversal Arqueada**: Tubo tridimensional encurvado (`CatmullRomCurve3` e `TubeGeometry`) simulando a flexão de fibra de vidro preta.
- **Cabresto / Estirador 3D**: Três segmentos de fio tridimensionais (`LineSegments`) convergindo à frente da pipa em $Z = 7.5$.
- **Decalque com Avatar do Jogador**: Decalque central circular (`CircleGeometry`) gerado proceduralmente com a foto de perfil do TikTok ou inicial estilizada em Canvas Texture de alta resolução.
- **Rabiola 3D Dinâmica**: Cadeia de 12 nós de Verlet conectados por `TubeGeometry` flexível, com fitilhos tridimensionais retangulares coloridos ondulando e chicoteando com as correntes de vento reais.
- **Efeitos de Presentes 3D**:
  - *Escudo de Proteção (Leão / Capivara)*: Esfera de energia holográfica translúcida em wireframe ciano orbitando a pipa.
  - *Vórtice Tornado (Perfume)*: Cilindro cônico tridimensional em wireframe púrpura girando a alta velocidade.
  - *Coroa 3D do Rei*: Mini coroa dourada low-poly giratória com pontas cônicas.
  - *Aura de Líder / Streak*: Anel brilhante com pulsação de luz solar.

### 3.2 Boneco Empinador na Laje (`createPlayerBoneco3D`)
- **Personagem Chibi Estilizado**:
  - Pés com chinelos de dedo tipo Havaianas no chão da laje de madeira.
  - Pernas cilíndricas com bermuda cargo modelada em bloco tridimensional.
  - Tronco com regata esportiva tingida na cor exata da sua pipa ativa.
  - Cabeça esférica com boné estilizado virado para trás.
  - Braço esquerdo segurando carretilha 3D raiada (madeira e linha enrolada) com rotação proporcional à velocidade de puxada.
  - Braço direito articulado que executa o movimento de puxar linha sincronizado às manobras de *retão seco* e *tenteio*.
  - Animação de pulo e salto de comemoração na laje ao registrar um corte de pipa adversária.
  - Medalhão de avatar suspenso sobre a cabeça, exibido até 20 jogadores e para o Rei da Laje.

### 3.3 Linhas Catenárias 3D Dinâmicas (`createDynamicLine3D`)
- Conexão contínua em 16 pontos de curva física conectando a âncora da mão do boneco na laje ($Z = 480$) até o estirador da pipa no céu ($Z \approx 0$).
- Curvatura catenária física calculada por $\text{sagY} = -\text{slack} \cdot 36 \cdot \sin(t\pi)$ com deflexão aerodinâmica lateral pelo vento.
- Cores dinâmicas de material correspondentes ao tipo de linha do jogador:
  - Algodão: Branco puro (`0xf8f9fa`)
  - Cerol: Rosa avermelhado incandescente (`0xf43f5e`)
  - Chilena: Âmbar/Laranja brilhante (`0xf59e0b`)
  - Kevlar: Dourado metálico blindado (`0xeab308`)
  - Tornado: Púrpura cósmico (`0xa855f7`)
  - Mestre do Céu: Ciano elétrico celofane (`0x06b6d4`)

### 3.4 Pipas Avoadoras Cortadas 3D e Faíscas
- Pipas que perderam todo o HP de linha caem rodopiando em Pitch, Roll e Yaw tridimensionais, flutuando à deriva do vento até saírem da tela.
- Sistema de partículas `Points` com blending aditivo em Three.js gerando centelhas incandescentes no ponto tridimensional de atrito entre linhas.

---

## 4. Ocultação Seletiva de Elementos 2D (`sync3DDisplay`)

Para garantir que os elementos 2D antigos do PixiJS não fiquem sobrepostos aos novos modelos 3D volumétricos, o método `sync3DDisplay()` em `App.js` sincroniza as camadas a cada ciclo de renderização:
1. `rooftopPlayers.visible = false` no PixiJS quando em modo 3D (os bonecos de palito são substituídos pelos bonecos volumétricos na laje).
2. `linesContainer.visible = false` no PixiJS (as linhas 2D são substituídas pelas linhas catenárias 3D).
3. `kite.bodyGraphic.visible = false` e `kite.avatarContainer.visible = false` (os losangos 2D são substituídos pelas malhas de pipa 3D).
4. `kite.crownText.visible = false` (a mini coroa 3D substitui o emoji 2D).
5. **Preservação do HUD e Nicknames**: O contêiner de HP, medalha e apelido (`tagContainer`, `hpBarContainer`, `benefitText`) continuam nítidos na camada superior do Pixi e do DOM, garantindo máxima legibilidade para o público do TikTok Live.

---

## 5. Verificação e Testes

- **Testes Unitários**: 100% de aprovação em `npm test` (**130 de 130 testes aprovados** sem regressões).
- **Testes Visuais em Edge Headless (1440 × 2560 Portrait 2K)**:
  - `tests/evidence/portrait-1440x2560.png` gerado com sucesso demonstrando:
    - 40 pipas tridimensionais volumétricas com rabiolas animadas no céu.
    - 40 bonequinhos chibi 3D alinhados na laje de madeira em duas fileiras, vestindo regatas na cor da sua pipa e bonés vermelhos.
    - Linhas tridimensionais coloridas conectando bonecos às pipas.
    - Zero bonecos de palitinho 2D cobrindo a cena.
    - Ranking TOP 5, avisos de corte, banners de liderança e guia de presentes 100% legíveis.
