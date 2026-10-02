> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 69. Implementação da Fase P4: Manobras Aerodinâmicas e Integração com Carretel da Corda

**Data:** 30/09/2026  
**Status:** Implementado, Integrado e 100% Validado (**212/212 testes aprovados**)  
**Skills Utilizadas:** `/systematic-debugging`, `/test-driven-development`, `/senior-fullstack`

---

## 1. Visão Geral da Fase P4

Até a Fase P3, as manobras de presente (Retão, Despicada, Mergulho, Aparadas) alteravam apenas a posição $(x, y)$ da pipa na tela e propriedades escalares (`lineTension`, `lineSlack`).

Com o motor de corda XPBD de 12 nós (Fase P1) e o solucionador tribológico (Fase P3) já operantes, a **Fase P4** conecta a física do **carretel da laje** (`spoolLength`) com o comportamento real de manobra no ar.

---

## 2. Ações Dinâmicas do Carretel (`RopePhysics`)

Foram implementados dois métodos físicos no carretel:
1. `pullIn(amount)`:
   - Recolhe linha no carretel da mão do empinador.
   - Encurta o comprimento físico liberado (`spoolLength`), esticando o fio e elevando a tensão elástica ($T_{\text{natural}} \to 1.0$).
2. `releaseSpool(amount)`:
   - Libera carretel em disparada ou sob comando.
   - Amplia o comprimento livre, gerando folga catenária (`lineSlack`) e permitindo que as correntes de vento arrastem a barriga da linha lateralmente.

---

## 3. Comportamento Aerodinâmico por Manobra (`Maneuvers.js`)

### 3.1 Retão Paulista (`retao`)
- **Física:** O empinador dá puxões contínuos em direção à laje.
- **Implementação:** `if (kite.rope) kite.rope.pullIn(step * 1.8);`
- **Resultado:** A linha perde toda a curvatura, ficando reta como uma lâmina esticada com tensão $1.0$. No `RelinhoContactSolver`, essa alta tensão multiplica a força normal $N$, conferindo corte rápido.

### 3.2 Despicada / Desbicada no Vento (`despicar`)
- **Física:** O empinador solta linha em pulsos rítmicos para o vento levar a pipa e a linha por cima ou por trás do adversário.
- **Implementação:** `if (kite.rope) kite.rope.releaseSpool(step * 2.2);`
- **Resultado:** O carretel cede comprimento, gerando a "barriga da linha" arrastada pelo vento lateral ($W_x$). Quando a linha toca a do adversário em movimento de descarrego, a velocidade de deslizamento $v_{\text{slide}}$ aumenta drasticamente, gerando serra abrasiva.

### 3.3 Mergulho e Curva em U (`mergulho`)
- **Física:** Desce furiosamente com o bico apontado para a terra e sobe em arco recuperando altura.
- **Implementação:**
  - Na descida: `kite.rope.releaseSpool(step * 1.2);` (cede levemente para descer solto).
  - Na subida: `kite.rope.pullIn(step * 1.5);` (traciona firme para erguer o bico).

### 3.4 Aparadas e Contra-Aparadas (`aparar_retao` / `aparar_despicada`)
- **Física:** O empinador "trava" o carretel e recolhe levemente sem dar folga para que a linha não seja enlaçada.
- **Implementação:** `if (kite.rope) kite.rope.pullIn(step * 0.3);`
- **Resultado:** Mantém a linha firme e estável, reduzindo a penetração abrasiva adversária.

---

## 4. Testes Automatizados Determinísticos (`tests/maneuvers-rope-p4.test.cjs`)

Adicionados 4 novos testes unitários com cobertura completa:
- `P4.1`: Manobra Retão recolhe carretel com `pullIn`, reduzindo `spoolLength` e elevando a tensão física.
- `P4.2`: Manobra Despicada libera carretel com `releaseSpool`, ativando `lineSlack` dinâmico sob influência do vento.
- `P4.3`: Manobra Mergulho alterna soltura na descida e tração rápida na subida em curva U.
- `P4.4`: Manobra Aparada mantém carretel firme e controlado sem expansão de folga.

**Resultado da suíte:** **212/212 testes aprovados (100% de sucesso)**.  
**Build de Produção:** Executado e validado via Vite em 5.88s, sincronizado com `frontend/dist-preview/`.
