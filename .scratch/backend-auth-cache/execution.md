# Execução: autenticação e cache

- Base anterior à implementação: `8cdd51f84d5327664d866f86802ccb2cd0e7c8c2`.
- Seam de TDD aprovado pelo plano: API HTTP de autenticação, filmes e avaliações; comportamento de expiração/limite do cache verificado também pela interface `MovieCache`.
- Ruling: a aprovação do usuário alterou o plano antes do código — avaliações são públicas; somente cadastro, edição e exclusão de filmes exigem administrador. Custo se interpretado errado: mudar a proteção de uma rota e seus testes.
- Ruling: JSON com Unicode inválido falhava na serialização do erro padrão do FastAPI; o aplicativo devolve `422` genérico somente nesse caso. Custo se interpretado errado: esses pedidos perdem o detalhe de validação específico.
- Ciclos vermelho→verde registrados: login `404→200`, cadastro anônimo `201→401`, hash malformado permitia iniciar `→` inicialização recusada, leitura repetida via cache devolvia dado atualizado antes da invalidação `→` mantém a resposta anterior, Unicode inválido causava exceção `→422`.
- Verificação antes da revisão: 32 testes passaram; `ruff check app tests` sem erros.
