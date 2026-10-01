# 55 · Aprimoramento Visual e Cinematográfico dos 27 Mapas 3D do Brasil

**Data:** 29/09/2026  
**Status:** Concluído, Integrado, Construído e 100% Validado (**178/178 testes aprovados**)  
**Módulos Atualizados:**
- `frontend/src/ui/ThreeSkyScene.js`
- `dist/` (Bundle Vite minificado de produção)
- `docs/` (Documentação arquitetural indexada)

---

## 1. Visão Geral da Entrega

Atendendo à diretriz de elevar a qualidade gráfica, imersão cultural e vivacidade dos mapas dos 27 estados do Brasil ("PRECISAMOS MELHORAR os mapas"):

1. **Topografia Dinâmica Paramétrica (`computeMorroHeight`)**:
   - O relevo 3D agora modela morfologias autênticas de cada bioma brasileiro em vez de forçar o clássico morro granítico carioca em todos os estados:
     - **SP (Megalópole)**: Platô urbano escalonado em patamares/socalcos de concreto;
     - **RS (Pampa Gaúcho)**: Coxilhas suaves verdejantes com ondulações serenas;
     - **MT / MS (Pantanal)**: Planície alagada e várzea baixa com bacia fluvial;
     - **CE / RN / MA (Dunas & Lençóis)**: Ondulações de areia branca moldadas pelos ventos alísios;
     - **AM / PA / AC / RO / AP (Amazônia)**: Várzea baixa equatorial onde as copas de sumaúmas de 60m dominam a linha do horizonte;
     - **TO / PI / SE (Chapadões & Cânions)**: Degraus tabulares de arenito avermelhado em formato de mesas;
     - **DF / GO / RR (Cerrado, Lavrado & Tepuis)**: Platô central e formações rochosas tabulares;
     - **RJ / MG / ES / SC (Serras & Montanhas)**: Encostas escarpadas com serras e picos graníticos.

2. **Novos Elementos Cinematográficos e Mecânicos Vivos**:
   - **Aerogeradores Eólicos Móveis (`rotatingWindTurbines`)**: Em estados de intensa vocação eólica (Ceará, Rio Grande do Norte e fazendas do Rio Grande do Sul), foram erguidos aerogeradores modernos com rotor de 3 pás que giram em tempo real proporcionalmente à velocidade e direção do vento (`wind.x`).
   - **Faróis com Feixe de Luz Giratório (`rotatingLighthouses`)**: Farol da Barra (Bahia) e Farol do Cabo Branco (Paraíba) ganharam feixes de luz volumétricos de varredura que giram continuamente sobre o horizonte marinho.
   - **Espelhos d'Água Vivos com Ondulação Natural (`waterMeshes`)**: Rios e baías (Rio Amazonas, Baía de Guanabara, Baía de Todos os Santos, Lençóis Maranhenses, Bonito e Fervedouro do Jalapão) ondulam suavemente com harmônicos senoidais da brisa.
   - **Vitórias-Régias Flutuantes (`waterLilies`)**: No Rio Amazonas (AM) e Pantanal (MT), grandes folhas circulares com bordas elevadas e flores centrais flutuam e oscilam na superfície da água.

3. **Marcos Arquitetônicos e Culturais Inconfundíveis por Estado**:
   - **São Paulo (SP)**: Inclusão da **Ponte Estaiada Octávio Frias de Oliveira** com mastro em X e cabos estaiados iluminados, helipontos nos topos dos edifícios corporativos e antena com baliza do Edifício Altino Arantes (Banespa).
   - **Rio de Janeiro (RJ)**: Adição do **Cristo Redentor** no topo do Corcovado ao fundo com braços abertos, cabos aéreos do **Bondinho do Pão de Açúcar** com cabine vermelha suspensa e veleiro na Baía de Guanabara.
   - **Distrito Federal (DF)**: Modelagem fiel do **Congresso Nacional** (Torres Gêmeas Anexo I e II, cúpula côncava da Câmara dos Deputados e abóbada convexa do Senado Federal), a **Catedral Metropolitana de Brasília** com coroa hiperbólica de colunas e cruz, e a **Ponte JK** com seus arcos brancos sobre o Lago Paranoá.
   - **Bahia (BA)**: O imponente **Elevador Lacerda** (72m com passarela ligando Cidade Alta ao porto) e o **Farol da Barra** com feixe de luz giratório sobre a Baía de Todos os Santos.
   - **Paraná (PR)**: A estufa tripla de ferro branco e vidro do **Jardim Botânico de Curitiba** e as quedas das **Cataratas do Iguaçu** com névoa e espuma d'água.
   - **Amazonas (AM)**: A cúpula colorida do **Teatro Amazonas** de Manaus ao fundo e vitórias-régias flutuando no Rio Amazonas.
   - **Mato Grosso (MT)**: O ninho monumental do **Tuiuiú** (ave-símbolo do Pantanal) em tronco seco pantaneiro sobre a várzea alagada.
   - **Mato Grosso do Sul (MS)**: Deques flutuantes de madeira nas nascentes cristalinas de Bonito.

4. **Laje Frontal Regionalizada (`regionalLajeGroup`)**:
   - A laje do jogador adapta sua mobília cultural conforme a região:
     - **SP**: Condensadoras industriais de ar-condicionado com grades de aço e floreiras minimalistas;
     - **Sul (PR, RS, SC)**: Barril de carvalho rústico com cuia de chimarrão e bomba de prata, além de banco de madeira de serra;
     - **Colonial (MG, BA, PE)**: Vasos de cerâmica vidrada com orquídeas e lampiões de cobre;
     - **Litoral / Dunas (CE, RN, MA, AL, PB, SE)**: Bancada rústica com cocos verdes e esteiras de praia;
     - **Amazônia (AM, PA, AC, RO, AP)**: Totens de madeira entalhada com ponteiras cerâmicas;
     - **Centro-Oeste / Sertão (DF, GO, TO, PI, RR, MT, MS)**: Vasos de barro artesanal com Mandacarus em miniatura;
     - **RJ**: Preservadas as clássicas caixas d'água azuis de 1000L, churrasqueira de tijolos com fumaça, cadeira de praia amarela e caixa de som.

5. **Sincronia Atmosférica e Otimização Absoluta de GPU/RAM**:
   - A névoa de horizonte (`this.hazeGroup`) agora sincroniza sua tonalidade dinamicamente na troca de tema.
   - Todos os novos materiais possuem `userData = { isShared: true }` para garantir reuso sem duplicatas.
   - Zero alocações de vetores no loop de renderização (`update()`), preservando 60 FPS cravados.

---

## 2. Validação Técnica
- **Testes Unitários:** 178 de 178 testes aprovados (`npm test` executado em 1.43s).
- **Build de Produção:** Vite build concluído em 5.61s com chunks minificados (`dist/`).
