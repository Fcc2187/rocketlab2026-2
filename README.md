# RocketLab 2026.2 — backend

API FastAPI e banco SQLite para o catálogo e as avaliações de filmes da atividade. O frontend React/Vite será desenvolvido na próxima fase.

## Requisitos

- Python 3.11 ou superior
- Os dez arquivos CSV em `dados/`, já incluídos neste repositório

## Executar no Windows (PowerShell)

A partir da raiz do repositório:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.movies.import_csv ..\dados
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Se `py -3.11` não estiver disponível, substitua pelo caminho da sua instalação de Python 3.11+.

## Executar no macOS/Linux

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
cp .env.example .env
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.movies.import_csv ../dados
.venv/bin/python -m uvicorn app.main:app --reload
```

A API fica em `http://localhost:8000`, a documentação interativa em `http://localhost:8000/docs` e o teste de inicialização em `GET /health`.

A carga importa os dez CSVs em uma transação, exige o esquema criado pelo Alembic e recusa a repetição em um catálogo já preenchido. O banco local padrão é `backend/rocketlab.db`, configurável por `DATABASE_URL` em `.env`. Para começar com outro banco, aponte `DATABASE_URL` para um novo arquivo SQLite e execute a migração e a carga nesse arquivo. A carga reconcilia `dim_reviews` com as avaliações individuais.

## API

Todas as rotas abaixo usam o prefixo `/api/v1`. `page` começa em 1; `page_size` começa em 20 e aceita até 100. As listagens retornam `items`, `page`, `page_size`, `total` e `total_pages`.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/movies` | Catálogo paginado; filtros opcionais `q` (título), `ano` e `genero` |
| GET | `/movies/{sk_movie_id}` | Detalhes completos, pessoas, produtoras, métricas e média |
| POST | `/movies` | Cadastra um filme |
| PATCH | `/movies/{sk_movie_id}` | Atualiza somente os campos enviados |
| DELETE | `/movies/{sk_movie_id}` | Remove o filme e suas avaliações/vínculos |
| GET | `/movies/{sk_movie_id}/reviews` | Histórico paginado de avaliações |
| POST | `/movies/{sk_movie_id}/reviews` | Registra uma avaliação e atualiza a média |

Exemplo de filme:

```json
{
  "titulo": "Meu filme",
  "ano_lancamento": 2024,
  "sinopse": "Uma história.",
  "generos": ["Drama"],
  "diretores": ["Ana Silva"]
}
```

Na atualização, `generos: []` limpa os gêneros e `diretores: []` limpa apenas os diretores. Campos omitidos permanecem iguais. Títulos repetidos são permitidos; cada filme possui um `sk_movie_id` distinto.

Exemplo de avaliação:

```json
{
  "nome": "Maria",
  "nota_estrelas": 4.5,
  "comentario": "Gostei."
}
```

Novas avaliações aceitam de 1 a 5 estrelas, inclusive decimais. O banco e os CSVs usam notas de 0 a 10: a API multiplica por 2 ao gravar e divide por 2 ao exibir notas e médias. Por isso uma nota histórica de 0,9/10 aparece como 0,45 estrela. Filmes sem avaliações mostram quantidade 0 e média `null`.

## Verificações

Dentro de `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check app tests
```

No macOS/Linux, use `.venv/bin/python` no lugar de `.\.venv\Scripts\python.exe`. Os testes HTTP usam um banco temporário migrado pelo Alembic e não alteram o banco local. O projeto não inclui contas ou login nesta fase; o administrador é o operador previsto no enunciado.
