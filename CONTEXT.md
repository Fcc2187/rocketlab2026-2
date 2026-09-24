# Catálogo e avaliações de filmes

Contexto único do sistema em que um administrador mantém o catálogo de filmes e registra avaliações.

## Linguagem

**Filme**:
Obra do catálogo, identificada independentemente do título. Pode ter gêneros, pessoas, produtoras, métricas e avaliações.

**Pessoa do catálogo**:
Pessoa associada a um filme como ator, diretor ou roteirista. O papel faz parte da identificação da pessoa no catálogo atual.

**Avaliação**:
Nota individual e resenha textual atribuídas a um nome de avaliador e a um filme. Qualquer visitante pode registrar uma avaliação; o nome não representa uma conta autenticada.

**Nota**:
Valor de uma avaliação na escala de 0 a 10, inclusive. Valores decimais são permitidos.

**Média de avaliações**:
Média aritmética das notas individuais de um filme. É ausente quando o filme não possui avaliações.

**Administrador**:
Identidade autenticada que cadastra, altera e remove filmes do catálogo. As avaliações não exigem essa identidade.
