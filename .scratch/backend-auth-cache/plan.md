# Autenticação e cache do backend — plano de implementação

> **Para execução:** usar `superpowers:executing-plans` para seguir as etapas, o fluxo `tdd` do repositório em cada comportamento e a skill `code-review` ao final. Este plano será executado na `main` depois da revisão do usuário.

**Objetivo:** proteger as três operações de manutenção do catálogo e acelerar as três consultas públicas de filmes, mantendo a criação de avaliações aberta a qualquer pessoa.

**Arquitetura:** um administrador configurado no ambiente faz login e recebe um Bearer JWT de 30 minutos. As respostas de leitura de filmes usam um cache local limitado, com TTL e invalidação após commits. Nenhuma tabela nova ou serviço externo é necessário.

**Stack:** Python 3.11+, FastAPI, SQLAlchemy/SQLite, Pydantic Settings, `pwdlib[argon2]`, `PyJWT`, biblioteca padrão (`OrderedDict`, `time.monotonic`), pytest.

**Especificação:** [spec.md](spec.md). **Enunciado:** `Atividade de Dev.pdf`, extras “autenticação” e “caching”. **Contexto atual:** `CONTEXT.md` e `.scratch/backend/plan.md`.

## Decisões para revisar

| Tema | Proposta |
| --- | --- |
| Quem entra | Um administrador, definido no `.env`; sem cadastro de usuários. |
| Como entra | `POST /api/v1/auth/login` com usuário/senha em JSON; Bearer JWT de 30 minutos. |
| O que é protegido | Cadastro, edição e exclusão de filme. Leituras e criação de avaliação permanecem públicas. |
| Onde fica a senha | Somente hash Argon2 no ambiente; segredo JWT separado. |
| O que cachear | Catálogo, detalhe e histórico paginado; 256 entradas, TTL de 30 s. |
| Consistência | Limpeza após commit e proteção contra leitura antiga repovoar o cache. |
| Implantação prevista | Um processo Uvicorn; vários processos exigirão cache compartilhado se a atualização tiver de ser imediata. |

## Arquivos previstos

| Arquivo | Mudança |
| --- | --- |
| `backend/app/core/config.py` | Campos de autenticação e `CACHE_TTL_SECONDS`; validação de configuração. |
| `backend/app/auth/router.py`, `backend/app/auth/security.py` | Login, emissão/verificação do token e dependência `require_admin`. |
| `backend/app/api/v1/router.py`, `backend/app/movies/router.py` | Registrar login, proteger escritas e consultar/invalidar cache. |
| `backend/app/movies/cache.py` | Cache de respostas em memória com TTL, LRU e geração de invalidação. |
| `backend/app/main.py` | Validar segredos na inicialização; criar estado de cache por aplicação se necessário. |
| `backend/tests/conftest.py`, `backend/tests/test_auth.py`, `backend/tests/test_cache.py` | Credenciais de teste, clientes HTTP e casos de segurança/cache. |
| `backend/tests/test_movies_api.py`, `backend/tests/test_reviews_api.py` | Enviar Bearer nos testes de escrita já existentes. |
| `backend/pyproject.toml`, `backend/.env.example`, `README.md`, `CONTEXT.md` | Dependências, configuração, uso e glossário atualizado após a implementação. |

## Sequência

### 1. Login do administrador

- [ ] Criar `test_auth.py` com casos: login válido retorna Bearer/`expires_in=1800`; usuário ou senha incorretos recebem o mesmo `401`; configuração incompleta impede inicialização; o hash e o segredo não aparecem na resposta. Usar variáveis de teste isoladas na fixture e limpar `get_settings.cache_clear()`.
- [ ] Executar `cd backend; .\.venv\Scripts\python.exe -m pytest tests/test_auth.py -q` e registrar a falha esperada.
- [ ] Adicionar `pwdlib[argon2]` e `PyJWT` em `pyproject.toml`; configurar `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET_KEY` e `CACHE_TTL_SECONDS` em `Settings`. Rejeitar segredo vazio/curto (menos de 32 bytes) e hash ilegível. Validar na inicialização; nunca criar credencial padrão funcional.
- [ ] Implementar `/api/v1/auth/login`: verificar o hash Argon2, emitir JWT HS256 com `sub`, `iat`, `exp`, `iss=rocketlab-api`, `aud=rocketlab-admin`; capturar falhas de autenticação com resposta genérica. Implementar `require_admin` com `HTTPBearer` e `jwt.decode(..., algorithms=["HS256"], issuer=..., audience=...)`, traduzindo token inválido/expirado em `401` com `WWW-Authenticate: Bearer`.
- [ ] Rodar o teste isolado até passar e registrar o commit `feat: add single-admin login`.

**Aceite:** não há senha em claro persistida, token sem assinatura válida não autentica, e a API recusa iniciar sem configuração completa.

### 2. Proteger as escritas sem alterar as leituras

- [ ] Escrever testes HTTP que chamem os três métodos de manutenção do catálogo sem token, com token malformado, expirado, com assinatura adulterada, emissor ou audiência incorretos, e com token válido; verificar `401` e banco intacto nos casos recusados. Conferir que `POST /movies/{id}/reviews`, os três `GET`, `/health` e `/openapi.json` continuam públicos e que OpenAPI marca somente as três operações administrativas como protegidas.
- [ ] Executar os testes de segurança para obter falha antes de alterar as rotas.
- [ ] Aplicar `Depends(require_admin)` apenas a `POST /movies`, `PATCH /movies/{id}` e `DELETE /movies/{id}`. Atualizar os testes antigos dessas três rotas com fixture que faz login e fornece o cabeçalho `Authorization: Bearer <token>`, sem contornar a dependência em produção. Manter a criação de avaliação anônima.
- [ ] Rodar `pytest tests/test_auth.py tests/test_movies_api.py tests/test_reviews_api.py -q`; corrigir apenas mudanças de contrato causadas pela proteção; registrar o commit `feat: protect movie writes`.

**Aceite:** leitores e avaliadores anônimos usam a API como antes; as três mutações administrativas exigem autorização válida antes de acessar o banco.

### 3. Cache de consultas públicas

- [ ] Criar `test_cache.py` com casos: mesmo GET evita segunda consulta ao banco; chaves diferentes para página/filtros/ID; TTL expirado força nova consulta com relógio controlado; a 257ª chave descarta a menos usada; cada uma das quatro escritas (inclusive avaliação anônima) invalida catálogo/detalhe/histórico depois do commit; erro com rollback não invalida; `CACHE_TTL_SECONDS=0` impede cache. Incluir leitura iniciada antes da invalidação que termine depois, para provar que ela não repovoa o cache. Limpar o cache entre testes.
- [ ] Rodar `pytest tests/test_cache.py -q` e registrar a falha esperada.
- [ ] Implementar `MovieCache` simples em `movies/cache.py`: `OrderedDict` com no máximo 256 entradas, prazo calculado por `time.monotonic()`, métodos `get(key)`, `put_if_current(key, value, generation)` e `invalidate()`; `invalidate` aumenta `generation` e limpa o dicionário. `put_if_current` só grava quando a geração observada antes da consulta ainda é a atual. `CACHE_TTL_SECONDS=0` desliga leituras/escritas no cache. Guardar modelos de resposta, nunca ORM ou `AsyncSession`.
- [ ] Integrar o cache nos três GETs, com chave de valores de parâmetros **após** a validação do FastAPI. Fazer `invalidate()` somente depois de `await db.commit()` nos quatro métodos de escrita, e antes de montar a resposta de `POST`/`PATCH`. Não cachear `404`, `422` ou login.
- [ ] Rodar `pytest tests/test_cache.py tests/test_movies_api.py tests/test_reviews_api.py -q` e registrar o commit `feat: cache public movie reads`.

**Aceite:** o cache reduz consultas repetidas e nunca devolve dado anterior a uma escrita concluída no mesmo processo. Em vários processos, a divergência fica limitada ao TTL de 30 segundos conforme a especificação.

### 4. Documentação e conferência final

- [ ] Atualizar `.env.example` com nomes sem valores secretos; no README, ensinar a gerar hash Argon2 e chave aleatória, preencher `.env`, fazer login, usar Bearer em `/docs` e via HTTP, explicar expiração, descarte do token, HTTPS fora de localhost, cache e sua limitação entre processos. Atualizar `CONTEXT.md`: “Administrador” passa a ser a identidade autenticada que mantém o catálogo; “Avaliação” continua identificada por nome exibido, sem conta própria.
- [ ] Testar OpenAPI: login com corpo/resposta documentados; `401` nas três operações administrativas; esquema Bearer apenas nessas operações. Garantir que o README não sugira inserir senha ou chave reais no Git.
- [ ] Executar de `backend/`: `.\.venv\Scripts\python.exe -m pytest -q` e `.\.venv\Scripts\python.exe -m ruff check app tests`; iniciar a API com `.env` de teste e fazer um fluxo real: login, leitura, cadastro, nova avaliação, leitura atualizada e exclusão. Testar também falha de inicialização sem segredos.
- [ ] Rodar `code-review` contra o commit anterior a este plano, nas dimensões padrões do repositório e requisitos do PDF; corrigir achados concretos. Conferir `git diff --check`, registrar o commit de documentação e publicar em `origin/main` após a revisão final.

**Aceite:** outra pessoa reproduz autenticação e cache seguindo o README, e a suíte existente continua verde.

## Limites assumidos

- Não criar tabela de usuários, papéis, cadastro público, recuperação de senha ou refresh token para um único administrador.
- Não instalar Redis nem outra infraestrutura de cache. Se o projeto passar a usar vários processos com exigência de leitura imediatamente atualizada, essa será uma mudança de arquitetura própria.
- Rate limiting e TLS devem ser fornecidos na borda antes de expor o login à internet; a entrega da atividade continua local.

## Pontos de revisão antes da execução

1. Confirmado pelo usuário: um administrador mantém o catálogo e qualquer visitante pode avaliar sem login.
2. Confirmado pelo usuário: avaliações são públicas; somente cadastro, edição e exclusão de filmes exigem administrador.
3. O limite de cache de **30 segundos / 256 entradas** e a execução em **um processo** servem para esta entrega?
