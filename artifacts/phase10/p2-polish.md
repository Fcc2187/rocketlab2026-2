# Fase 10 — P2 de densidade resolvido

Referência: snapshot 2026-09-26T13-27-04Z__frontend-src-app-tsx.md. Ajuste autorizado pelo usuário antes da fase11; somente frontend/src/App.tsx e frontend/src/index.css alterados nesta implementação.

Título completo preservado com escala menor (token display reutilizado); headline do catálogo subordinada; removidas descrição e contagem repetidas. Contagem continua no resumo de resultados. Mensagens de loading, erro e filtros permanecem. Espaçamentos antes dos cards reduzidos; min-height fixo do conteúdo hero mobile removido. Fontes e direção editorial preservadas.

| Cenário com título de57caracteres | Primeiro card antes | Depois | Antecipação |
|---|---:|---:|---:|
| Desktop1440x900 |1298.92px|907.25px|391.67px (30%)|
| Mobile390x844 |1273.25px|994.27px|278.98px (22%)|
| Mobile320x568 |1335.98px|1030.34px|305.64px (23%)|

Playwright polish-check-phase10.cjs passou em seis tamanhos:1440,1024,768,390,320,844px. Título integral, posição da coleção, contagem única, mensagens de busca/limpar filtros, loading/vazio/erro, foco, toque>=44px, ausência de overflow, falha/recuperação de imagem e erro da avaliação verificados. API simulada. Detector type antes/depois: mesmo aviso overused-font da fonte aprovada; nenhum alerta novo. git diff --check sem erros de whitespace.

Evidências: p2-before.json e evidence.json; p2-before-desktop.png/p2-before-mobile.png versus home-1440x900.png/home-390x844.png. Screenshots inspecionados. P3 dos metadados mobile não foi incluído neste pedido. Fase11 não iniciada. Celular real segue pendente.
