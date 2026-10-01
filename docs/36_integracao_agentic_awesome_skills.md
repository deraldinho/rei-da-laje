# 36. Integração Agentic Awesome Skills (AAS) no Antigravity

## Contexto

Instalação e configuração do ecossistema de habilidades do **Agentic Awesome Skills** (`sickn33/agentic-awesome-skills`) versão 18.7.0.

Para garantir alta performance, prevenir estouro de contexto/truncamento e focar nas necessidades reais do projeto (desenvolvimento web moderno, Three.js 3D, lógica de jogo, áudio, debugging e testes), foi selecionado o **Pacote Essencial de Desenvolvimento** em escopo **Global**.

---

## Localização e Estrutura

- **Diretório Canônico do Instalador**: `C:\Users\deral\.agents\skills`
- **Junction Global Antigravity**: `C:\Users\deral\.gemini\config\skills` -> aponta diretamente para o diretório canônico, permitindo descoberta nativa pelo Antigravity em qualquer projeto aberto.

---

## Skills Instaladas (29 Habilidades)

### 1. Core, Planejamento & Resolução de Problemas
- `concise-planning`: Planejamento conciso e estruturado antes de implementações complexas.
- `systematic-debugging`: Investigação rigorosa da causa raiz antes de aplicar correções.
- `test-driven-development`: Ciclos red-green-refactor para garantir confiabilidade.
- `lint-and-validate`: Manutenção de consistência e limpeza de código.
- `git-pushing`: Controle de versão e commits estruturados.

### 2. Desenvolvimento Web, Full-Stack & APIs
- `frontend-design`: Princípios de UI, layout, tipografia e estética moderna.
- `ui-ux-pro-max`: Sistemas de design profissionais, tokens e microinterações.
- `javascript-pro`: Padrões avançados de JavaScript ES6+ e assincronia.
- `typescript-expert`: Tipagem estrita e arquitetura em TypeScript.
- `nodejs-best-practices`: Padrões para backend assíncrono em Node.js.
- `senior-fullstack`: Arquitetura completa de sistemas ponta a ponta.
- `frontend-developer`: Melhores práticas em frameworks modernos.
- `backend-dev-guidelines`: Diretrizes de serviços, middlewares e validações.
- `api-patterns`: Design e contratos de comunicação REST/WebSocket.

### 3. Experiência 3D, Jogos & Canvas
- `3d-web-experience`: Desenvolvimento imersivo com Three.js, shaders e câmeras.
- `canvas-design`: Renderização em 2D Canvas e PixiJS.
- `mobile-design`: Interfaces responsivas para dispositivos móveis e lives verticais.
- `game-development/2d-games`: Física, colisões e ciclo de vida de jogos 2D.
- `game-development/3d-games`: Otimização de malhas, iluminação e modelos 3D.
- `game-development/game-design`: Mecânicas, balanceamento e loops de gameplay.
- `game-development/game-audio`: Efeitos sonoros espaciais, mixagem e feedback de áudio adaptativo.

### 4. Testes, Qualidade & Segurança
- `e2e-testing-patterns`: Testes ponta a ponta e automação de navegadores.
- `accessibility-compliance-accessibility-audit`: Conformidade com acessibilidade (WCAG).
- `api-security-best-practices`: Proteção de rotas, tokens e rate-limiting.
- `frontend-security-coder`: Mitigação de XSS e segurança do cliente.
- `backend-security-coder`: Sanitização de dados e segurança do servidor.
- `security-auditor`: Varredura e auditoria de vulnerabilidades.

### 5. Integrações de IA e Extensibilidade
- `mcp-builder`: Criação e integração de ferramentas via Model Context Protocol (MCP).
- `prompt-engineering`: Formulação de prompts avançados e instruções de agentes.

---

## Como Utilizar

As skills já estão ativas e disponíveis no ambiente:
1. Durante a interação, o assistente ativa e consulta progressivamente cada procedimento conforme a necessidade da tarefa (por exemplo, ao lidar com Three.js, testes E2E, debugar comportamentos anômalos ou aprimorar o game design).
2. Para adicionar skills adicionais no futuro, o comando oficial pode ser executado:
   ```bash
   npx agentic-awesome-skills --skills <nome-da-skill>
   ```
