export interface MovieListItem {
  sk_movie_id: string;
  titulo: string;
  ano_lancamento: number | null;
  url_poster: string | null;
  generos: string[];
  quantidade_avaliacoes: number;
  media_avaliacoes: number | null;
}

export interface MoviePage {
  items: MovieListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface MovieFilterOptions {
  generos: string[];
  anos: number[];
}

export interface MoviePerformance {
  orcamento_usd: number | null;
  receita_usd: number | null;
  lucro_usd: number;
  orcamento_brl: number | null;
  receita_brl: number | null;
  lucro_brl: number;
  popularidade: number | null;
  nota_tmdb: number | null;
  qtd_tmdb: number | null;
  nota_imdb: number | null;
  qtd_imdb: number | null;
}

export interface MovieDetail extends MovieListItem {
  id_filme: string;
  data_lancamento: string | null;
  duracao_minutos: number | null;
  status_filme: string | null;
  sinopse: string | null;
  url_backdrop: string | null;
  produtoras: string[];
  atores: string[];
  diretores: string[];
  roteiristas: string[];
  desempenho: MoviePerformance | null;
}

export interface ReviewItem {
  sk_movie_review_id: string;
  nome: string;
  nota: number;
  comentario: string;
  created_at: string;
}

export interface ReviewPage {
  items: ReviewItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ReviewCreated extends ReviewItem {
  quantidade_avaliacoes: number;
  media_avaliacoes: number;
}

export interface MovieCreate {
  titulo: string;
  ano_lancamento: number | null;
  sinopse: string | null;
  generos: string[];
  diretores: string[];
}

export type MoviePatch = Partial<MovieCreate>;
export interface ReviewCreate {
  nome: string;
  nota: number;
  comentario: string;
}
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
