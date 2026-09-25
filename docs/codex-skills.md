# Skills e plugins usados no projeto

Este documento registra as ferramentas de orientação usadas durante a implementação do CineRate. Elas ajudaram no processo de desenvolvimento e não fazem parte da aplicação executada pelo usuário.

## Skills

### `domain-modeling`

Usada para manter uma linguagem única entre backend e frontend e consultar o contexto do domínio. A documentação do projeto usa os termos filme, avaliação, nota, média de avaliações e administrador de forma consistente.

### `tdd`

Usada para proteger comportamentos observáveis nas interfaces públicas. Foram adicionados e mantidos testes para autenticação, catálogo, filtros, avaliações, cache, destaque, CRUD e estados importantes do frontend.

### `code-review`

Usada como referência para conferir a implementação contra os padrões do repositório e o enunciado da atividade, procurando desvios de escopo, documentação desatualizada e complexidade desnecessária.

### `impeccable`

Usada na revisão visual do frontend e no ajuste de layout. Orientou a análise do protótipo, a hierarquia dos cards, responsividade, acessibilidade e o alinhamento dos botões de avaliação quando títulos tinham tamanhos diferentes.

### `pdf`

Usada para tratar o arquivo `Atividade de Dev.pdf` como referência da atividade e orientar a inspeção do material de requisitos.

### `ponytail`

Usada como critério de simplicidade: reaproveitar código existente, evitar camadas e dependências sem necessidade e escolher a menor implementação que preserve o comportamento.

## Plugins e ferramentas de apoio

- **OpenAI primary runtime**: disponibilizou a skill de PDF e o ambiente de execução usado nas verificações.
- **Impeccable**: forneceu os comandos e referências para análise de interface e layout.
- **Ponytail**: forneceu as regras para reduzir abstrações e manter o escopo enxuto.

## O que não foi adicionado ao produto

Nenhuma dessas skills ou ferramentas é dependência de produção. O sistema continua sendo executado apenas com FastAPI, SQLAlchemy, SQLite, React, TypeScript, Vite e Tailwind.
