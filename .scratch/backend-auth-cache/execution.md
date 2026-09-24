# Execução: autenticação e cache

- Base anterior à implementação: `8cdd51f84d5327664d866f86802ccb2cd0e7c8c2`.
- Seam de TDD aprovado pelo plano: API HTTP de autenticação, filmes e avaliações; comportamento de expiração/limite do cache verificado também pela interface `MovieCache`.
- Ruling: a aprovação do usuário alterou o plano antes do código — avaliações são públicas; somente cadastro, edição e exclusão de filmes exigem administrador. Custo se interpretado errado: mudar a proteção de uma rota e seus testes.
- Ruling: JSON com Unicode inválido falhava na serialização do erro padrão do FastAPI; o aplicativo devolve `422` genérico somente nesse caso. Custo se interpretado errado: esses pedidos perdem o detalhe de validação específico.
- Ciclos vermelho→verde registrados: login `404→200`, cadastro anônimo `201→401`, hash malformado permitia iniciar `→` inicialização recusada, leitura repetida via cache devolvia dado atualizado antes da invalidação `→` mantém a resposta anterior, Unicode inválido causava exceção `→422`.
- Verificação antes da revisão: 32 testes passaram; `ruff check app tests` sem erros.
- Ruling: as etapas foram registradas em um commit funcional conjunto (`5047bc3`) em vez de commits por etapa; os ciclos de teste foram executados em sequência e o custo é uma história Git menos granular.
- Revisão em dois eixos contra `8cdd51f`: Standards sem violação documentada; Spec sem lacuna concreta. Minor (deferred): cerimônia de cache repetida nos três GETs e `invalidate()` repetido nos quatro métodos de escrita; extrair uma abstração agora aumentaria a complexidade para poucos pontos de uso.
- Smoke com Uvicorn e SQLite temporário migrado: login, cadastro autenticado, avaliação anônima, média atualizada, exclusão e catálogo vazio após exclusão (`SMOKE_OK`).
