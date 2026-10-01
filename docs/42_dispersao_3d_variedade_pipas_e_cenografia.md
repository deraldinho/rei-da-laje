# 42. Dispersão 3D Orgânica, Variedade de Modelos e Cenografia da Laje

**Data**: 27/09/2026  
**Status**: Implementado e Validado  
**Escopo**: Three.js WebGL nativo, Cinemática Aerodinâmica, Shading de Linhas e Cenografia Cultural

---

## 1. Problemas Identificados e Soluções Implementadas

Após auditoria estética profissional da transmissão ao vivo, implementamos refinamentos que transformam a experiência visual de "catálogo rígido" em um festival aéreo carioca vivo e dinâmico:

---

## 2. Detalhamento das Melhorias

### 2.1 Dispersão Aérea em Camadas (Z-Depth Estratificado)
- **Eliminação do Grid Artificial**:
  - As 40 pipas não compartilham mais o mesmo plano raso de profundidade.
  - Distribuídas deterministicamente em 3 faixas de profundidade reais:
    - **Camada Frontal (`Z = +70 a +105`)**: Pipas grandes em primeiro plano, com detalhes nítidos das varetas, reflexos intensos de luz solar dourada e fitilhos ondulantes.
    - **Camada Central (`Z = -30 a +15`)**: Pipas de tamanho padrão disputando relinhos no centro da arena.
    - **Camada de Fundo (`Z = -130 a -180`)**: Pipas integradas à neblina atmosférica do horizonte, criando sensação real de imensidão aérea.
- **Micro-Oscilação Orgânica de Sustentação**:
  - Adicionado cálculo contínuo de sustentação e turbulência aerodinâmica (`windDriftX`, `windDriftY`, `windDriftZ`), fazendo as pipas flutuarem e dançarem no céu de maneira assíncrona.

---

### 2.2 Modelos Múltiplos Tradicionais de Pipas
Além do modelo tradicional em diamante, agora a arena renderiza 3 famílias consagradas da cultura de pipas:
1. **Pipa Tradicional / Pião (`createKiteShapeGeometry`)**:
   - Geometria diedro equilibrada (`w: 26, topH: 15, botH: 26`), rabiola média de 12 nós com fitilhos multicores.
2. **Pipa Raia Carioca (`createRaiaShapeGeometry`)**:
   - Envergadura ampliada (`w: 32, topH: 17, botH: 17`) com curvatura aerodinâmica agressiva de fibra de vidro.
   - Não utiliza rabiola longa (máxima agilidade e velocidade de manobra), possuindo apenas pequenos fitilhos estabilizadores.
3. **Pipa Peixinho / Cafifa (`createPeixinhoShapeGeometry`)**:
   - Corpo compacto e leve (`w: 20, topH: 11, botH: 24`) com rabiola super longa (15 nós) para dibicagens ágeis.

---

### 2.3 Hierarquia Visual das Linhas 3D
- **Redução do Efeito "Teia de Aranha"**:
  - Com 40 jogadores, 40 linhas densas poluíam o centro da tela.
  - **Linhas Neutras / Repouso**: Opacidade reduzida para `0.30` com espessura fina, mantendo a tela limpa e focada no combate.
  - **Linhas em Combate Ativo / Manobras / Relinho**: Opacidade elevada para `0.88` com saturação máxima e micro-vibração de atrito mecânico.
  - **Rei da Laje / Líder**: Linha dourada radiante (`0xffd700`, opacidade `0.95`).

---

### 2.4 Cenografia Enriquecida da Laje
- **Fumaça Realista de Churrasco (`grillSmoke`)**:
  - Sistema de partículas 3D saindo da chaminé da churrasqueira de tijolos, subindo e dispersando com a velocidade do vento.
- **Cadeiras de Praia Dobráveis**:
  - Duas cadeiras clássicas de praia (azul e amarela) com estrutura tubular de alumínio e assento de lona dobrável apoiadas no chão cerâmico da laje.

---

## 3. Validação e Desempenho
- **130/130 testes aprovados** (`npm test`, 100%).
- **60 FPS estáveis** em 1440 × 2560 (TikTok Live) e 1920 × 1080 (Widescreen).
