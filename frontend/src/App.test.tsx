// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import App from "./App";
import { MovieCard } from "./components/MovieCard";
import { Poster } from "./components/ui";
import type { MovieDetail, ReviewItem } from "./api/types";

const movie: MovieDetail = {
  sk_movie_id: "movie-1",
  id_filme: "1",
  titulo: "Filme um",
  ano_lancamento: 2024,
  data_lancamento: null,
  duracao_minutos: 100,
  status_filme: "Lançado",
  sinopse: "Uma história.",
  url_poster: null,
  url_backdrop: null,
  generos: ["Épico"],
  diretores: ["Ana"],
  atores: [],
  roteiristas: [],
  produtoras: [],
  desempenho: null,
  quantidade_avaliacoes: 0,
  media_avaliacoes: null,
};

function mockApi() {
  let films = [structuredClone(movie)];
  let reviews: ReviewItem[] = [];
  let validLogin = true;
  let catalogFails = false;
  const calls: {
    url: string;
    method: string;
    body?: unknown;
    auth?: string | null;
  }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input);
      const method = init.method || "GET";
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        url: url.toString(),
        method,
        body,
        auth: new Headers(init.headers).get("Authorization"),
      });
      const json = (value: unknown, status = 200) =>
        new Response(JSON.stringify(value), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (url.pathname.endsWith("/auth/login"))
        return validLogin
          ? json({
              access_token: "test-token",
              token_type: "bearer",
              expires_in: 1800,
            })
          : json({ detail: "Credenciais inválidas" }, 401);
      if (url.pathname.endsWith("/movies/filters"))
        return json({
          generos: [...new Set(films.flatMap((f) => f.generos))].sort(),
          anos: [
            ...new Set(films.map((f) => f.ano_lancamento).filter(Boolean)),
          ].sort((a, b) => Number(b) - Number(a)),
        });
      if (url.pathname.endsWith("/movies/featured")) {
        const eligible = films.filter(
          (f) =>
            f.quantidade_avaliacoes >= 3 &&
            f.media_avaliacoes !== null &&
            (f.url_backdrop?.trim() || f.url_poster?.trim()),
        );
        eligible.sort(
          (a, b) =>
            b.media_avaliacoes! - a.media_avaliacoes! ||
            b.quantidade_avaliacoes - a.quantidade_avaliacoes,
        );
        return json(
          eligible[0] ||
            films.find((f) => f.url_backdrop?.trim()) ||
            films.find((f) => f.url_poster?.trim()) ||
            null,
        );
      }
      if (url.pathname.endsWith("/movies") && method === "GET") {
        if (catalogFails) return json({ detail: "Catálogo indisponível" }, 503);
        const q = url.searchParams.get("q")?.toLocaleLowerCase("pt-BR") || "";
        const genre =
          url.searchParams.get("genero")?.toLocaleLowerCase("pt-BR") || "";
        const year = url.searchParams.get("ano") || "";
        const filtered = films.filter(
          (f) =>
            f.titulo.toLocaleLowerCase("pt-BR").includes(q) &&
            (!genre ||
              f.generos.some((g) => g.toLocaleLowerCase("pt-BR") === genre)) &&
            (!year || String(f.ano_lancamento) === year),
        );
        if (url.searchParams.get("poster_first") === "true")
          filtered.sort(
            (a, b) =>
              Number(Boolean(b.url_poster)) - Number(Boolean(a.url_poster)),
          );
        const page = Number(url.searchParams.get("page") || 1);
        const size = Number(url.searchParams.get("page_size") || 20);
        return json({
          items: filtered.slice((page - 1) * size, page * size),
          page,
          page_size: size,
          total: filtered.length,
          total_pages: Math.ceil(filtered.length / size),
        });
      }
      if (url.pathname.endsWith("/movies") && method === "POST") {
        const created = { ...movie, ...body, sk_movie_id: "movie-2" };
        films.push(created);
        return json(created, 201);
      }
      const id = url.pathname.match(/\/movies\/([^/]+)/)?.[1];
      if (id && url.pathname.endsWith("/reviews") && method === "GET") {
        const page = Number(url.searchParams.get("page") || 1);
        return json({
          items: reviews.slice((page - 1) * 4, page * 4),
          page,
          page_size: 4,
          total: reviews.length,
          total_pages: Math.ceil(reviews.length / 4),
        });
      }
      if (id && url.pathname.endsWith("/reviews") && method === "POST") {
        const created = {
          ...body,
          sk_movie_review_id: "review-1",
          created_at: "2024-01-01T12:00:00",
        };
        reviews = [...reviews, created];
        films = films.map((f) =>
          f.sk_movie_id === id
            ? {
                ...f,
                quantidade_avaliacoes: reviews.length,
                media_avaliacoes: body.nota,
              }
            : f,
        );
        return json(
          {
            ...created,
            quantidade_avaliacoes: reviews.length,
            media_avaliacoes: body.nota,
          },
          201,
        );
      }
      if (id && method === "GET")
        return json(films.find((f) => f.sk_movie_id === id));
      if (id && method === "PATCH") {
        films = films.map((f) =>
          f.sk_movie_id === id ? { ...f, ...body } : f,
        );
        return json(films.find((f) => f.sk_movie_id === id));
      }
      if (id && method === "DELETE") {
        films = films.filter((f) => f.sk_movie_id !== id);
        return new Response(null, { status: 204 });
      }
      return json({ detail: "Não encontrado" }, 404);
    }),
  );
  return {
    calls,
    rejectLogin: () => {
      validLogin = false;
    },
    allowLogin: () => {
      validLogin = true;
    },
    addMovies: (count: number) => {
      films = Array.from({ length: count }, (_, i) => ({
        ...movie,
        sk_movie_id: `movie-${i + 1}`,
        titulo: `Filme ${String(i + 1).padStart(2, "0")}`,
      }));
    },
    setFilms: (items: MovieDetail[]) => {
      films = items;
    },
    addReviews: (count: number) => {
      reviews = Array.from({ length: count }, (_, i) => ({
        sk_movie_review_id: `review-${i + 1}`,
        nome: `Pessoa ${i + 1}`,
        nota: 8,
        comentario: `Comentário ${i + 1}`,
        created_at: "2024-01-01T12:00:00",
      }));
    },
    failCatalog: () => {
      catalogFails = true;
    },
    recoverCatalog: () => {
      catalogFails = false;
    },
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("HTMLDialogElement", HTMLDialogElement);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

test("visitante vê catálogo e estado sem avaliações, sem controles administrativos", async () => {
  mockApi();
  render(<App />);
  expect((await screen.findAllByText("Filme um")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Sem avaliações").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Adicionar filme/ })).toBeNull();
  expect(
    screen.getAllByRole("button", { name: "Avaliar" }).length,
  ).toBeGreaterThan(0);
});

test("busca e filtros usam os parâmetros do backend", async () => {
  const api = mockApi();
  render(<App />);
  await screen.findAllByText("Filme um");
  fireEvent.change(screen.getByPlaceholderText("Buscar por título"), {
    target: { value: "Filme" },
  });
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Filtrar por gênero" }),
    { target: { value: "Épico" } },
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por ano" }), {
    target: { value: "2024" },
  });
  await waitFor(
    () =>
      expect(
        api.calls.some(
          (call) =>
            call.url.includes("q=Filme") &&
            call.url.includes("genero=%C3%89pico") &&
            call.url.includes("ano=2024"),
        ),
      ).toBe(true),
    { timeout: 2000 },
  );
});

test("catálogo mostra primeiro os filmes com pôster e limpa aspas externas do título", async () => {
  const api = mockApi();
  api.setFilms([
    { ...movie, sk_movie_id: "sem-poster", titulo: "A sem pôster" },
    {
      ...movie,
      sk_movie_id: "com-poster",
      titulo: '"""blessed"""',
      url_poster: "https://example.com/poster.jpg",
    },
    {
      ...movie,
      sk_movie_id: "aspas-internas",
      titulo: '"biography: ""stone Cold"" Steve Austin"',
      url_poster: "https://example.com/outro.jpg",
    },
  ]);
  render(<App />);
  const cards = await screen.findAllByRole("article");
  expect(
    within(cards[0]).getByRole("button", { name: "Ver detalhes de blessed" }),
  ).toBeTruthy();
  expect(
    within(cards[1]).getByRole("button", {
      name: 'Ver detalhes de biography: "stone Cold" Steve Austin',
    }),
  ).toBeTruthy();
  expect(within(cards[0]).queryByText(/"blessed"/)).toBeNull();
  expect(api.calls.some((call) => call.url.includes("poster_first=true"))).toBe(
    true,
  );
});

test("menu administrativo fecha antes de executar uma ação", async () => {
  const onDetails = vi.fn();
  const menuMovie = { ...movie, titulo: "Filme do menu" };
  render(
    <MovieCard
      movie={menuMovie}
      admin
      onDetails={onDetails}
      onReview={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  const menu = screen.getByLabelText("Opções para Filme do menu")
    .parentElement as HTMLDetailsElement;
  fireEvent.click(screen.getByLabelText("Opções para Filme do menu"));
  expect(menu.open).toBe(true);
  fireEvent.click(within(menu).getByRole("button", { name: "Ver detalhes" }));
  expect(menu.open).toBe(false);
  expect(onDetails).toHaveBeenCalledOnce();
});

test("destaque global continua igual quando a busca muda", async () => {
  const api = mockApi();
  api.setFilms([
    {
      ...movie,
      sk_movie_id: "destaque",
      titulo: "Melhor avaliado",
      quantidade_avaliacoes: 3,
      media_avaliacoes: 9.5,
      url_poster: "https://example.com/poster.jpg",
    },
    {
      ...movie,
      sk_movie_id: "busca",
      titulo: "Filme buscado",
      quantidade_avaliacoes: 4,
      media_avaliacoes: 10,
    },
  ]);
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Melhor avaliado", level: 1 }),
  ).toBeTruthy();
  expect(document.querySelector("#inicio img")?.getAttribute("src")).toBe(
    "https://example.com/poster.jpg",
  );
  fireEvent.change(screen.getByPlaceholderText("Buscar por título"), {
    target: { value: "Filme buscado" },
  });
  await screen.findByRole("button", { name: "Ver detalhes de Filme buscado" });
  expect(
    screen.getByRole("heading", { name: "Melhor avaliado", level: 1 }),
  ).toBeTruthy();
  expect(
    api.calls.filter((call) => call.url.endsWith("/movies/featured")).length,
  ).toBe(1);
});

test("hero mantém skeleton acessível até chegar o destaque", async () => {
  mockApi();
  const fallbackFetch = globalThis.fetch;
  let resolveFeatured!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      new URL(input).pathname.endsWith("/movies/featured")
        ? new Promise<Response>((resolve) => {
            resolveFeatured = resolve;
          })
        : fallbackFetch(input, init),
    ),
  );
  render(<App />);

  expect(
    screen
      .getByLabelText("Carregando filme em destaque")
      .getAttribute("aria-busy"),
  ).toBe("true");
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  await screen.findAllByRole("article");
  resolveFeatured(
    new Response(JSON.stringify(movie), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "Filme um", level: 1 }),
  ).toBeTruthy();
});

test("hero vazio e erro são distintos e não bloqueiam o catálogo", async () => {
  const api = mockApi();
  api.setFilms([{ ...movie, url_poster: null, url_backdrop: null }]);
  render(<App />);
  expect(
    await screen.findByRole("heading", {
      name: "Nenhum filme em destaque",
      level: 1,
    }),
  ).toBeTruthy();
  expect(await screen.findAllByRole("article")).toHaveLength(1);

  cleanup();
  mockApi();
  const fallbackFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      new URL(input).pathname.endsWith("/movies/featured")
        ? Promise.resolve(new Response("{}", { status: 503 }))
        : fallbackFetch(input, init),
    ),
  );
  render(<App />);
  expect(
    await screen.findByRole("heading", {
      name: "Destaque indisponível",
      level: 1,
    }),
  ).toBeTruthy();
  expect(await screen.findAllByRole("article")).toHaveLength(1);
});

test("hero mantém o destaque anterior durante refresh após avaliação", async () => {
  const api = mockApi();
  api.setFilms([{ ...movie, url_poster: "https://example.com/poster.jpg" }]);
  const fallbackFetch = globalThis.fetch;
  let featuredCalls = 0;
  let resolveRefresh!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) => {
      if (new URL(input).pathname.endsWith("/movies/featured")) {
        featuredCalls += 1;
        if (featuredCalls === 2)
          return new Promise<Response>((resolve) => {
            resolveRefresh = resolve;
          });
      }
      return fallbackFetch(input, init);
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Filme um", level: 1 }),
  ).toBeTruthy();
  await user.click(screen.getAllByRole("button", { name: "Avaliar" })[0]);
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Seu nome"), "Bia");
  await user.type(within(dialog).getByLabelText("Sua nota / 10"), "8");
  await user.type(within(dialog).getByLabelText("Comentário"), "Boa história");
  await user.click(
    within(dialog).getByRole("button", { name: "Publicar avaliação" }),
  );
  await waitFor(() => expect(featuredCalls).toBe(2));
  expect(
    screen.getByRole("heading", { name: "Filme um", level: 1 }),
  ).toBeTruthy();
  expect(document.querySelector("#inicio")?.getAttribute("aria-busy")).toBe(
    "true",
  );
  resolveRefresh(
    new Response(JSON.stringify({ ...movie, titulo: "Novo destaque" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "Novo destaque", level: 1 }),
  ).toBeTruthy();
});

test("fallback de pôster usa variante determinística pelo ID", () => {
  const renderPoster = (id: string) => (
    <Poster src={null} title="Sem pôster" variantKey={id} />
  );
  const { rerender, container } = render(renderPoster("movie-1"));
  const first = container.querySelector(".poster-fallback");
  const variant = first?.getAttribute("data-variant");
  rerender(renderPoster("movie-1"));
  expect(
    container.querySelector(".poster-fallback")?.getAttribute("data-variant"),
  ).toBe(variant);
  rerender(renderPoster("movie-2"));
  expect(
    container.querySelector(".poster-fallback")?.getAttribute("data-variant"),
  ).not.toBe(variant);
  expect(screen.getByText("Imagem indisponível")).toBeTruthy();
});

test("visitante publica avaliação sem login e vê a nova média", async () => {
  const api = mockApi();
  const user = userEvent.setup();
  render(<App />);
  await screen.findAllByText("Filme um");
  await user.click(screen.getAllByRole("button", { name: "Avaliar" })[0]);
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Seu nome"), "Bia");
  await user.type(within(dialog).getByLabelText("Sua nota / 10"), "8.5");
  await user.type(within(dialog).getByLabelText("Comentário"), "Gostei");
  await user.click(
    within(dialog).getByRole("button", { name: "Publicar avaliação" }),
  );
  await waitFor(() =>
    expect(
      api.calls.some(
        (call) =>
          call.method === "POST" &&
          call.url.endsWith("/movies/movie-1/reviews") &&
          (call.body as { nota: number }).nota === 8.5 &&
          !call.auth,
      ),
    ).toBe(true),
  );
  await screen.findByText("Avaliação publicada com sucesso.");
  await waitFor(() =>
    expect(screen.getAllByText(/8,5 \/ 10/).length).toBeGreaterThan(0),
  );
});

test("catálogo e avaliações têm paginação independente", async () => {
  const api = mockApi();
  api.addMovies(11);
  api.addReviews(5);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("button", { name: "Ver detalhes de Filme 01" });
  await user.click(screen.getByRole("button", { name: "Próxima página" }));
  await screen.findByRole("button", { name: "Ver detalhes de Filme 11" });
  await user.click(
    screen.getByRole("button", { name: "Ver detalhes de Filme 11" }),
  );
  const dialog = screen.getByRole("dialog");
  await within(dialog).findByText("Pessoa 1");
  await user.click(
    within(dialog).getByRole("button", { name: "Próxima página" }),
  );
  await within(dialog).findByText("Pessoa 5");
  expect(
    api.calls.some((call) =>
      call.url.includes("/movies/movie-11/reviews?page=2"),
    ),
  ).toBe(true);
  expect(api.calls.some((call) => call.url.includes("/movies?page=2"))).toBe(
    true,
  );
});

test("erro do catálogo permite tentar novamente", async () => {
  const api = mockApi();
  api.failCatalog();
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Não foi possível carregar o catálogo");
  api.recoverCatalog();
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByRole("button", { name: "Ver detalhes de Filme um" });
});

test("login revela administração e logout a oculta; credenciais inválidas mostram erro", async () => {
  const api = mockApi();
  const user = userEvent.setup();
  render(<App />);
  await screen.findAllByText("Filme um");
  api.rejectLogin();
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  let dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Usuário"), "admin");
  await user.type(within(dialog).getByLabelText("Senha"), "errada");
  await user.click(within(dialog).getByRole("button", { name: "Entrar" }));
  expect(await within(dialog).findByRole("alert")).toHaveProperty(
    "textContent",
    "Credenciais inválidas",
  );
  api.allowLogin();
  await user.click(within(dialog).getByRole("button", { name: "Entrar" }));
  await screen.findByRole("button", { name: "+ Adicionar filme" });
  expect(screen.getByLabelText("Opções para Filme um")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Sair · AD" }));
  expect(
    screen.queryByRole("button", { name: "+ Adicionar filme" }),
  ).toBeNull();
});

test("clique em Entrar mantém o modal aberto no StrictMode do aplicativo", async () => {
  mockApi();
  const user = userEvent.setup();
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  expect(
    screen.getByRole("dialog", { name: "Entrar como administrador" }),
  ).toBeTruthy();
});

test("administrador cria, edita e exclui filme pela API", async () => {
  const api = mockApi();
  const user = userEvent.setup();
  render(<App />);
  await screen.findAllByText("Filme um");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  let dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Usuário"), "admin");
  await user.type(within(dialog).getByLabelText("Senha"), "correta");
  await user.click(within(dialog).getByRole("button", { name: "Entrar" }));
  await user.click(
    await screen.findByRole("button", { name: "+ Adicionar filme" }),
  );
  dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Título"), "Filme novo");
  await user.click(
    within(dialog).getByRole("button", { name: "Adicionar filme" }),
  );
  await waitFor(() =>
    expect(
      api.calls.some(
        (call) =>
          call.method === "POST" &&
          call.url.endsWith("/movies") &&
          call.auth === "Bearer test-token",
      ),
    ).toBe(true),
  );
  dialog = await screen.findByRole("dialog", { name: "Filme novo" });
  await user.click(within(dialog).getByRole("button", { name: "Editar" }));
  dialog = screen.getByRole("dialog");
  const title = within(dialog).getByLabelText("Título");
  await user.clear(title);
  await user.type(title, "Filme editado");
  await user.click(
    within(dialog).getByRole("button", { name: "Salvar alterações" }),
  );
  dialog = await screen.findByRole("dialog", { name: "Filme editado" });
  expect(
    api.calls.some(
      (call) => call.method === "PATCH" && call.auth === "Bearer test-token",
    ),
  ).toBe(true);
  await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
  dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Excluir" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Ver detalhes de Filme editado" }),
    ).toBeNull(),
  );
  expect(
    api.calls.some(
      (call) => call.method === "DELETE" && call.auth === "Bearer test-token",
    ),
  ).toBe(true);
});

test("filme criado sem pôster abre os detalhes mesmo fora da primeira página", async () => {
  const api = mockApi();
  api.setFilms(
    Array.from({ length: 10 }, (_, i) => ({
      ...movie,
      sk_movie_id: `poster-${i}`,
      titulo: `Filme com pôster ${i}`,
      url_poster: "https://example.com/poster.jpg",
    })),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
  let dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Usuário"), "admin");
  await user.type(within(dialog).getByLabelText("Senha"), "correta");
  await user.click(within(dialog).getByRole("button", { name: "Entrar" }));
  await user.click(
    await screen.findByRole("button", { name: "+ Adicionar filme" }),
  );
  dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Título"), "Filme novo");
  await user.click(
    within(dialog).getByRole("button", { name: "Adicionar filme" }),
  );
  expect(
    await screen.findByRole("dialog", { name: "Filme novo" }),
  ).toBeTruthy();
});
