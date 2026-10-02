> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 41. Refinamento Visual 3D e Detalhes Culturais no Three.js

**Data**: 27/09/2026  
**Status**: Implementado e Validado com Sucesso  
**Alvo**: Renderização 3D nativa (WebGL / Three.js PCF ShadowMap + ACES Filmic) para TikTok Live (1440 × 2560 e 1080 × 1920)

---

## 1. Visão Geral das Melhorias

Com base na demanda de refinamento visual e autenticidade cultural brasileira de combate de pipas, implementamos um conjunto avançado de técnicas de modelagem, shading e cinemática procedural que elevam o padrão estético da transmissão ao vivo:

---

## 2. Detalhes Culturais e Modelagem das Entidades 3D

### 2.1 Pipas com Diedro Aerodinâmico e Estampas Cariocas (Corte e Recorte)
- **Geometria Diedro Tridimensional (`createKiteShapeGeometry`)**:
  - Pipas reais de combate nunca são folhas planas; a vareta arqueada de fibra cria uma curvatura e a vareta central de bambu avança, gerando um ângulo diedro real.
  - O shader calcula normais de vértices em duas faces distintas, dividindo o reflexo da luz solar (`DirectionalLight` dourada) entre as asas e eliminando qualquer aspecto de decalque bidimensional.
- **Estampas Tradicionais Cariocas Procedurais (`createKitePaperCanvas`)**:
  - Geração dinâmica em `CanvasTexture` sem alocações contínuas (cache em memória indexado por cor primária, secundária e padrão).
  - 4 estampas autênticas de festival e favela:
    1. *Meio a Meio Carioca*: Corte diagonal perfeito com costura de fita.
    2. *Listra / Faixa Central*: Faixa contrastante ao centro.
    3. *Losango Central / Estrela de Favela*: Losango vazado no corpo da pipa.
    4. *Quadriculado Duplo*: Quatro quadrantes alternados.
- **Rabiolas Festivas com Fitilhos Multicores**:
  - Cadeia cinemática de nós tridimensionais ligando a pipa à cauda.
  - Fitilhos de plástico com cores vibrantes brasileiras (verde-limão, rosa-choque, azul-ciano, amarelo-ouro, laranja) que ondulam e giram independentemente conforme o vento da física.

---

### 2.2 Bonecos Chibi da Laje: Diversidade, Head-Tracking e Óculos Juliet
- **Diversidade Cultural Representativa**:
  - Tons de pele autênticos brasileiros (`BRAZILIAN_SKIN_TONES`: tons negros, pardos, morenos e claros).
  - Bermudas esportivas de favela (`SHORTS_COLORS`: tactel azul marinho, cinza grafite, verde escuro e preto).
  - Bonés virados para trás com aba modelada (`CAP_COLORS`: vermelho, azul bic, preto, branco e amarelo).
- **Cinemática Inversa de Pescoço (*Head-Tracking* Dinâmico)**:
  - Cada boneco possui sua própria articulação de cabeça (`headGroup`).
  - O ângulo tridimensional de visada é recalculado a cada frame conectando a cabeça do boneco diretamente à sua pipa no céu:
    - `lookPitch = -Math.atan2(dy, distXZ) * 0.85` (ergue a cabeça para o céu aberto).
    - `lookYaw = Math.atan2(dx, distXZ) * 0.65` (gira a cabeça acompanhando os cruzamentos e manobras da pipa).
- **Óculos Juliet Espelhados Ouro/Fogo**:
  - Jogadores destacados (Rei da Laje atual, Líder da partida ou jogadores em sequência de 2+ cortes) recebem os icônicos óculos Juliet estilo Oakley espelhados com armação escura e lentes metálicas douradas reflexivas (`emissive: 0x331500`, `metalness: 0.96`, `roughness: 0.08`).

---

### 2.3 Linhas Vivas: Vibração Harmônica de Tensão
- A linha 3D não é um cabo rígido; ela é uma curva catenária tridimensional dinâmica que reage a vento, tração e folga.
- **Harmônica de Atrito e Puxada**:
  - Durante manobras ativas (*retão*, *tenteio*, *dibicagem*) e sob alta tensão mecânica (> 0.85), uma oscilação senoidal de alta frequência (`Math.sin(time * 42 + p * 1.5) * 1.8`) é aplicada nos pontos médios da linha, tornando o atrito de combate visível a olho nu na live.

---

### 2.4 Atmosfera Viva da Favela
- **Cone de Subwoofer Pulsante (Bass Boom)**:
  - A caixa de som instalada na laje possui um cone de subwoofer com escala oscilante ao ritmo de um beat contínuo de 128 BPM (`Math.pow(sin(time * 7.8), 4)`), vibrando como uma caixa de som real de baile de favela.
- **Bando de Andorinhas no Céu Carioca (`buildFlockOfBirds`)**:
  - Formação em 'V' de andorinhas 3D voando ao longe entre os morros e as nuvens, com batimento articulado de asas e deriva de vento suave.

---

## 3. Matriz de Validação e Testes
- **Suite de Testes Unitários**: 130/130 testes aprovados (`npm test`, 100% de sucesso).
- **Zero-GC e Alocações**: Todas as texturas utilizam mapas de cache estáticos; todas as geometrias e linhas reutilizam buffers de `Float32Array` existentes sem criação de novos objetos durante o loop a 60 FPS.
- **Compatibilidade de Resolução**: Totalmente responsivo para viewports TikTok Live (1440 × 2560 e 1080 × 1920) e widescreen OBS Studio (1920 × 1080).
