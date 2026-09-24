# Plano de implementação — backend da atividade

**Objetivo:** entregar, nesta primeira fase, o backend FastAPI completo para o catálogo e as avaliações de filmes do enunciado. O frontend fica para a fase seguinte.

**Enunciado:** `Atividade de Dev.pdf` (requisitos na única página). **Base:** `backend/` atual. **Execução:** na `main`, em etapas pequenas. **Linguagem do domínio:** `CONTEXT.md`.

## Decisões de contrato

- O administrador é o único operador previsto. Não haverá conta ou login nesta fase: o enunciado não pede autenticação e a base não tem usuários. O campo `nome` identifica o autor exibido de cada avaliação.
- `sk_movie_id` é o identificador público do filme. `id_filme` continua sendo o identificador de origem dos CSVs; novos filmes recebem `manual:<uuid>` para satisfazer a coluna única existente. Títulos iguais são permitidos.
- A API recebe novas avaliações em `nota_estrelas` de 1 a 5, inclusive valores decimais, e grava `nota = nota_estrelas * 2` na escala 0–10 do banco. Nas respostas, toda nota individual e a média são apresentadas em estrelas, dividindo por 2. Assim, uma avaliação histórica de 0,9/10 aparece como 0,45 estrela; a restrição 1–5 vale somente para novas avaliações.
- A média é aritmética, sem peso, calculada sobre todas as avaliações individuais do filme. Filmes sem avaliações retornam `quantidade_avaliacoes: 0` e `media_estrelas: null`. A tabela `dim_reviews` é reconciliada após a carga inicial e atualizada na mesma transação de cada nova avaliação.
- Novos filmes recebem título obrigatório; ano, sinopse, gêneros e diretores são campos editáveis. Gêneros e diretores são listas para representar filmes importados com múltiplos vínculos. `PATCH` altera somente os campos enviados; listas vazias limpam apenas o vínculo correspondente. Atores, roteiristas, produtoras e métricas importadas permanecem disponíveis na leitura.
- A listagem e as avaliações são paginadas desde o início. Padrão: `page=1`, `page_size=20`, máximo 100, ordenação determinística por `titulo` + `sk_movie_id` no catálogo e `created_at` + `sk_movie_review_id` no histórico. Busca `q` filtra por parte do título, sem diferenciar maiúsculas/minúsculas; filtros opcionais `ano` e `genero` são extras adotados.
- Erros de entrada retornam 422; filme inexistente retorna 404; criação retorna 201; exclusão retorna 204. A API usa o prefixo já existente `/api/v1` e formatos JSON documentados pelo OpenAPI do FastAPI.

## Contrato HTTP para o frontend

| Rota | Entrada | Saída principal |
| --- | --- | --- |
| `GET /api/v1/movies` | `page`, `page_size`, `q?`, `ano?`, `genero?` | `{items, page, page_size, total, total_pages}`; cada item traz ID, título, ano, poster, gêneros, quantidade e média em estrelas |
| `GET /api/v1/movies/{sk_movie_id}` | ID | todos os campos de `dim_movies`, gêneros, produtoras, pessoas agrupadas por papel, `fact_movies_performance`, quantidade e média |
| `POST /api/v1/movies` | `{titulo, ano_lancamento?, sinopse?, generos?: string[], diretores?: string[]}` | filme criado, com ID gerado |
| `PATCH /api/v1/movies/{sk_movie_id}` | subconjunto dos campos do cadastro | filme atualizado |
| `DELETE /api/v1/movies/{sk_movie_id}` | ID | 204, com remoção em cascata de avaliações e vínculos |
| `GET /api/v1/movies/{sk_movie_id}/reviews` | `page`, `page_size` | `{items, page, page_size, total, total_pages}`; item: ID, nome, `nota_estrelas`, comentário, data |
| `POST /api/v1/movies/{sk_movie_id}/reviews` | `{nome, nota_estrelas, comentario}` | avaliação criada e nova quantidade/média |

O detalhe do filme e o histórico paginado são duas consultas HTTP da mesma tela. Não devolver todo o histórico no detalhe evita respostas sem limite. A API deve usar nomes de campos em português, como já fazem os modelos e os CSVs; os nomes de rotas seguem o ponto de composição `/api/v1/movies` da base.

## Arquivos e responsabilidades previstos

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Carga | `backend/app/movies/import_csv.py`, `backend/tests/test_import_csv.py` | comando de importação com `csv.DictReader` e `sqlite3`, lotes e transação única |
| API | `backend/app/movies/router.py`, `backend/app/movies/schemas.py`, `backend/app/api/v1/router.py` | rotas, validação e respostas; consultas SQLAlchemy no módulo de filmes, sem camadas artificiais |
| Testes | `backend/tests/test_movies_api.py`, `backend/tests/test_reviews_api.py` | comportamento observado pela API HTTP com SQLite temporário |
| Documentação | `README.md`, `backend/.env.example` se necessário | instalação, migração, importação, execução, testes e contrato |

Preservar `backend/app/movies/models.py`, a migração inicial e a configuração existentes. Alterar o esquema somente se um caso real exigir, criando uma nova revisão Alembic; não editar a revisão `0001` já publicada.

## Foco da revisão

1. CSV com texto entre aspas, campo vazio ou chave estrangeira inválida: a carga mantém os valores corretos ou desfaz a transação inteira (etapa 2).
2. Filmes com o mesmo título e múltiplos gêneros: a busca e a paginação devolvem cada filme uma vez, em ordem estável (etapas 1 e 3).
3. Avaliações individuais sem linha correspondente no CSV de resumos: a média é criada e exibida corretamente (etapas 2 e 6).
4. Notas históricas abaixo de uma estrela ou decimais: a conversão preserva o valor, enquanto novas notas fora de 1–5 são rejeitadas (etapas 4 e 6).
5. Filme ausente e páginas fora do intervalo: 404 no primeiro caso, lista vazia e metadados coerentes no segundo (etapas 3, 4, 5 e 6).

## Etapas executáveis

### 1. Fixar os comportamentos essenciais e o ambiente de teste

- [ ] Preparar uma fixture mínima de SQLite temporário que execute `alembic upgrade head` e substitua `get_db` no FastAPI. Usar a API HTTP como seam dos testes; usar o comando de importação como seam da carga. Registrar esses dois seams antes de iniciar TDD.
- [ ] Escrever um teste de leitura do catálogo vazio e outro com dois filmes de mesmo título, garantindo IDs distintos e ordem estável. Executar para ver falhar; implementar só a listagem necessária; executar de novo para ver passar.
- [ ] Manter cada próximo comportamento no ciclo da skill `tdd`: um teste público falhando, implementação mínima e teste passando. Sem testes de detalhes internos do ORM.

**Aceite:** ambiente isolado e primeiro teste de catálogo verde; nenhum teste usa o banco local `rocketlab.db`.

### 2. Carregar os dez CSVs fornecidos

- [ ] Criar comando executável a partir de `backend/`, por exemplo `python -m app.movies.import_csv ../dados`, com `DATABASE_URL` SQLite e schema previamente migrado.
- [ ] Ler com `csv.DictReader` em UTF-8 e gravar por lotes, sem carregar os arquivos grandes por inteiro na memória. Importar dimensões (`dim_movies`, `dim_genres`, `dim_companies`, `dim_people`), fatos, pontes, `movies_reviews.csv` em `movie_reviews` e `dim_reviews.csv` em `dim_reviews`, respeitando chaves estrangeiras. Converter vazios em `NULL`, datas ISO, números decimais e contagens como `2375.0` em inteiros quando integrais.
- [ ] Rodar a carga inteira em uma transação com FK habilitada. Se qualquer linha for inválida, exibir arquivo e linha e desfazer tudo. Recusar uma segunda carga sobre catálogo já preenchido, sem duplicar registros nem sobrescrever filmes criados manualmente.
- [ ] Reconciliar `dim_reviews` a partir de `movie_reviews`: atualizar linhas existentes, inserir resumos faltantes e remover resumos sem avaliações individuais. Essa regra é necessária porque os dois CSVs podem cobrir conjuntos diferentes de filmes.
- [ ] Testar com CSVs pequenos incluindo campo entre aspas com vírgula, valor vazio, FK inválida e reexecução. Conferir na carga real contagem por tabela e ausência de FK órfã.

**Aceite:** todos os arquivos são consumidos; a carga real termina sem perda silenciosa, mantém os IDs de filmes e avaliações dos CSVs e a média de cada filme coincide com suas avaliações individuais. IDs de resumos descartados por falta de avaliações não são preservados.

### 3. Catálogo paginado, busca e filtros

- [ ] Implementar `GET /movies` com contagem total antes de `limit/offset`, `page >= 1`, `1 <= page_size <= 100`, ordenação estável e itens enxutos.
- [ ] Aplicar `q` sobre título e, como extra backend útil, `ano` e `genero`. Combinar filtros por interseção e evitar duplicatas quando a consulta cruza a tabela de gêneros.
- [ ] Incluir média e quantidade por filme sem fazer uma consulta por item. Usar join/agrupamento ou os resumos reconciliados, conforme o resultado mais simples e correto para a paginação.
- [ ] Testar página vazia, última página, busca sem resultado, maiúsculas/minúsculas, filtros combinados e dois filmes de mesmo título.

**Aceite:** o catálogo dá ao frontend dados e metadados suficientes para navegação e busca; a paginação não perde nem repete filmes por causa dos vínculos N:N.

### 4. Detalhe completo e histórico de avaliações

- [ ] Implementar `GET /movies/{id}` com os campos existentes, gêneros, produtoras, pessoas separadas em atores/diretores/roteiristas, métricas financeiras e de engajamento, quantidade e média. Carregar relações explicitamente para evitar acesso assíncrono implícito e consultas repetidas.
- [ ] Implementar `GET /movies/{id}/reviews` com paginação e ordem estável. Converter notas históricas 0–10 para estrelas sem truncar valores decimais; expor `created_at`.
- [ ] Testar filme sem avaliações, filme com relações múltiplas, nota histórica abaixo de uma estrela, ID inexistente e página de avaliações fora do intervalo.

**Aceite:** uma tela de detalhe consegue montar todas as informações e percorrer o histórico sem resposta ilimitada.

### 5. Cadastro, atualização e remoção de filmes

- [ ] Implementar `POST`, `PATCH` e `DELETE` com validação de título não vazio, limites das colunas existentes e listas de nomes sem entradas vazias ou duplicadas. Gerar `sk_movie_id` e `id_filme` manual único no cadastro.
- [ ] Reutilizar `DimGenre` e `DimPerson` existentes pelo nome e papel; só criar registros ausentes. Atualizar gêneros e diretores quando enviados, preservando atores, roteiristas, produtoras e métricas importadas. Exclusão usa cascatas já definidas no banco.
- [ ] Testar cadastro com e sem campos opcionais, dois filmes de mesmo título, reutilização de gênero/diretor, `PATCH` parcial, lista vazia, ausência de filme e remoção com avaliações.

**Aceite:** CRUD individual funciona sem quebrar o catálogo importado nem criar dimensões duplicadas.

### 6. Nova avaliação e média consistente

- [ ] Implementar `POST /movies/{id}/reviews` com `nome` e `comentario` não vazios, nota finita entre 1 e 5, tamanho limitado às colunas existentes. Gravar a nota na escala 0–10 e atualizar `dim_reviews` na mesma transação; criar resumo se o filme ainda não tiver um.
- [ ] Retornar a avaliação criada e a nova quantidade/média em estrelas. Erro na criação ou atualização do resumo deve desfazer ambas as escritas.
- [ ] Testar primeira avaliação, segunda avaliação com média conhecida, nota 1, nota 5, decimal, nota inválida, comentário vazio e filme inexistente. Confirmar que `GET /movies` e `GET /movies/{id}` mostram o mesmo agregado após a escrita.

**Aceite:** lista, detalhe e histórico exibem a mesma realidade após qualquer avaliação nova.

### 7. Documentação e conferência da entrega

- [ ] Atualizar `README.md` com comandos para Python 3.11+, instalação, `.env`, `alembic upgrade head`, carga dos CSVs, início do servidor, `/docs`, testes e formato dos endpoints. Incluir comandos adequados para PowerShell e shell Unix quando diferirem.
- [ ] Conferir que `/docs` contém todos os contratos, exemplos e códigos de erro. Manter CORS local pronto para o Vite da fase seguinte.
- [ ] Executar os testes essenciais, `ruff check backend`, migração em banco vazio e carga real; registrar no fechamento contagens das tabelas e eventual limitação encontrada.
- [ ] Revisar a implementação contra este plano e cada linha do enunciado com a skill `code-review`, usando como ponto fixo o commit anterior ao início da implementação. Corrigir lacunas antes de considerar o backend pronto.
- [ ] Versionar cada etapa na `main` e publicar a entrega concluída em `origin/main`, após a revisão, para cumprir o requisito de GitHub do enunciado.

**Aceite:** outra pessoa consegue subir o backend e obter um catálogo populado seguindo apenas o README.

## Extras do enunciado

| Extra sugerido | Decisão nesta fase |
| --- | --- |
| Testes automatizados | Incluídos para carga, rotas e regras essenciais com a skill `tdd`. |
| Filtros | Incluídos `ano` e `genero` no catálogo, além da busca por título. |
| Documentação | Incluídos OpenAPI automático e README executável; Storybook pertence ao frontend. |
| Autenticação | Fora do escopo atual: há um administrador conceitual, sem contas ou requisito de login. Se for exigida depois, proteger rotas de escrita com uma solução apropriada. |
| Caching de consultas | Adiado até haver medição de lentidão; os resumos e índices existentes atendem a primeira versão. |
| Responsividade | Pertence à fase de frontend. |

## Matriz de cobertura do PDF

| Requisito | Etapa |
| --- | --- |
| Cadastrar filme | 5 |
| Catálogo paginado | 3 |
| Detalhes completos e histórico | 4 |
| Busca por filme | 3 |
| Atualizar e remover individualmente | 5 |
| Adicionar nota e resenha de 1–5 estrelas | 6 |
| Ver média por filme | 2, 3, 4 e 6 |
| Popular banco com CSVs fornecidos | 2 |
| README para execução e versionamento no GitHub | 7 e commits por etapa |

## Riscos concretos para observar na execução

- Os CSVs são grandes (aproximadamente 95 mil filmes, 424 mil pessoas e 745 mil vínculos filme-pessoa); carga em lotes e paginação são obrigatórias para não consumir memória excessiva.
- `movies_reviews.csv` e `dim_reviews.csv` não cobrem necessariamente os mesmos filmes; o resumo deve ser reconciliado com as linhas individuais para evitar média errada ou ausente.
- SQLite compara texto com regras limitadas para acentos; a busca básica será case-insensitive por título, sem prometer equivalência entre letras acentuadas e não acentuadas.
- Uma avaliação importada pode ter nota menor que 2/10; ela continua válida no histórico mesmo que a criação de novas avaliações comece em 1 estrela.
