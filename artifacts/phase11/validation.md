# Fase 11 — validação final do frontend

Data:2026-09-26. Redesign experimental na branch experiment/figma-redesign. Validação automatizada do frontend concluída; não houve alteração de código de produção nesta fase.

## Comandos em frontend/

| Comando executado | Resultado |
|---|---|
| npm.cmd test | Exit0;2arquivos;13testes passaram |
| npm.cmd run lint | Exit0; sem erros de oxlint |
| npm.cmd run build | Exit0; TypeScript e Vite concluídos;28módulos |

O comando npm em PowerShell selecionou npm.ps1, bloqueado pela política de execução do Windows. Usado npm.cmd, o wrapper nativo do mesmo npm; nenhuma política do sistema foi alterada.

Build: CSS28.03kB (gzip6.64kB), JS248.81kB (gzip76.12kB), HTML0.85kB (gzip0.43kB). Fontes locais distribuídas com suas licenças. Tamanhos de bundle não são uma medição de desempenho em hardware.

## Verificações no navegador

Executados com Chromium headless e Playwright já disponível no cache, sem instalar dependências:

- polish-check-phase10.cjs: exit0; home em1440x900,1024x768,768x1024,390x844,320x568,844x390. Sem overflow; inputs>=16px; alvos de controles>=44px. Título completo e melhoria P2 mantidos. Busca/limpar filtros, mensagens, loading, vazio, erro, recuperação dos filtros, falha/recuperação da imagem, skiplink, foco do diálogo, paisagem e erro de publicação passaram.
- visual-check-phase6.cjs: exit0; detalhes/avaliação em1440,390,320px; foco, Escape, paginação independente de reviews, publicação e payload, conteúdo longo, vazio, erro e imagem ausente passaram.
- visual-check-phase7.cjs: exit0; login, credenciais inválidas, cadastro, falha de cadastro, chips/Enter/deduplicação/remoção, edição via PATCH parcial, exclusão, falha de exclusão e Escape passaram em1440,390,320px. Operações administrativas mantiveram Authorization: Bearer visual-token.
- motion-check-phase8.cjs: exit0; transições reais de entrada, hover, toque emulado, press/release, interrupções e prefers-reduced-motion passaram. Reduced motion preserva feedback em opacity sem transform.

Scripts browser verificam pageerror; nenhum erro JavaScript foi registrado nas execuções aprovadas. Screenshots/evidências atualizados nas pastas phase6,phase7,phase8,phase10. API e imagens simuladas; fixture de imagem local exportada do Figma.

## Checklist de preservação

| Requisito | Evidência |
|---|---|
| Busca por título | Teste de parâmetros q e verificação de mensagens/limpar busca |
| Filtro por gênero/ano | Teste de parâmetros genero/ano e reset de paginação |
| Paginação | Teste de catálogo e reviews independentes; browser de reviews |
| Filme em destaque | Teste comprova destaque global inalterado quando busca muda; fallback/recuperação de imagem |
| Detalhes | Browser valida conteúdo, ficha técnica e estados em três larguras |
| Avaliações | Teste de publicação sem login e média atualizada; browser confirma payload e recuperação de erro |
| Login/logout | Testes de revelação/ocultação da administração, credenciais inválidas e StrictMode; browser de login |
| Cadastro/edição/exclusão | Teste de operações e filme criado sem pôster; browser de POST/PATCH/DELETE com token |
| Loading/erro/vazio | Testes de recuperação e cenários browser dedicados |
| Rotas | Diff confirma âncoras #inicio/#catalogo e caminhos da API preservados; não adicionado router |
| Backend/API/banco/regras | git diff --numstat para backend e frontend/src/api sem saída; handlers de requests e transformações de dados dos formulários preservados no diff |
| Autenticação | Cliente auth inalterado; handlers de login, token, logout e chamadas protegidas preservados; testes e browser com API simulada |
| Framework/dependências | Manifests frontend/package.json e frontend/package-lock.json sem diff |

Diff dos componentes revisado: alterações de apresentação, sem remoção dos fluxos existentes; melhorias explícitas de acessibilidade/foco e recuperação visual de imagem. Testes App.test.tsx alterados nas fases anteriores somente nos seletores do ícone administrativo e do heading duplicado de filme. Nenhuma asserção funcional foi removida. Mudanças anteriores do usuário em skills-lock.json, skills e fases.md preservadas.

## Limites e pendências

- Integração com backend real não foi executada. Testes e Playwright simulam HTTP; portanto isto não certifica servidor, banco, credenciais reais ou disponibilidade da API.
- Sem celular físico: teclado virtual, barras do navegador, safe areas e sensação real de toque seguem para conferência em hardware.
- Sem leitor de tela real; não é certificação WCAG.
- P3 de metadados mobile permanece uma oportunidade opcional documentada no critique. P2 de densidade foi resolvido antes desta fase, conforme artifacts/phase10/p2-polish.md.
- Não realizado commit, merge ou deploy. fases.md original não foi modificado.

## Fechamento com Prettier

Executado npm.cmd run format em frontend/ com exit0. Apenas src/App.tsx e index.html precisaram de ajustes de formatação; os demais arquivos foram reportados como unchanged. Após formatar, repetidos npm.cmd test (13/13,2arquivos,exit0), npm.cmd run lint (exit0) e npm.cmd run build (exit0). CSS e JavaScript mantiveram os mesmos hashes/tamanhos; HTML formatado passou a0.87kB (gzip0.43kB). Limites de integração real e hardware acima permanecem.
