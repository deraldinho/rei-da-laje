> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 🎁 Plano de Implementação: Regras de Jogo e Integração com Presentes (TikTok Gifts)

Este plano especifica a lógica de regras, temporizadores de buffs, ciclo de vida das pipas e o mapeamento dos presentes (Gifts) do TikTok em upgrades reais de combate.

---

## 1. Descrição do Objetivo
Implementar o motor de regras de negócio do jogo (`backend/rules/`) e o gerenciador de status no cliente, garantindo que cada interação da live (comentários, curtidas, presentes pequenos e presentes grandes) modifique o estado da pipa em tempo real de forma balanceada, divertida e com alto incentivo à monetização da live.

```mermaid
flowchart TD
    subgraph Entrada TikTok Live
        C[Comentário Livre]
        L[Curtidas / Likes]
        G1[Rosa - 1 Moeda]
        G2[Donut - 30 Moedas]
        G3[Capivara - 100 Moedas]
        G4[Perfume - 500 Moedas]
        G5[Leão / Universo - Top]
    end

    subgraph Gerenciador de Regras (Backend)
        RM[gameRules.js - Controle de Entrada & Fila]
        BM[buffManager.js - Temporizadores & Upgrades]
    end

    subgraph Estado da Pipa (Frontend)
        K0[Pipa Padrão - Linha Algodão 1.0x]
        K1[Rabiola Veloz +25%]
        K2[Linha Cerol 1.5x - 60s]
        K3[Linha Chile Instant Cut - 120s]
        K4[Kevlar Escudo 2 Vidas - 180s]
        K5[Ataque Tornado em Área]
        K6[Modo Mestre do Céu 30s]
    end

    C --> RM --> K0
    L --> BM --> K1
    G1 --> BM --> K2
    G2 --> BM --> K3
    G3 --> BM --> K4
    G4 --> BM --> K5
    G5 --> BM --> K6
```

---

## 2. Revisão do Usuário Obrigatória (User Review Required)

> [!IMPORTANT]
> **Política de Sobrescrita vs Acumulação de Presentes (Buff Stacking)**:
> - **Presentes de Linha (Rosa / Donut / Capivara)**: O presente superior sempre substitui o inferior (ex: se o jogador tem Linha Cerol e recebe Linha Chile, a linha vira Chile instantaneamente e o timer reseta para 120 segundos).
> - Se o jogador receber o **mesmo presente novamente**, o tempo de duração é somado (ex: 2x Rosas = 120 segundos de Cerol).
> - **Presentes Especiais (Perfume / Leão)**: Ativam imediatamente sem cancelar o tipo de linha que o jogador já possuía.

> [!NOTE]
> **Regra de Eliminação e Re-entrada (Incentivo de Engajamento)**:
> Quando uma pipa é cortada, o jogador só pode subir outra pipa enviando um **novo comentário** no chat da Live. Isso força o espectador a continuar comentando e interagindo com a transmissão.

---

## 3. Tabela Formal de Parâmetros de Presentes e Regras

| Presente | Custo (Moedas) | ID TikTok Típico | Multiplicador de Poder | Duração (s) | Efeito Extra | Visual da Linha / Pipa |
|---|---|---|---|---|---|---|
| **Comentário** | 0 | - | `1.0x` | Até morrer | Entrada básica | Linha branca simples (1px) |
| **Rajada de Likes** | 0 | - | `1.0x` | `30s` | `+25%` agilidade de esquiva | Rabiola com rastro brilhante |
| **Rosa** | 1 | `5655` | `1.5x` | `60s` | Chance de quebra de linha de algodão | Linha vermelha com faíscas (2px) |
| **Donut / Sorvete** | 30 | `5827` | `3.0x` | `120s` | Quebra instantânea de linha de algodão | Linha azul fluorescente neon (2px) |
| **Capivara / TikTok** | 100 | `6064` | `2.5x` | `180s` | Escudo: sobrevive a 2 derrotas de relinho | Linha dourada + aura protetora (3px) |
| **Perfume** | 500 | `5984` | `4.0x` | Instantâneo | Atrai até 3 pipas próximas para corte em área | Vórtice de vento cinza ao redor da pipa |
| **Leão / Universo** | 29999+ | `6267` | `99.0x` | `30s` | Invulnerabilidade total e corte em todas as pipas que tocar | Pipa gigante com raios e vinheta na tela |

---

## 4. Alterações Propostas na Estrutura de Código

### Backend (`/backend`)

#### [NEW] `backend/rules/giftConfig.js`
- Dicionário com IDs de presentes do TikTok Live, nomes amigáveis, multiplicadores de poder, tempos de duração e efeitos visuais correspondentes.

#### [NEW] `backend/rules/gameRules.js`
- **Controle de Capacidade de Tela**: Limita a tela a 40 pipas simultâneas.
- **Fila de Espera (Queue)**: Se a tela estiver cheia, novas entradas entram na fila e entram automaticamente assim que uma pipa é cortada.
- **Detector de Comentários**:
  - Detecta se o texto é `#pegar` / `#aparar` -> Dispara tentativa de resgate de pipa avoadora.
  - Detecta comandos de combate: `puxar` (impulso para cima), `descarregar` (alívio de tensão), `embicar` (giro de 45°).

#### [NEW] `backend/rules/buffManager.js`
- Gerencia o mapa de jogadores ativos e seus temporizadores de buffs:
  - Armazena: `{ [userId]: { lineType, powerMultiplier, expiresAt, shieldCount } }`.
  - Dispara evento Socket.io `player:buff_expired` quando o tempo de um presente termina, revertendo a linha para algodão.

---

### Frontend (`/frontend`)

#### [NEW] `frontend/src/managers/KiteStatusManager.js`
- Recebe os eventos de gifts do backend e atualiza a entidade visual `Kite`:
  - Altera cor e espessura da linha (`Line.js`).
  - Adiciona/remove efeito de aura e partículas.
  - Gerencia o estado de "Pipa Avoadora" (quando cortada, desce por 8s aguardando `#pegar`).

---

### Documentação (`/doc`)

#### [NEW] `doc/plano_regras_e_presentes.md`
- Cópia permanente idêntica deste plano no repositório.

#### [MODIFY] `doc/02_regras_e_presentes_tiktok.md`
- Atualização com a tabela formal de parâmetros e mecânicas de buff stacking.

#### [MODIFY] `doc/README.md`
- Adição do link para `doc/plano_regras_e_presentes.md`.

---

## 5. Plano de Verificação

### Testes Automatizados
- Testar a lógica de buffs e temporizadores via script Node.js:
  ```powershell
  node -e "const { applyGift } = require('./backend/rules/buffManager'); console.log('Buff test:', applyGift('user1', 'ROSA'));"
  ```

### Verificação Manual
1. Abrir `http://localhost:3000/admin`.
2. Adicionar uma pipa de teste (`@jogador1`).
3. Clicar no botão **🌹 Rosa (Cerol)**:
   - Verificar se a linha fica vermelha com faíscas.
   - Verificar se o status exibe `Cerol (60s restante)`.
4. Clicar no botão **🍩 Donut (Linha Chile)**:
   - Verificar se a linha passa para azul neon e o temporizador atualiza para 120s.
5. Aguardar o término do tempo ou clicar em "Remover Buff" e verificar a reversão suave para linha branca comum.
