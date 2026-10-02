> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# ⚔️ Plano de Implementação: Física de Relinho e Sistema de Áudio

Este plano detalha a matemática de colisão de linhas, o algoritmo de combate de relinho em 60 FPS, o sistema de partículas de faíscas e o pipeline de áudio imersivo para o OBS Studio.

---

## 1. Descrição do Objetivo
Desenvolver o módulo de física e áudio do jogo, garantindo que o cruzamento de linhas entre espectadores seja detectado com precisão milimétrica em 2D, gerando faíscas visuais no ponto de atrito, resolução justa de corte ("Tlec!") e efeitos sonoros nítidos sem atraso.

```mermaid
flowchart TD
    subgraph Loop do Jogo 60 FPS (PixiJS)
        P1[Pipa 1 - Ponto Laje A até Pipa A]
        P2[Pipa 2 - Ponto Laje B até Pipa B]
    end

    subgraph Motor de Física (Physics.js)
        R[1. Verificação de Raio < 120px]
        INT[2. Interseção Geométrica de Segmentos 2D]
        CALC[3. Cálculo de Tensão & Força das Linhas]
    end

    subgraph Feedback Visual & Sonoro
        SPK[SparkEmitter.js - Faíscas no Ponto X, Y]
        AUD[AudioManager.js - Som Tlec! & Vento]
        FALL[FallingKite.js - Pipa Avoadora Cai Rodopiando]
    end

    P1 & P2 --> R
    R -->|Próximos| INT
    INT -->|Linhas Cruzadas X,Y| SPK
    INT -->|Linhas Cruzadas X,Y| CALC
    CALC -->|Vitória de A| AUD
    CALC -->|Vitória de A| FALL
```

---

## 2. Revisão do Usuário Obrigatória (User Review Required)

> [!IMPORTANT]
> **Pipeline de Áudio Autônomo (Web Audio API Sintetizada)**:
> Para evitar falhas de carregamento de arquivos externos `.mp3` ou bloqueios de CORS, o `AudioManager.js` incluirá **geradores procedurais de som nativos** via `AudioContext` do navegador:
> - **Som de Corte ("Tlec!")**: Transiente de onda senoidal de pitch decrescente ultra-rápido (800Hz -> 60Hz em 40ms) simulando o estalo de nylon rompendo.
> - **Som de Vento**: Ruído branco com filtro passa-baixo suave oscilante.
> - Suporte adicional para arquivos `.mp3` customizados se o streamer desejar substituir.

> [!NOTE]
> **Detecção de Interseção Geométrica Vetorial**:
> Cada linha é um vetor $\vec{AB}$ e $\vec{CD}$. A colisão não é uma simples "caixa retangular", mas sim a resolução do produto vetorial exato:
> $$P_{\text{interseção}} = P_{\text{laje}} + t \times (P_{\text{pipa}} - P_{\text{laje}})$$
> As faíscas surgem exatamente sobre o ponto onde as duas linhas se tocam no céu.

---

## 3. Algoritmo de Combate e Matemática de Resolução

### A. Condição de Cruzamento (Produto Vetorial 2D)
Dados os pontos:
- Linha 1: $A(x_1, y_1)$ e $B(x_2, y_2)$
- Linha 2: $C(x_3, y_3)$ e $D(x_4, y_4)$

Calcula-se os determinantes $t$ e $u$:
$$\text{denominador} = (x_1 - x_2)(y_3 - y_4) - (y_1 - y_2)(x_3 - x_4)$$
Se $\text{denominador} \neq 0$ e $0 \leq t \leq 1$ e $0 \leq u \leq 1$, as linhas se cruzam no ponto:
$$X_{\text{cruz}} = x_1 + t(x_2 - x_1), \quad Y_{\text{cruz}} = y_1 + t(y_2 - y_1)$$

### B. Fórmula de Tensão e Resolução de Cerol
$$\text{Força Total} = (\text{Poder da Linha}) \times (\text{Multiplicador de Movimento}) + \text{Bônus Gift}$$

- **Multiplicadores de Ação**:
  - `puxar`: `1.4x` (Ataque cortante de subida rápida)
  - `descarregar`: `0.8x` (Alívio de tensão defensiva)
  - `estável/flutuando`: `1.0x`
- **Resolução**:
  - Se $\text{Força}_A \geq \text{Força}_B \times 1.25$: Linha B estoura instantaneamente.
  - Se a diferença for menor que $25\%$: As pipas entram em **Trançado** por 3 segundos com faíscas contínuas até que uma manobra ou presente desempate o relinho.

---

## 4. Alterações Propostas na Estrutura de Código

### Frontend (`/frontend`)

#### [NEW] `frontend/src/engine/Physics.js`
- Módulo estático com as funções matemáticas:
  - `checkLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4)` -> Retorna `{ hit: boolean, x, y }`.
  - `resolveCombat(kiteA, kiteB)` -> Determina o vencedor, verifica escudos e calcula quebra de linha.
  - `applyWindForce(kite, windVector, time)` -> Aplica oscilação de vento e turbulência suave.

#### [NEW] `frontend/src/engine/AudioManager.js`
- Gerenciador de áudio Web Audio API:
  - `playCutSound()`: Gera o estalo "Tlec!" sintetizado com ganho de volume limpo.
  - `startWindAmbient()`: Inicia camada de ambiência suave de vento.
  - `playSparksSound()`: Som sutil de linha raspando durante o Trançado.
  - `playVictoryFanfare()`: Som comemorativo para novos "Reis da Laje".

#### [NEW] `frontend/src/entities/SparkEmitter.js`
- Sistema de partículas baseado em `PIXI.Container`:
  - Dispara rajada de 8 a 15 partículas amarelas/laranjas incandescentes no ponto $(X, Y)$ da colisão.
  - Partículas possuem gravidade suave, rotação e desvanecimento alfa de 0.3s.

#### [NEW] `frontend/src/entities/FallingKite.js`
- Animação de pipa cortada (Pipa Avoadora):
  - Linha rompe e a pipa perde a sustentação.
  - Movimento parabólico descendente com oscilação pendular (efeito de folha caindo).
  - Permanece na tela por 8 segundos receptiva ao comando `#pegar`.

---

### Documentação (`/doc`)

#### [NEW] `doc/plano_fisica_relinho_e_audios.md`
- Cópia permanente idêntica deste plano no repositório.

#### [MODIFY] `doc/03_fisica_relinho_e_audios.md`
- Atualização com a fórmula matemática vetorial exata e arquitetura Web Audio.

#### [MODIFY] `doc/README.md`
- Adição do link para `doc/plano_fisica_relinho_e_audios.md`.

---

## 5. Plano de Verificação

### Testes Automatizados
- Teste unitário de geometria 2D em Node.js para validar a fórmula de interseção:
  ```powershell
  node -e "const { checkLineIntersection } = require('./frontend/src/engine/Physics'); console.log('Cruzamento teste:', checkLineIntersection(0, 0, 100, 100, 0, 100, 100, 0));"
  ```
  *(Deve retornar `hit: true, x: 50, y: 50`)*.

### Verificação Manual
1. Abrir `http://localhost:3000/admin`.
2. Adicionar 2 Pipas Bots (Pipa Azul e Pipa Vermelha).
3. Mover uma em direção à outra até que as linhas se cruzem:
   - Confirmar surgimento de faíscas exatamente sobre o ponto de cruzo das linhas.
   - Confirmar reprodução audível do som "Tlec!".
   - Observar a pipa perdedora soltando a linha e caindo rodopiando suavemente pela tela.
