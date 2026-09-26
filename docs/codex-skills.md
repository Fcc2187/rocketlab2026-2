# Skills e plugins usados no projeto

Este documento registra as ferramentas de orientação usadas durante a implementação do CineRate. Elas apoiaram decisões de engenharia, testes, design e refinamento visual, mas não fazem parte da aplicação executada pelo usuário.

## Engenharia

### `domain-modeling`

Usada para manter uma linguagem consistente entre backend e frontend e organizar os conceitos do domínio, como filme, avaliação, nota, média de avaliações e administrador.

### `tdd`

Usada para proteger comportamentos observáveis da aplicação. Foram criados e mantidos testes para autenticação, catálogo, filtros, avaliações, cache, destaque, CRUD e estados importantes do frontend.

### `code-review`

Usada como apoio na revisão da implementação contra os requisitos da atividade, procurando regressões, desvios de escopo, documentação desatualizada e complexidade desnecessária.

## Design e experiência

### `redesign-existing-projects`

Usada no início do redesign para analisar a interface existente, identificar pontos fortes, limitações e oportunidades de evolução sem alterar os fluxos funcionais da aplicação.

### `gpt-taste`

Usada como referência de direção visual e qualidade de interface, ajudando na escolha de hierarquia, composição, espaçamento e consistência do redesign.

### `high-end-visual-design`

Usada para elevar a qualidade visual da interface e orientar a direção "cinema editorial premium", principalmente em tipografia, contraste, composição, uso de imagens e identidade visual.

### `prototype`

Usada durante a etapa de prototipação no Figma para organizar e validar a nova direção visual antes da implementação no frontend.

### `emil-design-eng`

Usada como referência para aproximar decisões de design da implementação real, com atenção a estados, interação, responsividade e comportamento dos componentes.

### `impeccable`

Usada na revisão e no refinamento visual do frontend, incluindo hierarquia dos cards, responsividade, acessibilidade, tipografia, layout e polish final.

## Motion e microinterações

### `find-animation-opportunities`

Usada para identificar pontos em que animações e microinterações poderiam melhorar a percepção de resposta da interface sem adicionar movimento desnecessário.

### `animate`

Usada como orientação para implementar transições e microinterações no frontend.

### `review-animations`

Usada para revisar o comportamento das animações e verificar consistência, duração e adequação à interface.

### `improve-animations`

Usada para refinar animações existentes, evitando movimentos excessivos e preservando suporte a `prefers-reduced-motion`.

## Responsividade

### `mobile-native`

Usada como referência na revisão da experiência mobile, principalmente para tamanhos de toque, densidade, navegação e adaptação dos componentes para telas menores.

## Outras ferramentas

### `pdf`

Usada para consultar o arquivo `Atividade de Dev.pdf` como fonte dos requisitos da atividade.

### `ponytail`

Usada como orientação para manter a implementação simples, reaproveitar código existente e evitar abstrações ou dependências desnecessárias.

## Plugins e ferramentas de apoio

- **Figma MCP**: usado para consultar e trabalhar com o protótipo do redesign no Figma.
- **Impeccable**: forneceu referências e comandos para análise e refinamento da interface.
- **Ponytail**: forneceu orientações para reduzir complexidade e manter o escopo enxuto.

## O que não foi adicionado ao produto

Nenhuma dessas skills ou ferramentas é dependência de produção. A aplicação continua sendo executada apenas com as tecnologias definidas no projeto, como FastAPI, SQLAlchemy, SQLite, React, TypeScript, Vite e Tailwind.
