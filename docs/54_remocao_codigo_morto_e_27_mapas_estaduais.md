> **STATUS: HISTÓRICO / CHECKPOINT.** Este arquivo registra uma etapa real do desenvolvimento, mas não define sozinho a regra vigente. Em caso de conflito sobre vento, comentários, alvos, presentes, manobras, contato ou corte, prevalecem `00_arquitetura_vigente.md` e `superpowers/specs/2026-10-02-hybrid-live-kite-combat-design.md`.

# 54 · Remoção de Código Morto, Consolidação do Render 3D e 27 Mapas Estaduais do Brasil

**Data:** 29/09/2026  
**Status:** Concluído, Integrado, Construído e 100% Validado (**178/178 testes aprovados**)  
**Módulos Atualizados:**
- `frontend/src/engine/App.js`
- `frontend/src/entities/Kite.js`
- `frontend/src/ui/ThreeSkyScene.js`
- `frontend/src/ui/HUD.js`
- `backend/settingsManager.js`
- `backend/views/admin.html`
- `dist/` (Bundle Vite minificado de produção)

---

## 1. Visão Geral da Entrega

Atendendo à decisão estratégica de combate ao **Feature Creep**, consolidação de performance e valorização da identidade cultural brasileira:

1. **Remoção de Código Morto (Item 1)**:
   - Eliminada a importação e a execução de `applyChatAction()` em `frontend/src/engine/App.js`. Como comentários de chat não realizam manobras de combate (dinâmica oficial movida a vento e presentes), a verificação frame-a-frame de comandos e combos antigos foi erradicada do runtime de produção.
   - Otimizado `updateManeuverVisual()` em `frontend/src/entities/Kite.js` para não calcular nem desenhar se a pipa estiver invisível ou sob container oculto.

2. **Consolidação do Render (Item 3 - Fim do Render Duplo 2D + 3D)**:
   - Em `App.js` (`sync3DDisplay`), todos os containers 2D de gameplay do PixiJS (`rooftopPlayers`, `linesContainer`, `fallingContainer`, `sparks`, `kitesContainer`) agora recebem `renderable = !is3D` além de `visible = !is3D`.
   - O PixiJS atua estritamente como camada de alta velocidade para o HUD, avisos e interface, eliminando o gasto de CPU e GPU de recalcular e atravessar árvores de nós 2D que ficavam por baixo do Three.js.

3. **Implementação Completa dos 27 Mapas Estaduais 3D (Item 2)**:
   - Cada um dos 27 estados do Brasil ganhou uma representação cenográfica tridimensional autêntica, detalhada e única em `frontend/src/ui/ThreeSkyScene.js`.
   - Implementado o método mestre `setTheme(code)` que adapta dinamicamente:
     - Gradiente do céu (`updateSkyTexture`);
     - Cor da neblina de horizonte (`scene.fog`);
     - Tonalidade de iluminação atmosférica conforme a macrorregião (Norte, Nordeste, Centro-Oeste, Sudeste, Sul);
     - Geometria e escala das cordilheiras distantes (`updateDistantPeaksForTheme`);
     - Marcos regionais 3D exclusivos de cada estado (`buildRegionalMap`).

---

## 2. Guia dos 27 Mapas Estaduais 3D

| Estado | Região | Relevo & Céu | Marcos Regionais 3D Exclusivos |
| :--- | :---: | :--- | :--- |
| **SP** (São Paulo) | Sudeste | Céu metropolitano cinza-azulado | 16 arranha-céus corporativos com janelas de vidro e antenas de transmissão de rádio com balizas vermelhas piscantes (Av. Paulista). |
| **RJ** (Rio de Janeiro) | Sudeste | Céu ensolarado e mar ao fundo | Laje na favela carioca, Pão de Açúcar e Morro Dois Irmãos graníticos e vegetação densa de Mata Atlântica. |
| **MG** (Minas Gerais) | Sudeste | Mar de morros verde-oliva | Igreja barroca colonial de Ouro Preto com torres sineiras gêmeas e casario histórico em terraços montanhosos. |
| **ES** (Espírito Santo) | Sudeste | Litoral rochoso capixaba | Penhasco sobre o mar com o histórico Convento da Penha no cume e floresta atlântica de encosta. |
| **BA** (Bahia) | Nordeste | Luz quente da Baía de Todos os Santos | Casarões coloniais históricos do Pelourinho em tons pastéis (azul, ocre, rosa), palmeiras imperiais altas e torre com sino. |
| **PE** (Pernambuco) | Nordeste | Mar com recifes e céu azul vibrante | Ladeiras históricas coloridas de Olinda, pontes sobre os rios e telhados de barro colonial. |
| **CE** (Ceará) | Nordeste | Céu límpido de sol forte | Grandes dunas de areia clara, coqueirais inclinados pelo vento de Jericoacoara e jangada de praia. |
| **RN** (Rio Grande do Norte) | Nordeste | Dunas alvas de Genipabu | Dunas esculpidas pelos ventos alísios e coqueirais litorâneos. |
| **MA** (Maranhão) | Nordeste | Azul turquesa dos Lençóis | Dunas de areia branca pura intercaladas por lagoas de água doce azul-cristalina. |
| **AL** (Alagoas) | Nordeste | Litoral dos corais caribenho | Falésias de arenito vermelho, piscinas naturais e mar verde-esmeralda. |
| **PB** (Paraíba) | Nordeste | Extremo oriental das Américas | Falésias vivas do Cabo Branco e cactos do agreste costeiro. |
| **SE** (Sergipe) | Nordeste | Cânion do Xingó | Paredões de arenito alaranjado às margens do Rio São Francisco. |
| **PI** (Piauí) | Nordeste | Sertão da Serra da Capivara | Monumentos rochosos megalíticos avermelhados (Pedra Furada) e cactos Mandacaru gigantes. |
| **PR** (Paraná) | Sul | Céu límpido e frio de planalto | Bosque com 16 Araucárias (*Araucaria angustifolia*) com copas em taça invertida e cerca rústica. |
| **RS** (Rio Grande do Sul) | Sul | Pampa gaúcho ventoso | Coxilhas verdes onduladas a perder de vista, galpão de madeira rústica e araucárias de serra. |
| **SC** (Santa Catarina) | Sul | Serra do Rio do Rastro | Desfiladeiros escarpados de pedra cinza, pinheiros e mar litorâneo. |
| **AM** (Amazonas) | Norte | Céu equatorial verde-esmeralda | Imensidão do Rio Amazonas, castanheiras/sumaúmas gigantes de 50m de copa e palafitas ribeirinhas. |
| **PA** (Pará) | Norte | Luz dourada da Baía do Guajará | Palmeiras de açaí, floresta de mangue com raízes aéreas e vegetação densa. |
| **AC** (Acre) | Norte | Fronteira verde equatorial | Seringueiras gigantes, pontes de madeira e selva amazônica fechada. |
| **RO** (Rondônia) | Norte | Vales do Guaporé | Florestas de transição, ribanceiras fluviais e árvores de grande porte. |
| **RR** (Roraima) | Norte | Céu puro de altitude | O colossal Monte Roraima (tepui com paredões verticais e platô reto) e savana do lavrado. |
| **AP** (Amapá) | Norte | Linha do Equador | Floresta densa equatorial na foz do Rio Amazonas. |
| **TO** (Tocantins) | Norte | Jalapão dourado | Chapadão monumental de arenito alaranjado com topo plano, dunas douradas e fervedouros. |
| **DF** (Distrito Federal) | Centro-Oeste | O vasto "mar de Brasília" | Árvores retorcidas de cerrado, solo vermelho de latossolo e silhuetas de colunas modernistas. |
| **GO** (Goiás) | Centro-Oeste | Chapada dos Veadeiros | Cânions esculpidos em quartzo, solo avermelhado e vegetação de cerrado. |
| **MT** (Mato Grosso) | Centro-Oeste | Pantanal Norte | Planície alagada com espelho d'água pantaneiro, pontes de madeira e ipês amarelos em flor. |
| **MS** (Mato Grosso do Sul) | Centro-Oeste | Pantanal Sul & Bonito | Rios cristalinos azul-esverdeados, vegetação pantaneira e pontes rústicas. |

---

## 3. Seleção e Controle dos Mapas

1. **Painel Admin (`/admin.html`)**:
   - O campo **Mapa & Estado do Brasil** foi atualizado com todos os 27 estados organizados por região (`Sudeste`, `Nordeste`, `Sul`, `Norte`, `Centro-Oeste`). O streamer pode trocar o mapa a qualquer momento com efeito imediato.
2. **Rotação Automática**:
   - Mantida a rotação a cada 10 minutos pelo relógio (`rotateByClock`), fazendo com que a live viaje organicamente por todo o Brasil durante a transmissão.
3. **Feedback Visual no HUD**:
   - Cada troca de estado aciona um aviso elegante na tela do jogo: `📍 MAPA 3D: SÃO PAULO (SUDESTE)`.

---

## 4. Validação Técnica
- **Testes Unitários:** 178 de 178 testes aprovados (`npm test`).
- **Build de Produção:** Concluído com sucesso via Vite (`npm run build`).
