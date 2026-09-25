import { request } from "./client";
import type {
  MovieCreate,
  MovieDetail,
  MovieFilterOptions,
  MoviePage,
  MoviePatch,
} from "./types";

export interface MovieFilters {
  page: number;
  page_size: number;
  q?: string;
  ano?: number;
  genero?: string;
  poster_first?: boolean;
}

export const getFilterOptions = (signal?: AbortSignal) =>
  request<MovieFilterOptions>("/movies/filters", { signal });

export const getFeaturedMovie = (signal?: AbortSignal) =>
  request<MovieDetail | null>("/movies/featured", { signal });

export function listMovies(filters: MovieFilters, signal?: AbortSignal) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return request<MoviePage>(`/movies?${query}`, { signal });
}

export const getMovie = (id: string, signal?: AbortSignal) =>
  request<MovieDetail>(`/movies/${encodeURIComponent(id)}`, { signal });

export const createMovie = (payload: MovieCreate, token: string) =>
  request<MovieDetail>(
    "/movies",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );

export const patchMovie = (id: string, payload: MoviePatch, token: string) =>
  request<MovieDetail>(
    `/movies/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );

export const deleteMovie = (id: string, token: string) =>
  request<void>(
    `/movies/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    token,
  );
