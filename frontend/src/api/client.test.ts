// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { ApiError, request } from "./client";

afterEach(() => vi.unstubAllGlobals());

test("mostra campo e mensagem de erro de validação 422", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            detail: [
              {
                type: "string_too_long",
                loc: ["body", "titulo"],
                msg: "Título muito longo",
              },
            ],
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );

  await expect(
    request("/movies", { method: "POST", body: "{}" }),
  ).rejects.toEqual(new ApiError(422, "titulo: Título muito longo"));
});
