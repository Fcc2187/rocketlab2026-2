# CineRate frontend

SPA em React, TypeScript e Tailwind. O catálogo, as avaliações e a administração usam a API FastAPI; `CineRate-catalogo-final.html` é apenas a referência visual e de comportamento.

```bash
npm ci
npm run dev
```

Copie `.env.example` para `.env` se precisar alterar `VITE_API_URL`. O valor padrão é `http://localhost:8000/api/v1`. Inicie o backend e carregue os CSVs conforme o README da raiz antes de abrir o frontend.

Visitantes podem consultar filmes e publicar avaliações sem login. O botão **Entrar** abre o login administrativo; após autenticar, aparecem as ações de cadastrar, editar e excluir. O token fica somente em memória e é descartado ao sair ou atualizar a página.

O destaque é global e não muda com os filtros: mostra a maior média entre filmes com imagem e pelo menos 3 avaliações, com desempate pela quantidade de avaliações. Enquanto nenhum filme atender a esses critérios, a API sugere um filme do catálogo com imagem.

Gêneros e diretores são comparados ignorando diferenças de caixa e usando `unicode_casefold`, inclusive para caracteres acentuados. No frontend, títulos importados com aspas externas são limpos apenas na apresentação: o banco continua preservando o valor original.

```bash
npm test
npm run lint
npm run build
```
