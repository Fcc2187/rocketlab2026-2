# Especificação proposta: autenticação e cache do backend

## Objetivo

Concluir os dois extras de backend do `Atividade de Dev.pdf`: autenticação para manutenção do catálogo e cache das consultas de filmes. O catálogo e as avaliações continuam acessíveis sem login; o frontend será feito depois.

## Autenticação

- Há **um administrador da aplicação**, configurado por `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` e `AUTH_SECRET_KEY` no ambiente. O nome escrito em uma avaliação continua sendo apenas o nome exibido; ele não vira uma conta.
- `POST /api/v1/auth/login` recebe JSON `{ "username": "admin", "password": "..." }` e devolve `{ "access_token": "...", "token_type": "bearer", "expires_in": 1800 }` ao validar a senha Argon2. Credenciais incorretas recebem `401` genérico, sem distinguir usuário de senha.
- O token é JWT assinado com HS256, válido por 30 minutos, com `sub`, `iat`, `exp`, `iss` e `aud`. A verificação fixa o algoritmo e valida assinatura, expiração, emissor, audiência e administrador. Token ausente, inválido ou expirado recebe `401` e `WWW-Authenticate: Bearer`.
- Exigem Bearer: `POST /movies`, `PATCH /movies/{id}` e `DELETE /movies/{id}`. Qualquer pessoa pode enviar `POST /movies/{id}/reviews` com nome, nota de 0 a 10 e comentário, sem login. Os `GET` de catálogo, detalhe e histórico, `/health` e OpenAPI continuam públicos. Não há cadastro público, recuperação de senha, refresh token nem persistência de sessões; para sair, o cliente descarta o token, e para revogar todos os tokens antes do prazo basta trocar `AUTH_SECRET_KEY`.
- O servidor falha ao iniciar se as três variáveis de autenticação estiverem ausentes ou inválidas. Senha e chave não entram no Git nem nos logs. O README ensina a gerar o hash e uma chave aleatória. O frontend futuro mantém o token em memória. Fora de `localhost`, a publicação exige HTTPS e proteção contra tentativas repetidas no proxy/serviço de borda.

## Cache

- Cache **em memória do processo**, apenas para `GET /api/v1/movies`, `GET /api/v1/movies/{id}` e `GET /api/v1/movies/{id}/reviews`. Chaves incluem todos os parâmetros relevantes já validados, inclusive página e filtros. Não se guardam credenciais, respostas de login, erros, nem sessões de banco.
- Entradas são os modelos de resposta já montados, limitadas a 256, com expiração de 30 segundos medida por relógio monotônico e descarte da entrada menos recentemente usada ao atingir o limite. Cache desligável por `CACHE_TTL_SECONDS=0` para diagnóstico; valor padrão 30.
- Após commit de cadastro, alteração, exclusão ou avaliação, todas as entradas de filmes são invalidadas antes de responder. Um resultado de leitura iniciado antes da invalidação não pode repovoar o cache depois dela. Falha ou rollback não invalida. O importador CSV continua sendo executado antes de subir a API, como no README.
- Um processo Uvicorn é o modo documentado. Em múltiplos processos cada cache é independente: uma escrita em outro processo pode aparecer até 30 segundos depois. Se a aplicação passar a exigir consistência imediata entre processos, substituir por cache compartilhado com invalidação distribuída.

## Contrato e critérios de aceite

1. Os três métodos de manutenção do catálogo sem credencial ou com token inválido não alteram o banco e retornam `401`; token válido preserva os códigos e corpos atuais. Qualquer visitante pode enviar avaliação válida sem credencial.
2. Login correto emite token utilizável; senha errada, token expirado, assinatura adulterada, emissor/audiência incorretos e segredo ausente são rejeitados.
3. Leituras repetidas com os mesmos parâmetros aproveitam a mesma entrada; parâmetros diferentes não se misturam; expiração e limite de tamanho funcionam.
4. Depois de cada escrita bem-sucedida, catálogo, detalhe e histórico mostram os dados novos; uma leitura concorrente antiga não reintroduz conteúdo obsoleto.
5. OpenAPI e README descrevem login, Bearer, ambiente, expiração, cache, invalidação e limite entre processos. Testes HTTP cobrem os fluxos essenciais.

## Base técnica consultada

- FastAPI, segurança HTTP Bearer: https://fastapi.tiangolo.com/reference/security/
- FastAPI, JWT e hash Argon2: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- OWASP, exigência de TLS para credenciais: https://cheatsheetseries.owasp.org/cheatsheets/Web_Service_Security_Cheat_Sheet.html
- Python, relógio monotônico: https://docs.python.org/3.11/library/time.html#time.monotonic
