import { request } from "./client";
import type { LoginResponse } from "./types";

export const login = (username: string, password: string) =>
  request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
