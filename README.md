# RocketLab 2026.2

API FastAPI e banco SQLite para o catálogo e as avaliações de filmes da atividade. O frontend é uma SPA em Vite, React, TypeScript e Tailwind.

## Frontend

```bash
cd frontend
npm ci
npm run dev
```

O frontend abre em `http://localhost:5173` e usa a API em `http://localhost:8000/api/v1` por padrão. Para outra URL, copie `frontend/.env.example` para `frontend/.env` e ajuste `VITE_API_URL` antes de iniciar o Vite. O catálogo e as avaliações são públicos; o login em modal libera o cadastro, a edição e a exclusão. O token administrativo fica apenas em memória.

## Funcionalidades principais

- Catálogo público com busca por título, filtros por gênero e ano, ordenação visual por pôster e paginação.
- Detalhes do filme com elenco, diretores, gêneros, métricas e histórico paginado de avaliações.
- Avaliações públicas sem login, usando notas de 0 a 10 e atualização da média após o envio.
- Login administrativo em modal, com cadastro, edição e exclusão de filmes protegidos por JWT.
- Filme em destaque global: exige imagem e pelo menos 3 avaliações; escolhe a maior média e usa a quantidade de avaliações como desempate. A busca e os filtros do catálogo não alteram esse destaque.
- Resolução case-insensitive de gêneros e diretores, incluindo caracteres acentuados, sem criar entidades duplicadas.
- Cache local das leituras, invalidado depois de escritas bem-sucedidas.

## Requisitos

- Python 3.11 ou superior
- Node.js com npm
- Os dez arquivos CSV em `dados/`, já incluídos neste repositório

## Executar no Windows (PowerShell)

A partir da raiz do repositório:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
# Preencha ADMIN_USERNAME, ADMIN_PASSWORD_HASH e AUTH_SECRET_KEY no .env
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.movies.import_csv ..\dados
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Executar no macOS/Linux

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
cp .env.example .env
# Preencha ADMIN_USERNAME, ADMIN_PASSWORD_HASH e AUTH_SECRET_KEY no .env
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m app.movies.import_csv ../dados
.venv/bin/python -m uvicorn app.main:app --reload
```

A API fica em `http://localhost:8000`, a documentação interativa em `http://localhost:8000/docs` e o teste de inicialização em `GET /health`.

### Configurar o administrador

Defina `ADMIN_USERNAME` no `backend/.env`. Gere um hash Argon2 para `ADMIN_PASSWORD_HASH` e uma chave aleatória para `AUTH_SECRET_KEY`. No PowerShell, dentro de `backend/`:

```powershell
.\.venv\Scripts\python.exe -c "from getpass import getpass; from pwdlib import PasswordHash; print(PasswordHash.recommended().hash(getpass('Senha do administrador: ')))"
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
```

No macOS/Linux, substitua o executável por `.venv/bin/python`. Copie os dois resultados para as respectivas variáveis no `.env`. Não versione esse arquivo nem coloque senha ou chave reais no código. O servidor recusa iniciar se as credenciais estiverem ausentes ou inválidas.

Faça login em `POST /api/v1/auth/login` com JSON `{"username":"<seu usuário>","password":"<sua senha>"}`. A resposta traz `access_token`, `token_type: "bearer"` e `expires_in: 1800` (30 minutos). Envie `Authorization: Bearer <access_token>` ao cadastrar, editar ou excluir filmes. Em `/docs`, use a rota de login e depois o botão **Authorize**. Para sair, descarte o token; para revogar todos os tokens emitidos, troque `AUTH_SECRET_KEY` e reinicie a API. O frontend guarda o token apenas em memória.

O desenvolvimento local usa `localhost`. Antes de expor o login na internet, sirva a API por HTTPS e limite tentativas repetidas na borda; credenciais não devem trafegar em HTTP público.

A carga importa os dez CSVs em uma transação, exige o esquema criado pelo Alembic e recusa a repetição em um catálogo já preenchido. O banco local padrão é `backend/rocketlab.db`, configurável por `DATABASE_URL` em `.env`. Para começar com outro banco, aponte `DATABASE_URL` para um novo arquivo SQLite e execute a migração e a carga nesse arquivo. A carga reconcilia `dim_reviews` com as avaliações individuais.

### Ordem de execução

1. Configure e inicie o backend, aplicando a migração e importando os CSVs.
2. Em outro terminal, entre em `frontend/`, instale as dependências com `npm ci` e inicie o frontend com `npm run dev`.

## API

Todas as rotas abaixo usam o prefixo `/api/v1`. `page` começa em 1; `page_size` começa em 20 e aceita até 100. As listagens retornam `items`, `page`, `page_size`, `total` e `total_pages`.

| Método | Rota | Uso |
| --- | --- | --- |
| POST | `/auth/login` | Autentica o administrador e emite um token de 30 minutos |
| GET | `/movies` | Catálogo paginado; filtros opcionais `q` (título), `ano` e `genero`; `poster_first=true` prioriza filmes com pôster |
| GET | `/movies/filters` | Gêneros e anos disponíveis para os filtros do frontend |
| GET | `/movies/featured` | Destaque global: maior média entre filmes com imagem e pelo menos 3 avaliações; desempate pela quantidade; sem elegíveis, sugere um filme com imagem |
| GET | `/movies/{sk_movie_id}` | Detalhes completos, pessoas, produtoras, métricas e média |
| POST | `/movies` | Cadastra um filme |
| PATCH | `/movies/{sk_movie_id}` | Atualiza somente os campos enviados |
| DELETE | `/movies/{sk_movie_id}` | Remove o filme e suas avaliações/vínculos |
| GET | `/movies/{sk_movie_id}/reviews` | Histórico paginado de avaliações |
| POST | `/movies/{sk_movie_id}/reviews` | Registra uma avaliação e atualiza a média |

Somente `POST /movies`, `PATCH /movies/{sk_movie_id}` e `DELETE /movies/{sk_movie_id}` exigem o token do administrador. **Qualquer pessoa pode registrar uma avaliação sem login.** Token ausente, inválido ou expirado nas rotas administrativas recebe `401`.

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
  "nota": 9,
  "comentario": "Gostei."
}
```

Avaliações novas e históricas usam a escala de 0 a 10, inclusive valores decimais. A API recebe e devolve `nota` e `media_avaliacoes` nessa mesma escala, sem conversão. Filmes sem avaliações mostram quantidade 0 e média `null`.

### Cache de consultas

As leituras de filmes, filtros, destaque e avaliações (`GET /movies`, `GET /movies/filters`, `GET /movies/featured`, `GET /movies/{id}` e `GET /movies/{id}/reviews`) usam um cache local de até 256 respostas por processo. Cada entrada expira em 30 segundos por padrão; `CACHE_TTL_SECONDS=0` desliga o cache. Cadastro, edição, exclusão e nova avaliação limpam o cache após o commit, de modo que as leituras seguintes no mesmo processo reflitam a escrita.

O comando de importação dos CSVs deve rodar antes de iniciar a API. A execução documentada usa um processo Uvicorn. Se houver vários processos, cada um terá seu próprio cache e poderá exibir dados anteriores por até 30 segundos após uma escrita feita por outro processo.

### Apresentação dos títulos

Alguns títulos importados podem conter aspas externas ou aspas duplicadas no formato original. O frontend remove apenas essas camadas de apresentação: `"""blessed"""` aparece como `blessed`, e `"biography: ""stone Cold"" Steve Austin"` aparece como `biography: "stone Cold" Steve Austin`. Essa normalização é somente visual; o valor original do título no banco e na API não é alterado.

## Verificações

Dentro de `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check app tests
```

No macOS/Linux, use `.venv/bin/python` no lugar de `.\.venv\Scripts\python.exe`. Os testes HTTP usam um banco temporário migrado pelo Alembic e não alteram o banco local.

Para verificar o frontend, execute `npm test`, `npm run lint` e `npm run build` dentro de `frontend/`.
